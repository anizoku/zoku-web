import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Save, AlertCircle, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { isCategoryFrozen } from "@/lib/scopeConfig";

const CATS = [
  { key: "show_in_animes", label: "Animes", catalogKey: "anime" },
  { key: "show_in_mangas", label: "Mangás", catalogKey: "manga" },
  { key: "show_in_liveaction", label: "Live-Action", catalogKey: "liveaction" },
  { key: "show_in_filmes", label: "Filmes", catalogKey: "movie" },
];

export default function CategoryManager() {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [localChanges, setLocalChanges] = useState({}); // slug -> { show_in_animes, ... }
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const hasChanges = Object.keys(localChanges).length > 0;
    const handler = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "Você possui alterações não salvas. Deseja sair mesmo assim?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [localChanges]);

  const { data: visibilityRecords, refetch } = useQuery({
    queryKey: ["work-category-visibility"],
    queryFn: () => base44.entities.WorkCategoryVisibility.list("-updated_date", 500),
    initialData: [],
  });

  // Build a map: slug -> saved visibility record
  const visibilityMap = useMemo(() => {
    const m = new Map();
    for (const r of visibilityRecords) m.set(r.work_slug, r);
    return m;
  }, [visibilityRecords]);

  // Get the "committed" value (saved to DB) for a slug+cat
  function getSavedValue(slug, catKey, catalogKey) {
    const record = visibilityMap.get(slug);
    if (record) return record[catKey] ?? true;
    const item = CATALOG.find(c => c.slug === slug);
    return item?.categories?.includes(catalogKey) ?? false;
  }

  // Get current display value (local change takes priority)
  function getCurrentValue(slug, catKey, catalogKey) {
    if (localChanges[slug] && catKey in localChanges[slug]) {
      return localChanges[slug][catKey];
    }
    return getSavedValue(slug, catKey, catalogKey);
  }

  function handleCheckboxChange(slug, title, catKey, catalogKey, newValue) {
    // ── FREEZE GUARD: ignore changes to frozen categories ──────────
    if (isCategoryFrozen(catalogKey)) return;
    const savedValue = getSavedValue(slug, catKey, catalogKey);
    setLocalChanges(prev => {
      const existing = prev[slug] || {};
      const updated = { ...existing, [catKey]: newValue };
      // Also store defaults for all other cats so we can create a full record if needed
      if (!visibilityMap.has(slug)) {
        const item = CATALOG.find(c => c.slug === slug);
        CATS.forEach(cat => {
          if (!(cat.key in updated)) {
            updated[cat.key] = item?.categories?.includes(cat.catalogKey) ?? false;
          }
        });
        updated._title = title;
      }
      // If value reverted to saved, remove this key from local changes
      const finalUpdated = { ...updated };
      // Check if all values match saved — if so, remove slug from changes
      const allMatchSaved = CATS.every(cat => {
        const local = finalUpdated[cat.key];
        const saved = getSavedValue(slug, cat.key, cat.catalogKey);
        return local === undefined || local === saved;
      });
      if (allMatchSaved) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }
      return { ...prev, [slug]: finalUpdated };
    });
  }

  async function handleSave() {
    const slugsToSave = Object.keys(localChanges);
    if (slugsToSave.length === 0) return;

    setIsSaving(true);
    try {
      await Promise.all(slugsToSave.map(async (slug) => {
        const changes = localChanges[slug];
        const existing = visibilityMap.get(slug);
        const item = CATALOG.find(c => c.slug === slug);
        const title = changes._title || item?.title || slug;

        if (existing) {
          const update = {};
          CATS.forEach(cat => {
            if (cat.key in changes) update[cat.key] = changes[cat.key];
          });
          await base44.entities.WorkCategoryVisibility.update(existing.id, {
            ...update,
            updated_by: user?.email,
          });
        } else {
          // Create a new record with all values
          const fullRecord = { work_slug: slug, work_title: title, updated_by: user?.email };
          CATS.forEach(cat => {
            fullRecord[cat.key] = cat.key in changes
              ? changes[cat.key]
              : (item?.categories?.includes(cat.catalogKey) ?? false);
          });
          await base44.entities.WorkCategoryVisibility.create(fullRecord);
        }
      }));

      setLocalChanges({});
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["work-category-visibility"] });
      toast.success("Modificações salvas com sucesso.");
    } catch (e) {
      toast.error("Não foi possível salvar as modificações.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges = Object.keys(localChanges).length > 0;

  const filteredCatalog = useMemo(() =>
    CATALOG.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [search]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-space font-bold text-xl text-foreground mb-1">Gerenciar visibilidade por categoria</h2>
        <p className="text-sm text-muted-foreground">
          Todos os títulos permanecem no Catálogo. As caixas abaixo controlam apenas em quais seções públicas cada título aparece.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar obras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-none"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {hasChanges && (
            <div className="flex items-center gap-1.5 text-xs text-chart-4">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{Object.keys(localChanges).length} alteração{Object.keys(localChanges).length > 1 ? "ões" : ""} não salva{Object.keys(localChanges).length > 1 ? "s" : ""}</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-2 bg-primary text-primary-foreground"
            size="sm"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Salvando..." : "Salvar modificações"}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_90px_repeat(4,_72px)] gap-2 px-4 py-2.5 border-b border-border bg-secondary/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Título</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Catálogo</span>
          {CATS.map(cat => (
            <span key={cat.key} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">{cat.label}</span>
          ))}
        </div>

        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {filteredCatalog.map(item => {
            const rowChanged = !!localChanges[item.slug];
            return (
              <div
                key={item.slug}
                className={`grid grid-cols-[1fr_90px_repeat(4,_72px)] gap-2 px-4 py-2.5 items-center transition-colors ${rowChanged ? "bg-chart-4/5 border-l-2 border-l-chart-4" : "hover:bg-secondary/30"}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  {rowChanged && <p className="text-[10px] text-chart-4 font-medium">Alteração pendente</p>}
                </div>
                {/* Catalog column — always read-only */}
                <div className="flex justify-center">
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] px-2 py-0.5 font-medium">No catálogo</Badge>
                </div>
                {/* Category checkboxes */}
                {CATS.map(cat => {
                  const checked = getCurrentValue(item.slug, cat.key, cat.catalogKey);
                  const frozen = isCategoryFrozen(cat.catalogKey);
                  return (
                    <div key={cat.key} className="flex flex-col items-center gap-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => handleCheckboxChange(item.slug, item.title, cat.key, cat.catalogKey, e.target.checked)}
                        disabled={frozen}
                        className={`w-4 h-4 ${frozen ? "opacity-40 cursor-not-allowed" : "accent-primary cursor-pointer"}`}
                      />
                      {frozen && (
                        <span className="text-[8px] text-destructive font-bold flex items-center gap-0.5" title="Categoria congelada (ANIME_ONLY)">
                          <Snowflake className="w-2 h-2" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredCatalog.length} obras · {visibilityRecords.length} com configuração manual
      </p>
    </div>
  );
}