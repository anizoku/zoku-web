import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCatalog } from "@/contexts/CatalogContext";
import { XP_REWARDS } from "@/lib/xpSystem";
import { getTMDBWorkDetails, getTMDBAlternativeTitles, findRomajiTitle, invalidateTMDBCache } from "@/lib/tmdb";
import { useAutoImageRefresh } from "@/hooks/useAutoImageRefresh";
import { ArrowLeft, Star, Tv, BookOpen, Film, Plus, Minus, Zap, CheckCircle2, ListPlus, Loader2, Trash2, Sparkles, XCircle } from "lucide-react";
import ProgressInput from "@/components/media/ProgressInput";
import TMDBDetails, { OverviewSection, InfoSection, TrailerSection, WatchSection, CastSection, SeasonsSection, TMDBUpdateButton } from "@/components/media/TMDBDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import RelatedWorks from "@/components/media/RelatedWorks";
import ReleaseBlock from "@/components/obra/ReleaseBlock";
import { isCategoryFrozen, isCategoryActive } from "@/lib/scopeConfig";
import { validateProgress, computeXpDelta, shouldAutoComplete } from "@/lib/progressValidation";
import { filterActiveReleases } from "@/lib/releaseTracking";

const FORMAT_CONFIG = {
  liveaction: {
    label: "Live-Action",
    icon: Film,
    color: "text-chart-1",
    bg: "bg-chart-1/10",
    border: "border-chart-1/30",
    statusKey: "liveActionStatus",
    progressKey: "current_episode",
    totalKey: "total_episodes",
    catalogTotalKey: "liveActionSeasons",
    catalogStatusKey: "liveActionStatus",
    unit: "Temp.",
    unitLong: "Temporada",
    defaultStatus: "planned",
    statusOptions: ["planned", "watching", "completed", "on_hold", "dropped"],
    xpKey: "episode_watched",
  },
  anime: {
    label: "Anime",
    icon: Tv,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
    statusKey: "animeStatus",
    progressKey: "current_episode",
    totalKey: "total_episodes",
    catalogTotalKey: "totalEpisodes",
    catalogStatusKey: "animeStatus",
    unit: "Ep.",
    unitLong: "Episódio",
    defaultStatus: "watching",
    statusOptions: ["planned", "watching", "completed", "on_hold", "dropped"],
    xpKey: "episode_watched",
  },
  manga: {
    label: "Mangá",
    icon: BookOpen,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
    border: "border-chart-3/30",
    statusKey: "mangaStatus",
    progressKey: "current_chapter",
    totalKey: "total_chapters",
    catalogTotalKey: "totalChapters",
    catalogStatusKey: "mangaStatus",
    unit: "Cap.",
    unitLong: "Capítulo",
    defaultStatus: "reading",
    statusOptions: ["planned", "reading", "completed", "on_hold", "dropped"],
    xpKey: "chapter_read",
  },
  movie: {
    label: "Filme",
    icon: Film,
    color: "text-chart-5",
    bg: "bg-chart-5/10",
    border: "border-chart-5/30",
    statusKey: "movieStatus",
    progressKey: "current_episode",
    totalKey: "total_episodes",
    catalogTotalKey: null,
    catalogStatusKey: "movieStatus",
    unit: "Filme",
    unitLong: "Filme",
    defaultStatus: "planned",
    statusOptions: ["planned", "completed"],
    xpKey: "episode_watched",
  },
};

const STATUS_LABELS = {
  watching: "Assistindo",
  reading: "Lendo",
  completed: "Concluído",
  planned: "Planejado",
  dropped: "Dropado",
  on_hold: "Pausado",
};

const STATUS_COLORS = {
  watching: "text-primary",
  reading: "text-chart-2",
  completed: "text-chart-4",
  planned: "text-muted-foreground",
  dropped: "text-destructive",
  on_hold: "text-chart-3",
};

function Toast({ message, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium ${color}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </motion.div>
  );
}

function FormatBlock({ format, media, entries, user, onMutate }) {
  const cfg = FORMAT_CONFIG[format];
  const Icon = cfg.icon;
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [showUpdateHint, setShowUpdateHint] = useState(false);

  // Each format stored with a marker in the `genre` field: "__format:anime", "__format:manga", "__format:movie"
  const formatMarker = `__format:${format}`;
  const catalogTotal = cfg.catalogTotalKey ? (media[cfg.catalogTotalKey] || 0) : 1;
  const entryType = format === "movie" ? "anime" : format;

  const entry = user ? entries.find(
    (e) => e.created_by === user.email &&
      e.title === media.title &&
      e.genre === formatMarker
  ) : null;

  const [confirmRemove, setConfirmRemove] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
      showToast(`${cfg.label} adicionado!`, ListPlus, "bg-card border-primary/40 text-primary");
    },
    onError: () => {
      showToast("Erro ao adicionar. Tente novamente.", XCircle, "bg-card border-destructive/30 text-destructive");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnimeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
      showToast("Obra removida da sua lista.", Trash2, "bg-card border-destructive/30 text-destructive");
    },
    onError: () => {
      showToast("Erro ao remover. Tente novamente.", XCircle, "bg-card border-destructive/30 text-destructive");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
    },
    onError: () => {
      showToast("Erro ao salvar. Tente novamente.", XCircle, "bg-card border-destructive/30 text-destructive");
    },
  });

  // Helper: create XpEvent + update streak on profile
  async function recordXpEvent(eventType, xpAmount) {
    if (!user?.email) return;
    const today = new Date().toISOString().slice(0, 10);
    // Map internal keys to XpEvent enum values
    const typeMap = {
      episode_watched: "episode_watched",
      chapter_read: "chapter_read",
      work_completed: "work_completed",
    };
    const mappedType = typeMap[eventType] || "episode_watched";
    // Fire-and-forget — don't block the UI
    base44.entities.XpEvent.create({
      user_email: user.email,
      event_type: mappedType,
      xp_amount: xpAmount,
      event_date: new Date().toISOString(),
    }).catch(() => {});

    // Update streak on UserProfile
    try {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      const profile = profiles[0];
      if (!profile) return;
      const lastActivity = profile.last_activity_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let newStreak = profile.current_streak || 0;
      if (lastActivity === today) {
        // already updated today, keep streak
      } else if (lastActivity === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
      base44.entities.UserProfile.update(profile.id, {
        last_activity_date: today,
        current_streak: newStreak,
      }).catch(() => {});
    } catch {}
  }

  function showToast(msg, icon, color) {
    setToast({ message: msg, icon, color });
    setTimeout(() => setToast(null), 2500);
  }

  function handleAdd(status) {
    if (!user || isMutating) return;
    // Upsert: if an entry already exists for this title+format, update instead of creating
    if (entry) {
      updateMutation.mutate({ id: entry.id, data: { status } }, {
        onSuccess: () => showToast(`Status: ${STATUS_LABELS[status]}`, CheckCircle2, "bg-card border-primary/30 text-primary"),
      });
      return;
    }
    // Also check for entries without the format marker (created via MyList or MediaDrawer)
    const genericEntry = user ? entries.find(
      (e) => e.created_by === user.email && e.title === media.title && !e.genre?.startsWith("__format:")
    ) : null;
    if (genericEntry) {
      updateMutation.mutate({ id: genericEntry.id, data: { status, genre: formatMarker } }, {
        onSuccess: () => showToast(`Status: ${STATUS_LABELS[status]}`, CheckCircle2, "bg-card border-primary/30 text-primary"),
      });
      return;
    }
    // Se status é "completed", preenche o progresso com o total — XP só após persistir
    if (status === "completed") {
      const resolvedTotal = Math.max(catalogTotal, isMovie ? 1 : 0);
      const xpPerUnit = XP_REWARDS[cfg.xpKey];
      const xpEarned = resolvedTotal > 0 ? resolvedTotal * xpPerUnit : 0;
      const bonusXp = 125;
      const totalXp = xpEarned + bonusXp;
      createMutation.mutate({
        title: media.title,
        type: entryType,
        status,
        genre: formatMarker,
        total_episodes: format === "anime" || format === "liveaction" || format === "movie" ? resolvedTotal : 0,
        total_chapters: format === "manga" ? resolvedTotal : 0,
        current_episode: format === "anime" || format === "liveaction" || format === "movie" ? resolvedTotal : 0,
        current_chapter: format === "manga" ? resolvedTotal : 0,
      }, {
        onSuccess: () => {
          if (xpEarned > 0) recordXpEvent(cfg.xpKey, xpEarned);
          recordXpEvent("work_completed", 125);
          showToast(`✓ Concluído! +${totalXp} XP`, CheckCircle2, "bg-card border-chart-4/40 text-chart-4");
        },
      });
      return;
    }
    createMutation.mutate({
      title: media.title,
      type: entryType,
      status,
      genre: formatMarker,
      total_episodes: format === "anime" ? catalogTotal : format === "movie" ? 1 : 0,
      total_chapters: format === "manga" ? catalogTotal : 0,
      current_episode: 0,
      current_chapter: 0,
    });
  }

  async function handleStatusChange(newStatus) {
    if (!entry || isMutating) return;
    if (newStatus === "completed") {
      // Resolve o total com múltiplos fallbacks: entry > catálogo > 1 (para filmes)
      const resolvedTotal = Math.max(
        entry[cfg.totalKey] || 0,
        catalogTotal || 0,
        isMovie ? 1 : 0
      );
      const prev = entry[cfg.progressKey] || 0;
      const missing = resolvedTotal > 0 ? Math.max(0, resolvedTotal - prev) : 0;
      const xpPerUnit = XP_REWARDS[cfg.xpKey];
      const xpEarned = missing > 0 ? missing * xpPerUnit : 0;
      const bonusXp = 125;
      const totalXp = xpEarned + bonusXp;
      // Sempre preenche o progresso com o total resolvido
      const updates = {
        status: "completed",
        [cfg.progressKey]: resolvedTotal,
        [cfg.totalKey]: resolvedTotal,
      };
      // XP só após persistência confirmada
      updateMutation.mutate({ id: entry.id, data: updates }, {
        onSuccess: () => {
          if (xpEarned > 0) recordXpEvent(cfg.xpKey, xpEarned);
          recordXpEvent("work_completed", 125);
          showToast(`✓ Concluído! +${totalXp} XP`, CheckCircle2, "bg-card border-chart-4/40 text-chart-4");
        },
      });
    } else {
      updateMutation.mutate({ id: entry.id, data: { status: newStatus } }, {
        onSuccess: () => showToast(`Status: ${STATUS_LABELS[newStatus]}`, CheckCircle2, "bg-card border-primary/30 text-primary"),
      });
    }
  }

  function handleIncrement() {
    if (!entry || isMutating) return;
    if (effectiveTotal > 0 && current >= effectiveTotal) return;
    const field = cfg.progressKey;
    const cur = entry[field] || 0;
    const v = validateProgress(cur + 1, effectiveTotal > 0 ? effectiveTotal : null);
    if (!v.valid) return;
    const newVal = v.value;
    const updates = { [field]: newVal };
    const willComplete = shouldAutoComplete(newVal, effectiveTotal, isAiring);
    if (willComplete) updates.status = "completed";
    const xpDelta = computeXpDelta(cur, newVal, XP_REWARDS[cfg.xpKey]);
    updateMutation.mutate({ id: entry.id, data: updates }, {
      onSuccess: () => {
        if (xpDelta > 0) recordXpEvent(cfg.xpKey, xpDelta);
        if (willComplete) recordXpEvent("work_completed", 125);
        showToast(`${cfg.unit} ${newVal}! +${xpDelta} XP`, Zap, "bg-card border-primary/30 text-primary");
      },
    });
  }

  function handleDecrement() {
    if (!entry || isMutating) return;
    const field = cfg.progressKey;
    const cur = entry[field] || 0;
    if (cur <= 0) return;
    const v = validateProgress(cur - 1, effectiveTotal > 0 ? effectiveTotal : null);
    if (!v.valid) return;
    // Reduzir progresso de entrada concluída: manter coerência (sai de concluído se abaixo do total)
    const updates = { [field]: v.value };
    if (entry.status === "completed" && effectiveTotal > 0 && v.value < effectiveTotal) {
      updates.status = "watching";
    }
    updateMutation.mutate({ id: entry.id, data: updates });
  }

  function handleJumpTo(newVal) {
    if (!entry || isMutating) return;
    const field = cfg.progressKey;
    const prev = entry[field] || 0;
    const v = validateProgress(newVal, effectiveTotal > 0 ? effectiveTotal : null);
    if (!v.valid) return;
    newVal = v.value;
    if (newVal === prev) return;
    const updates = { [field]: newVal };
    const willComplete = shouldAutoComplete(newVal, effectiveTotal, isAiring);
    if (willComplete) updates.status = "completed";
    const xpDelta = computeXpDelta(prev, newVal, XP_REWARDS[cfg.xpKey]);
    updateMutation.mutate({ id: entry.id, data: updates }, {
      onSuccess: () => {
        if (xpDelta > 0) {
          recordXpEvent(cfg.xpKey, xpDelta);
          showToast(`Progresso → ${cfg.unit} ${newVal}! +${xpDelta} XP`, Zap, "bg-card border-primary/30 text-primary");
        } else {
          showToast(`Progresso atualizado para ${cfg.unit} ${newVal}`, CheckCircle2, "bg-card border-primary/30 text-primary");
        }
        if (willComplete) recordXpEvent("work_completed", 125);
      },
    });
  }

  const current = entry ? (entry[cfg.progressKey] || 0) : 0;
  const entryTotal = entry ? (entry[cfg.totalKey] || 0) : 0;
  // Risco 1 fix: usar Math.max para não travar no total antigo
  const effectiveTotal = Math.max(entryTotal, catalogTotal);
  const total = entry ? effectiveTotal : catalogTotal;
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const catalogStatus = media[cfg.catalogStatusKey];
  const isMovie = format === "movie";
  const isAiring = format === "anime" && (media.is_currently_airing || catalogStatus === "Em exibição");

  // Risco 2 fix: detectar quando catalogTotal cresceu além do total salvo no entry
  const totalOutdated = entry && entryTotal > 0 && catalogTotal > entryTotal;
  const totalField = format === "manga" ? "total_chapters" : "total_episodes";

  useEffect(() => {
    setShowUpdateHint(!!totalOutdated);
  }, [totalOutdated]);

  return (
    <>
      <div className={`rounded-xl border ${cfg.border} bg-card overflow-hidden`}>
        {/* Header */}
        <div className={`px-4 py-3 ${cfg.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${cfg.color}`} />
            <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
          </div>
          {catalogStatus && (
            <Badge className={`text-[10px] border-none bg-card/80 ${cfg.color}`}>{catalogStatus}</Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Total */}
          {!isMovie && catalogTotal > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total de {cfg.unitLong}s</span>
              <span className="font-bold text-foreground">{catalogTotal}</span>
            </div>
          )}
          {/* Live-action series: show episode count if available */}
          {format === "liveaction" && !media.liveActionIsMovie && media.liveActionEpisodes && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total de Episódios</span>
              <span className="font-bold text-foreground">{media.liveActionEpisodes}</span>
            </div>
          )}
          {isMovie && media.movieDuration && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Duração</span>
              <span className="font-bold text-foreground">{media.movieDuration}</span>
            </div>
          )}

          {/* No entry: add buttons */}
          {!entry ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Adicionar à lista:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {cfg.statusOptions.slice(0, 4).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    disabled={isMutating}
                    onClick={() => handleAdd(s)}
                    className={`text-xs h-8 border-border hover:${cfg.border} hover:${cfg.color}`}
                  >
                    {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Status */}
              <Select value={entry.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="bg-secondary border-none h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cfg.statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Progress for non-movie */}
              {!isMovie && (
                <div className="rounded-lg bg-secondary/40 px-3 py-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{cfg.unitLong} atual</span>
                    <span className="font-bold text-foreground">{current}{total > 0 ? ` / ${total}` : ""}</span>
                  </div>
                  {total > 0 && (
                    <>
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground text-right">{Math.round(progress)}% concluído</p>
                    </>
                  )}
                  {/* Risco 2: aviso quando total do catálogo é maior que o salvo */}
                  {showUpdateHint && (
                    <div className="flex items-center justify-between bg-chart-4/10 border border-chart-4/30 rounded-lg px-2.5 py-1.5 mt-1">
                      <p className="text-[10px] text-chart-4">Total atualizado para {catalogTotal}. Atualizar?</p>
                      <button
                        onClick={() => {
                          updateMutation.mutate({ id: entry.id, data: { [totalField]: catalogTotal } });
                          setShowUpdateHint(false);
                        }}
                        className="text-[10px] font-semibold text-chart-4 hover:underline ml-2 shrink-0"
                      >
                        Atualizar
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8 border-border" onClick={handleDecrement} disabled={isMutating || current <= 0} aria-label={`Diminuir ${cfg.unitLong}`}>
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" className={`h-8 w-8 ${cfg.bg} ${cfg.color} border ${cfg.border} hover:opacity-80`} onClick={handleIncrement} disabled={isMutating || (effectiveTotal > 0 && current >= effectiveTotal)} aria-label={`Aumentar ${cfg.unitLong}`}>
                        {isMutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      </Button>
                      <ProgressInput
                        current={current}
                        total={total}
                        prefix={format === "manga" ? "CP" : "EP"}
                        onConfirm={handleJumpTo}
                        disabled={isMutating}
                      />
                    </div>
                    <span className={`text-xs font-medium flex items-center gap-1 ${cfg.color}`}>
                      <Zap className="w-3 h-3" />+{XP_REWARDS[cfg.xpKey]} XP
                    </span>
                  </div>
                </div>
              )}

              {/* In list indicator + remove */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {STATUS_LABELS[entry.status] || entry.status}
                    {!isMovie && current > 0 && ` · ${cfg.unit} ${current}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmRemove(true)}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remover
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-space">Remover da lista?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover esta obra da sua lista?</p>
          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { setConfirmRemove(false); deleteMutation.mutate(entry.id); }}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {toast && <Toast {...toast} />}
      </AnimatePresence>
    </>
  );
}

export default function ObraProfile() {
  useAutoImageRefresh();
  
  const { slug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [tmdbData, setTmdbData] = useState(null);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState(null);
  const [romajiTitle, setRomajiTitle] = useState(null);
  const { getBySlug, isLoading: catalogLoading } = useCatalog();

  // getBySlug já retorna o item mesclado com CatalogSync via CatalogContext
  const media = getBySlug(slug);

  // ── Release-based tracking (Fase 4) ──
  // Derivado ANTES dos useEffects para evitar TDZ.
  // Optional chaining pois media pode ser null durante carregamento.
  const allReleases = media?.releases || [];
  const activeReleases = filterActiveReleases(allReleases);
  const useReleaseMode = !!media?.has_work_releases && activeReleases.length > 0;

  // Read ?tipo= from URL — normalize to valid active category (no loops)
  useEffect(() => {
    if (!media) return;
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo");
    if (!tipo) return;
    if (isCategoryActive(tipo)) {
      setActiveTab(tipo);
      return;
    }
    // Frozen or invalid — normalize to first active category in this work
    const firstActive = (media.categories || []).find(c => isCategoryActive(c));
    if (firstActive) {
      setActiveTab(firstActive);
      const newParams = new URLSearchParams();
      newParams.set("tipo", firstActive);
      window.history.replaceState(null, "", `?${newParams.toString()}`);
    } else {
      // No active category available — remove ?tipo= entirely
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [media?.slug]);

  // Scroll to specific release when ?release= param is present (shareable URLs)
  // Dependências estáveis: useReleaseMode (boolean), media?.slug (string).
  // activeReleases é um array novo a cada render — não usar como dep.
  useEffect(() => {
    if (!useReleaseMode) return;
    const params = new URLSearchParams(window.location.search);
    const releaseId = params.get("release");
    if (!releaseId) return;
    const el = document.getElementById(`release-${releaseId}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [useReleaseMode, media?.slug]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Dynamic page title using real work title
  usePageTitle(media?.title || slug?.replace(/-/g, " ") || "Obra");

  // Fetch TMDB data — skip manga-only works
  useEffect(() => {
    if (!media) return;
    const isMangaOnly = media.categories.length === 1 && media.categories[0] === "manga";
    if (isMangaOnly) return;
    // TMDB freeze: skip for frozen categories (movie-only, liveaction-only)
    const isMovieOnly = media.categories.length === 1 && media.categories[0] === "movie";
    const isLiveActionOnly = media.categories.length === 1 && media.categories[0] === "liveaction";
    if (isMovieOnly && isCategoryFrozen("movie")) return;
    if (isLiveActionOnly && isCategoryFrozen("liveaction")) return;
    const type = media.categories.includes("movie") && !media.categories.includes("anime") ? "movie" : "tv";
    setTmdbLoading(true);
    setTmdbError(null);
    setRomajiTitle(null);

    // 1. Prefer static romaji_title from catalog
    if (media.romaji_title) {
      setRomajiTitle(media.romaji_title);
    }

    getTMDBWorkDetails(media.title, type)
      .then(async (data) => {
        setTmdbData(data);
        // 2. If no static romaji, try TMDB alternative titles
        if (!media.romaji_title && data?.tmdbId) {
          try {
            const altTitles = await getTMDBAlternativeTitles(data.tmdbId, type);
            const enriched = { ...data, _altTitles: altTitles || [] };
            const found = findRomajiTitle(enriched);
            if (found) setRomajiTitle(found);
          } catch {}
        }
      })
      .catch((e) => setTmdbError(e.message))
      .finally(() => setTmdbLoading(false));
  }, [media?.slug]);

  function handleTMDBRefresh() {
    if (!media) return;
    const type = media.categories.includes("movie") && !media.categories.includes("anime") ? "movie" : "tv";
    invalidateTMDBCache(media.title, type);
    setTmdbLoading(true);
    setTmdbError(null);
    getTMDBWorkDetails(media.title, type)
      .then(async (data) => {
        setTmdbData(data);
        if (!media.romaji_title && data?.tmdbId) {
          try {
            const altTitles = await getTMDBAlternativeTitles(data.tmdbId, type);
            const enriched = { ...data, _altTitles: altTitles || [] };
            const found = findRomajiTitle(enriched);
            if (found) setRomajiTitle(found);
          } catch {}
        }
      })
      .catch(() => setTmdbError("Não foi possível atualizar os dados pelo TMDB agora. Tente novamente mais tarde."))
      .finally(() => setTmdbLoading(false));
  }

  // User-specific entries query — RLS ensures only own entries are returned.
  // Key includes user email for cache isolation; limit raised to avoid truncation.
  const { data: entries, refetch } = useQuery({
    queryKey: ["anime-entries", user?.email],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 500),
    enabled: !!user,
    initialData: [],
  });

  // NOTE: "Friends watching" and "user count" indicators removed — AnimeEntry
  // RLS restricts reads to own entries, so there's no authorized source for
  // community-wide counts. To re-enable, a dedicated aggregated endpoint is needed.

  if (catalogLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">
        <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="h-52 sm:h-64 bg-secondary animate-pulse" />
          <div className="px-5 py-3 flex gap-3">
            <div className="h-5 w-16 bg-secondary rounded animate-pulse" />
            <div className="h-5 w-20 bg-secondary rounded animate-pulse" />
          </div>
        </div>
        <div className="h-32 bg-card rounded-xl border border-border animate-pulse" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Obra não encontrada.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const allFormats = media.categories || [];
  const formats = allFormats.filter(f => isCategoryActive(f));
  const activeFormat = activeTab && formats.includes(activeTab) ? activeTab : formats[0];

  const statusBadgeColor = (s) => {
    if (s === "Em exibição" || s === "Em publicação") return "bg-primary/15 text-primary";
    if (s === "Finalizado") return "bg-secondary text-secondary-foreground";
    if (s === "Hiato") return "bg-chart-4/15 text-chart-4";
    if (s === "Clássico") return "bg-chart-3/15 text-chart-3";
    return "bg-secondary text-secondary-foreground";
  };

  const formatTabLabel = (f) => {
    if (f === "anime") return { label: "Anime", icon: Tv, color: "text-chart-2" };
    if (f === "manga") return { label: "Mangá", icon: BookOpen, color: "text-chart-3" };
    if (f === "movie") return { label: "Filme", icon: Film, color: "text-chart-5" };
    if (f === "liveaction") return { label: "Live-Action", icon: Film, color: "text-chart-1" };
    return { label: f, icon: Tv, color: "text-foreground" };
  };

  // Only show blocks for active categories (Anime Only: manga/movie/liveaction hidden)
  const visibleFormats = formats.filter(f => {
    if (f !== "liveaction") return true;
    return !!(media.liveActionTitle || media.liveActionStatus);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Button>

      {/* Hero */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
        <div className="relative h-52 sm:h-64">
          <img
            src={tmdbData?.backdropUrl || media.cover}
            alt={media.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 flex gap-4 items-end">
            {/* Poster */}
            {tmdbData?.posterUrl && (
              <img
                src={tmdbData.posterUrl}
                alt={media.title}
                className="w-16 sm:w-20 rounded-lg border border-border shadow-lg shrink-0 object-cover aspect-[2/3] hidden sm:block"
              />
            )}
            <div className="flex-1 min-w-0">
              {/* Format chips */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {formats.map(f => {
                  const { label, icon: FmtIcon, color } = formatTabLabel(f);
                  return (
                    <button
                      key={f}
                      onClick={() => setActiveTab(f)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                        activeFormat === f
                          ? `bg-card border-transparent ${color}`
                          : "bg-card/40 border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FmtIcon className="w-3 h-3" /> {label}
                    </button>
                  );
                })}
              </div>
              <h1 className="font-space font-bold text-2xl sm:text-3xl text-foreground leading-tight">{media.title}</h1>
              {romajiTitle && (
                <p className="text-sm text-muted-foreground/70 mt-1 truncate font-normal italic">{romajiTitle}</p>
              )}
            </div>

          </div>
        </div>

        {/* Meta row */}
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap border-t border-border">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-chart-4 text-chart-4" />
            <span className="font-bold text-sm text-foreground">
              {tmdbData?.rating || media.rating}
            </span>
          </div>
          {(tmdbData?.genres || media.genres)?.slice(0, 4).map(g => (
            <Badge key={g} variant="outline" className="text-[10px] border-border text-muted-foreground px-1.5 py-0">{g}</Badge>
          ))}
          {tmdbData?.status ? (
            <Badge className={`text-[10px] border-none ${statusBadgeColor(tmdbData.status)}`}>{tmdbData.status}</Badge>
          ) : (
            formats.map(f => {
              const cfg = FORMAT_CONFIG[f];
              if (!cfg) return null;
              const status = media[cfg.catalogStatusKey];
              if (!status) return null;
              return (
                <Badge key={f} className={`text-[10px] border-none ${statusBadgeColor(status)}`}>{status}</Badge>
              );
            })
          )}
          {tmdbData?.year && (
            <span className="text-xs text-muted-foreground">{tmdbData.year}</span>
          )}
        </div>
      </div>

      {/* ── Content in new order ── */}
      <div className="space-y-4 mb-6">
        {/* 1. Sinopse */}
        {tmdbData && <OverviewSection data={tmdbData} />}

        {/* 2. Informações */}
        {tmdbData && (
          <InfoSection
            data={tmdbData}
            catalogTotalEpisodes={media?.totalEpisodes}
            catalogTotalChapters={media?.totalChapters}
          />
        )}

        {/* 3. Trailer */}
        {tmdbData?.trailerUrl && <TrailerSection trailerUrl={tmdbData.trailerUrl} />}

        {/* 4. Onde Assistir */}
        {tmdbData?.watchProviders && <WatchSection watchProviders={tmdbData.watchProviders} />}

        {tmdbError && !tmdbLoading && (
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-destructive">{tmdbError}</p>
          </div>
        )}

        {/* 5. Tracking blocks — release mode (WorkRelease) or legacy format mode */}
        {useReleaseMode ? (
          <div className="space-y-4">
            {activeReleases.map(r => (
              <div key={r.release_id || r.id} id={`release-${r.release_id || ""}`}>
                <ReleaseBlock
                  release={r}
                  media={media}
                  entries={entries}
                  user={user}
                  onMutate={refetch}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid gap-4 ${visibleFormats.length > 1 ? "sm:grid-cols-2" : "max-w-md"}`}>
            {visibleFormats.map(f => (
              <FormatBlock
                key={f}
                format={f}
                media={media}
                entries={entries}
                user={user}
                onMutate={refetch}
              />
            ))}
          </div>
        )}

        {/* 6. Elenco */}
        {tmdbData?.cast?.length > 0 && <CastSection cast={tmdbData.cast} />}

        {/* 7. Temporadas no final */}
        {tmdbData?.seasons?.length > 0 && <SeasonsSection seasons={tmdbData.seasons} />}

        {/* 8. Obras relacionadas */}
        <RelatedWorks item={media} entries={entries} />

        {/* Update button */}
        {tmdbData && (
          <div className="flex justify-end">
            <TMDBUpdateButton onUpdate={handleTMDBRefresh} loading={tmdbLoading} />
          </div>
        )}
      </div>
    </div>
  );
}