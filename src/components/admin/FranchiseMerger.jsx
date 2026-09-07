import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitMerge, Undo2, AlertTriangle, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import FranchiseGroupCard from "@/components/admin/FranchiseGroupCard";
import {
  detectFranchiseGroups,
  getFranchiseRootViaJikan,
  buildSeasonsArray,
  checkWorkExistsInDb,
} from "@/lib/franchiseDetection";
import { invalidateStaleFranchiseCache } from "@/lib/catalogAutoSync";
import { isCategoryActive } from "@/lib/scopeConfig";

const BACKUP_KEY = "franchise_merge_backup";

/**
 * FranchiseMerger — Admin review screen for merging season duplicates.
 *
 * Lists detected franchise groups (41 groups in current catalog).
 * For each group: shows detected root (smallest mal_id) + absorbed seasons.
 * Admin can: confirm merge, correct root, remove a season, skip group.
 * Rollback restores the last merge's DynamicWork state.
 * AnimeEntry records are re-pointed to canonical title with season_mal_id preserved.
 */
export default function FranchiseMerger() {
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState([]);
  const [verifyingIdx, setVerifyingIdx] = useState(null);
  const [mergingIdx, setMergingIdx] = useState(null);
  const [hasBackup, setHasBackup] = useState(false);
  const [search, setSearch] = useState("");

  const { data: dynamicWorks = [], isLoading } = useQuery({
    queryKey: ["catalog-dynamic-works"],
    queryFn: () => base44.entities.DynamicWork.list("popularity_rank", 5000),
  });

  useEffect(() => {
    setHasBackup(!!localStorage.getItem(BACKUP_KEY));
  }, []);

  useEffect(() => {
    if (dynamicWorks.length === 0) return;

    // CORREÇÃO 3: Invalidar cache stale de CatalogSync antes de re-detectar
    invalidateStaleFranchiseCache(queryClient).then(() => {
      const animeWorks = dynamicWorks
        .filter((w) => {
          try {
            const cats = w.categories ? JSON.parse(w.categories) : [];
            return cats.includes("anime") && w.mal_id;
          } catch {
            return false;
          }
        })
        .map((w) => ({
          ...w,
          categories: w.categories ? JSON.parse(w.categories) : [],
        }));
      const detected = detectFranchiseGroups(animeWorks);

      // CORREÇÃO 2: A raiz detectada é sempre do próprio grupo (menor mal_id do grupo).
      // A sinalização de "raiz real não importada" só pode ser feita após verificar Jikan,
      // porque a detecção por título não sabe se existe uma temporada anterior fora do banco.
      // Grupos onde a raiz detectada NÃO é o menor ano podem indicar raiz faltante — mas
      // a verificação definitiva é via "Verificar Jikan".
      const groupsWithFlags = detected.map((g) => {
        // Heurística: se a raiz detectada tem "Season 2", "2nd", "III" etc. no título,
        // é provável que a 1ª temporada não esteja no banco.
        const rootTitle = (g.root.title || "").toLowerCase();
        const likelyMissingRoot =
          rootTitle.includes("season 2") ||
          rootTitle.includes("season 3") ||
          rootTitle.includes("season 4") ||
          rootTitle.includes("2nd") ||
          rootTitle.includes("3rd") ||
          rootTitle.includes("4th") ||
          rootTitle.includes(" ii") ||
          rootTitle.includes(" iii");
        return {
          ...g,
          status: "pending",
          removedSeasons: [],
          rootOverride: null,
          verificationResult: null,
          rootMissing: false,
          rootLikelyMissing: likelyMissingRoot,
          rootMissingMalId: null,
          rootMissingTitle: null,
        };
      });
      setGroups(groupsWithFlags);
    });
  }, [dynamicWorks, queryClient]);

  const pendingCount = groups.filter((g) => g.status === "pending").length;
  const mergedCount = groups.filter((g) => g.status === "merged").length;
  const skippedCount = groups.filter((g) => g.status === "skipped").length;

  const filteredGroups = search.trim()
    ? groups.filter((g) =>
        g.franchiseKey.includes(search.toLowerCase().trim()) ||
        g.allItems.some((w) =>
          w.title.toLowerCase().includes(search.toLowerCase().trim())
        )
      )
    : groups;

  const handleAction = useCallback(
    async (index, action, payload) => {
      const group = groups[index];
      if (!group) return;

      if (action === "setRoot") {
        const newRoot = group.allItems.find((w) => w.mal_id === payload);
        if (newRoot) {
          const newAbsorbed = group.allItems.filter((w) => w.mal_id !== payload);
          setGroups((prev) =>
            prev.map((g, i) =>
              i === index
                ? { ...g, root: newRoot, absorbed: newAbsorbed, rootOverride: newRoot }
                : g
            )
          );
          toast.success(`Raiz corrigida para: ${newRoot.title}`);
        } else {
          // External mal_id (root not in this group — e.g. Season 1 is in static catalog)
          setGroups((prev) =>
            prev.map((g, i) =>
              i === index ? { ...g, franchiseIdOverride: String(payload) } : g
            )
          );
          toast.success(`franchise_id definido como ${payload} (raiz externa)`);
        }
      } else if (action === "removeSeason") {
        setGroups((prev) =>
          prev.map((g, i) =>
            i === index
              ? { ...g, removedSeasons: [...(g.removedSeasons || []), payload] }
              : g
          )
        );
      } else if (action === "skip") {
        setGroups((prev) =>
          prev.map((g, i) => (i === index ? { ...g, status: "skipped" } : g))
        );
      } else if (action === "verifyJikan") {
        setVerifyingIdx(index);
        try {
          const result = await getFranchiseRootViaJikan(group.root.mal_id);
          setGroups((prev) =>
            prev.map((g, i) =>
              i === index ? { ...g, verificationResult: result } : g
            )
          );
          // Auto-correct root if Jikan found a different root
          if (result.franchise_id !== group.root.mal_id) {
            const newRoot = group.allItems.find(
              (w) => w.mal_id === result.franchise_id
            );
            if (newRoot) {
              // Raiz encontrada está no banco — corrigir automaticamente
              const newAbsorbed = group.allItems.filter(
                (w) => w.mal_id !== result.franchise_id
              );
              setGroups((prev) =>
                prev.map((g, i) =>
                  i === index
                    ? { ...g, root: newRoot, absorbed: newAbsorbed, rootOverride: newRoot, rootMissing: false }
                    : g
                )
              );
              toast.success(`Raiz corrigida via Jikan: ${newRoot.title}`);
            } else {
              // CORREÇÃO 2: Raiz real NÃO está no banco — sinalizar, não importar sozinho
              const exists = await checkWorkExistsInDb(result.franchise_id, dynamicWorks);
              if (!exists) {
                setGroups((prev) =>
                  prev.map((g, i) =>
                    i === index
                      ? {
                          ...g,
                          rootMissing: true,
                          rootMissingMalId: result.franchise_id,
                          rootMissingTitle: result.rootTitle || `mal_id ${result.franchise_id}`,
                          verificationResult: result,
                        }
                      : g
                  )
                );
                toast(
                  `Raiz real (mal_id ${result.franchise_id} — ${result.rootTitle}) não está no catálogo. Use "Importar raiz".`,
                  { icon: "⚠️", duration: 6000 }
                );
              } else {
                toast(
                  `Jikan indica raiz mal_id ${result.franchise_id} (existe no banco mas não neste grupo — corrija manualmente)`,
                  { icon: "⚠️" }
                );
              }
            }
          } else {
            toast.success("Raiz confirmada via Jikan");
          }
        } catch {
          toast.error("Erro ao verificar raiz via Jikan");
        } finally {
          setVerifyingIdx(null);
        }
      } else if (action === "importRoot") {
        // CORREÇÃO 2: Importar a raiz real via Jikan /anime/{id}/full
        const rootMalId = group.rootMissingMalId;
        if (!rootMalId) {
          toast.error("mal_id da raiz faltante não disponível");
          return;
        }
        setVerifyingIdx(index);
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${rootMalId}/full`);
          if (res.status === 429) {
            toast.error("Rate limit do Jikan. Aguarde e tente novamente.");
            return;
          }
          if (!res.ok) {
            toast.error(`Jikan retornou ${res.status} para mal_id ${rootMalId}`);
            return;
          }
          const json = await res.json();
          const workData = json.data;
          if (!workData) {
            toast.error("Dados da raiz não encontrados no Jikan");
            return;
          }

          // Check if already exists
          const existing = await base44.entities.DynamicWork.filter({ mal_id: rootMalId });
          if (existing.length > 0) {
            toast("Raiz já existe no catálogo", { icon: "ℹ️" });
            return;
          }

          const slug = (workData.title_english || workData.title)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

          const newWork = {
            slug,
            title: workData.title_english || workData.title,
            title_pt: null,
            romaji_title: workData.title !== (workData.title_english || workData.title) ? workData.title : null,
            categories: JSON.stringify(workData.type === "Movie" ? ["anime", "filme"] : ["anime"]),
            genres: JSON.stringify((workData.genres || []).map((g) => g.name)),
            synopsis: workData.synopsis || null,
            episodes: workData.episodes || null,
            chapters: null,
            volumes: null,
            anime_status: workData.status === "Currently Airing" ? "Em exibição" : workData.status === "Finished Airing" ? "Finalizado" : workData.status === "Not yet aired" ? "Em breve" : null,
            manga_status: null,
            mal_id: workData.mal_id,
            manga_mal_id: null,
            score: workData.score || null,
            year: workData.year || null,
            duration: workData.duration || null,
            image_url: workData.images?.jpg?.large_image_url || null,
            source: "jikan",
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
            popularity_rank: workData.popularity || null,
            is_currently_airing: workData.airing || false,
            season: workData.season ? `${workData.season}_${workData.year}` : null,
            season_year: workData.year || null,
          };

          await base44.entities.DynamicWork.create(newWork);
          toast.success(`Raiz importada: ${newWork.title}`);
          queryClient.invalidateQueries({ queryKey: ["catalog-dynamic-works"] });
        } catch (e) {
          toast.error(`Erro ao importar raiz: ${e.message}`);
        } finally {
          setVerifyingIdx(null);
        }
      } else if (action === "merge") {
        setMergingIdx(index);
        await applyMerge(group, index);
        setMergingIdx(null);
      }
    },
    [groups]
  );

  const applyMerge = async (group) => {
    const root = group.rootOverride || group.root;
    const absorbed = group.absorbed.filter(
      (a) => !group.removedSeasons?.includes(a.id)
    );

    if (absorbed.length === 0) {
      toast.error("Nenhuma temporada para absorver");
      return;
    }

    const allItems = [root, ...absorbed].sort(
      (a, b) => (a.mal_id || 0) - (b.mal_id || 0)
    );
    const seasons = buildSeasonsArray(allItems);
    // franchise_id: override (external root) > root mal_id
    const franchiseId = group.franchiseIdOverride || String(root.mal_id);

    // 1. Save backup (DynamicWork state only — not AnimeEntry per requirements)
    const backup = {
      timestamp: new Date().toISOString(),
      franchiseKey: group.franchiseKey,
      rootWork: { ...root },
      absorbedWorks: absorbed.map((w) => ({ ...w })),
      animeEntryUpdates: [],
    };

    try {
      // 2. Re-point AnimeEntry records (PROTEÇÃO DA UserList — inegociável)
      for (const w of absorbed) {
        try {
          const entries = await base44.entities.AnimeEntry.filter({
            title: w.title,
          });
          for (const entry of entries) {
            backup.animeEntryUpdates.push({
              id: entry.id,
              oldTitle: entry.title,
              oldSeasonMalId: entry.season_mal_id || null,
            });
            await base44.entities.AnimeEntry.update(entry.id, {
              title: root.title,
              season_mal_id: w.mal_id,
            });
          }
        } catch (e) {
          console.warn(`Failed to re-point entries for ${w.title}:`, e.message);
        }
      }

      // 3. Update root DynamicWork with seasons[] + franchise fields
      await base44.entities.DynamicWork.update(root.id, {
        franchise_id: franchiseId,
        franchise_title: root.title,
        franchise_score: root.score || null,
        franchise_poster_url: root.image_url || null,
        seasons: JSON.stringify(seasons),
      });

      // 4. Delete absorbed DynamicWork records — SKIP if any has a frozen category
      //    (preserves manga/movie/liveaction data in multi-category works)
      for (const w of absorbed) {
        let cats = [];
        try { cats = w.categories ? JSON.parse(w.categories) : []; } catch {}
        const hasFrozenCat = cats.some((c) => !isCategoryActive(c) && c !== "anime");
        if (hasFrozenCat) {
          console.warn(`Skipping deletion of "${w.title}" — has frozen category (manga/movie/liveaction data preserved).`);
          continue;
        }
        await base44.entities.DynamicWork.delete(w.id);
      }

      // 5. Save backup to localStorage
      const existingBackups = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
      existingBackups.push(backup);
      localStorage.setItem(BACKUP_KEY, JSON.stringify(existingBackups));
      setHasBackup(true);

      // 6. Mark group as merged
      setGroups((prev) =>
        prev.map((g, i) => (i === groups.indexOf(group) ? { ...g, status: "merged" } : g))
      );

      // 7. Invalidate catalog cache
      queryClient.invalidateQueries({ queryKey: ["catalog-dynamic-works"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-sync-records"] });

      toast.success(
        `"${root.title}" unificada (${absorbed.length} temporada(s) absorvida(s))`
      );
    } catch (e) {
      toast.error(`Erro no merge: ${e.message}`);
    }
  };

  const handleRollback = async () => {
    const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
    if (backups.length === 0) {
      toast.error("Nenhum backup disponível");
      return;
    }

    const lastBackup = backups[backups.length - 1];
    const { rootWork, absorbedWorks } = lastBackup;

    try {
      // Restore root work (remove franchise fields)
      await base44.entities.DynamicWork.update(rootWork.id, {
        franchise_id: null,
        franchise_title: null,
        franchise_score: null,
        franchise_poster_url: null,
        seasons: null,
      });

      // Re-create absorbed works
      for (const w of absorbedWorks) {
        const { id, ...workData } = w;
        await base44.entities.DynamicWork.create(workData);
      }

      // Restore AnimeEntry titles
      for (const update of lastBackup.animeEntryUpdates) {
        try {
          await base44.entities.AnimeEntry.update(update.id, {
            title: update.oldTitle,
            season_mal_id: update.oldSeasonMalId,
          });
        } catch (e) {
          console.warn("Failed to restore entry:", update.id, e.message);
        }
      }

      // Remove last backup
      backups.pop();
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
      setHasBackup(backups.length > 0);

      queryClient.invalidateQueries({ queryKey: ["catalog-dynamic-works"] });

      toast.success("Rollback concluído");
    } catch (e) {
      toast.error(`Erro no rollback: ${e.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-space font-bold text-foreground flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary" />
            Unificar franquias
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Esta ferramenta altera a estrutura de franquias de anime. Revise cada grupo antes de aplicar.
          </p>
        </div>
        {hasBackup && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleRollback}>
            <Undo2 className="w-4 h-4" /> Desfazer Último
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{groups.length} grupos detectados</Badge>
        <Badge className="bg-chart-4/15 text-chart-4 border-none">{pendingCount} pendentes</Badge>
        <Badge className="bg-primary/15 text-primary border-none">{mergedCount} fundidos</Badge>
        <Badge variant="secondary">{skippedCount} pulados</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar grupo ou título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Groups list */}
      <div className="grid gap-3">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum grupo encontrado.</p>
          </div>
        ) : (
          filteredGroups.map((group, idx) => (
            <FranchiseGroupCard
              key={group.franchiseKey}
              group={group}
              index={groups.indexOf(group)}
              onAction={handleAction}
              verifying={verifyingIdx === groups.indexOf(group)}
            />
          ))
        )}
      </div>
    </div>
  );
}