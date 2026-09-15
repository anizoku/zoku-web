import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tv, BookOpen, Film, Plus, Minus, Zap, CheckCircle2, ListPlus, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import ProgressInput from "@/components/media/ProgressInput";
import { XP_REWARDS } from "@/lib/xpSystem";
import { grantXpEvent, grantEpisodeRange } from "@/lib/xpEvents";
import { validateProgress, computeXpDelta, shouldAutoComplete } from "@/lib/progressValidation";
import { findEntryForRelease, buildReleaseLabel, buildReleaseSubtitle, getReleaseStatusLabel } from "@/lib/releaseTracking";

const CATEGORY_CONFIG = {
  anime: {
    icon: Tv,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
    progressKey: "current_episode",
    totalKey: "total_episodes",
    unit: "Ep.",
    unitLong: "Episódio",
    statusOptions: ["planned", "watching", "completed", "on_hold", "dropped"],
    xpKey: "episode_watched",
  },
  manga: {
    icon: BookOpen,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
    border: "border-chart-3/30",
    progressKey: "current_chapter",
    totalKey: "total_chapters",
    unit: "Cap.",
    unitLong: "Capítulo",
    statusOptions: ["planned", "reading", "completed", "on_hold", "dropped"],
    xpKey: "chapter_read",
  },
  movie: {
    icon: Film,
    color: "text-chart-5",
    bg: "bg-chart-5/10",
    border: "border-chart-5/30",
    progressKey: "current_episode",
    totalKey: "total_episodes",
    unit: "Filme",
    unitLong: "Filme",
    statusOptions: ["planned", "completed"],
    xpKey: "episode_watched",
  },
  liveaction: {
    icon: Film,
    color: "text-chart-1",
    bg: "bg-chart-1/10",
    border: "border-chart-1/30",
    progressKey: "current_episode",
    totalKey: "total_episodes",
    unit: "Temp.",
    unitLong: "Temporada",
    statusOptions: ["planned", "watching", "completed", "on_hold", "dropped"],
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

export default function ReleaseBlock({ release, media, entries, user, onMutate }) {
  const cfg = CATEGORY_CONFIG[release.category] || CATEGORY_CONFIG.anime;
  const Icon = cfg.icon;
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Resolve the user's entry for this specific release (release_id → season_mal_id fallback)
  const entry = user ? findEntryForRelease(entries, release, user.email) : null;

  // Release-specific totals
  const releaseTotal = release.category === "manga"
    ? (release.chapter_count || 0)
    : (release.episode_count || 0);

  const isMovie = release.format === "MOVIE" || release.category === "movie";
  const isAiring = release.status === "releasing";

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
      showToast(`${buildReleaseLabel(release, media.title)} adicionado!`, ListPlus, "bg-card border-primary/40 text-primary");
    },
    onError: () => showToast("Erro ao adicionar. Tente novamente.", XCircle, "bg-card border-destructive/30 text-destructive"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnimeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
      showToast("Release removido da sua lista.", Trash2, "bg-card border-destructive/30 text-destructive");
    },
    onError: () => showToast("Erro ao remover. Tente novamente.", XCircle, "bg-card border-destructive/30 text-destructive"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
    },
    onError: () => showToast("Erro ao salvar. Tente novamente.", XCircle, "bg-card border-destructive/30 text-destructive"),
  });

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // XP granting + streak update now handled by grantXpEvent from @/lib/xpEvents.

  function showToast(msg, icon, color) {
    setToast({ message: msg, icon, color });
    setTimeout(() => setToast(null), 2500);
  }

  function handleAdd(status) {
    if (!user || isMutating) return;

    const totalForEntry = isMovie ? 1 : releaseTotal;
    const entryType = release.category === "manga" ? "manga" : "anime";
    const genreMarker = `__format:${release.category}`;

    const entryData = {
      title: media.title,
      type: entryType,
      status,
      genre: genreMarker,
      release_id: release.release_id || null,
      season_mal_id: release.mal_id ?? null,
      total_episodes: release.category !== "manga" ? totalForEntry : 0,
      total_chapters: release.category === "manga" ? totalForEntry : 0,
      current_episode: 0,
      current_chapter: 0,
    };

    if (status === "completed") {
      const xpPerUnit = XP_REWARDS[cfg.xpKey];
      const xpEarned = totalForEntry > 0 ? totalForEntry * xpPerUnit : 0;
      const wType = release.category === "manga" ? "manga" : "anime";
      const bonusXp = wType === "manga" ? XP_REWARDS.manga_completed : XP_REWARDS.anime_completed;
      const totalXp = xpEarned + bonusXp;
      entryData.status = "completed";
      entryData.current_episode = release.category !== "manga" ? totalForEntry : 0;
      entryData.current_chapter = release.category === "manga" ? totalForEntry : 0;
      createMutation.mutate(entryData, {
        onSuccess: (created) => {
          grantXpEvent({ eventType: "anime_added", sourceType: "anime_entry", sourceId: created.id }).catch(() => {});
          grantEpisodeRange({ entryId: created.id, fromNum: 0, toNum: totalForEntry, eventType: cfg.xpKey }).catch(() => {});
          grantXpEvent({ eventType: "work_completed", sourceType: "anime_entry", sourceId: created.id }).catch(() => {});
          showToast(`✓ Concluído! +${totalXp} XP`, CheckCircle2, "bg-card border-chart-4/40 text-chart-4");
        },
      });
      return;
    }

    createMutation.mutate(entryData, {
      onSuccess: (created) => {
        grantXpEvent({ eventType: "anime_added", sourceType: "anime_entry", sourceId: created.id }).catch(() => {});
      },
    });
  }

  function handleStatusChange(newStatus) {
    if (!entry || isMutating) return;
    if (newStatus === "completed") {
      const resolvedTotal = Math.max(entry[cfg.totalKey] || 0, releaseTotal || 0, isMovie ? 1 : 0);
      const prev = entry[cfg.progressKey] || 0;
      const missing = resolvedTotal > 0 ? Math.max(0, resolvedTotal - prev) : 0;
      const xpPerUnit = XP_REWARDS[cfg.xpKey];
      const xpEarned = missing > 0 ? missing * xpPerUnit : 0;
      const wType = release.category === "manga" ? "manga" : "anime";
      const bonusXp = wType === "manga" ? XP_REWARDS.manga_completed : XP_REWARDS.anime_completed;
      const totalXp = xpEarned + bonusXp;
      const updates = {
        status: "completed",
        [cfg.progressKey]: resolvedTotal,
        [cfg.totalKey]: resolvedTotal,
      };
      updateMutation.mutate({ id: entry.id, data: updates }, {
        onSuccess: () => {
          grantEpisodeRange({ entryId: entry.id, fromNum: prev, toNum: resolvedTotal, eventType: cfg.xpKey }).catch(() => {});
          grantXpEvent({ eventType: "work_completed", sourceType: "anime_entry", sourceId: entry.id }).catch(() => {});
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
    const effectiveTotal = Math.max(entry[cfg.totalKey] || 0, releaseTotal);
    const current = entry[cfg.progressKey] || 0;
    if (effectiveTotal > 0 && current >= effectiveTotal) return;
    const v = validateProgress(current + 1, effectiveTotal > 0 ? effectiveTotal : null);
    if (!v.valid) return;
    const newVal = v.value;
    const updates = { [cfg.progressKey]: newVal };
    const willComplete = shouldAutoComplete(newVal, effectiveTotal, isAiring);
    if (willComplete) updates.status = "completed";
    const xpDelta = computeXpDelta(current, newVal, XP_REWARDS[cfg.xpKey]);
    const wType = release.category === "manga" ? "manga" : "anime";
    const epKey = cfg.xpKey === "chapter_read" ? "chapter" : "episode";
    updateMutation.mutate({ id: entry.id, data: updates }, {
      onSuccess: () => {
        grantXpEvent({ eventType: cfg.xpKey, sourceType: "anime_entry", sourceId: entry.id, unitNumber: newVal }).catch(() => {});
        if (willComplete) grantXpEvent({ eventType: "work_completed", sourceType: "anime_entry", sourceId: entry.id }).catch(() => {});
        showToast(`${cfg.unit} ${newVal}! +${xpDelta} XP`, Zap, "bg-card border-primary/30 text-primary");
      },
    });
  }

  function handleDecrement() {
    if (!entry || isMutating) return;
    const current = entry[cfg.progressKey] || 0;
    if (current <= 0) return;
    const effectiveTotal = Math.max(entry[cfg.totalKey] || 0, releaseTotal);
    const v = validateProgress(current - 1, effectiveTotal > 0 ? effectiveTotal : null);
    if (!v.valid) return;
    const updates = { [cfg.progressKey]: v.value };
    if (entry.status === "completed" && effectiveTotal > 0 && v.value < effectiveTotal) {
      updates.status = "watching";
    }
    updateMutation.mutate({ id: entry.id, data: updates });
  }

  function handleJumpTo(newVal) {
    if (!entry || isMutating) return;
    const prev = entry[cfg.progressKey] || 0;
    const effectiveTotal = Math.max(entry[cfg.totalKey] || 0, releaseTotal);
    const v = validateProgress(newVal, effectiveTotal > 0 ? effectiveTotal : null);
    if (!v.valid) return;
    const clamped = v.value;
    if (clamped === prev) return;
    const updates = { [cfg.progressKey]: clamped };
    const willComplete = shouldAutoComplete(clamped, effectiveTotal, isAiring);
    if (willComplete) updates.status = "completed";
    const xpDelta = computeXpDelta(prev, clamped, XP_REWARDS[cfg.xpKey]);
    const wType = release.category === "manga" ? "manga" : "anime";
    updateMutation.mutate({ id: entry.id, data: updates }, {
      onSuccess: () => {
        if (xpDelta > 0) {
          grantEpisodeRange({ entryId: entry.id, fromNum: prev, toNum: clamped, eventType: cfg.xpKey }).catch(() => {});
          showToast(`Progresso → ${cfg.unit} ${clamped}! +${xpDelta} XP`, Zap, "bg-card border-primary/30 text-primary");
        } else {
          showToast(`Progresso atualizado para ${cfg.unit} ${clamped}`, CheckCircle2, "bg-card border-primary/30 text-primary");
        }
        if (willComplete) grantXpEvent({ eventType: "work_completed", sourceType: "anime_entry", sourceId: entry.id }).catch(() => {});
      },
    });
  }

  const current = entry ? (entry[cfg.progressKey] || 0) : 0;
  const entryTotal = entry ? (entry[cfg.totalKey] || 0) : 0;
  const effectiveTotal = Math.max(entryTotal, releaseTotal);
  const total = entry ? effectiveTotal : releaseTotal;
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  const releaseLabel = buildReleaseLabel(release, media.title);
  const subtitle = buildReleaseSubtitle(release);
  const statusLabel = getReleaseStatusLabel(release);

  return (
    <>
      <div className={`rounded-xl border ${cfg.border} bg-card overflow-hidden`}>
        {/* Header */}
        <div className={`px-4 py-3 ${cfg.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`w-4 h-4 ${cfg.color} shrink-0`} />
            <span className={`font-semibold text-sm ${cfg.color} truncate`}>{releaseLabel}</span>
          </div>
          {statusLabel && (
            <Badge className={`text-[10px] border-none bg-card/80 ${cfg.color} shrink-0`}>{statusLabel}</Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Subtitle: format · episodes · year */}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}

          {/* Total */}
          {!isMovie && releaseTotal > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total de {cfg.unitLong}s</span>
              <span className="font-bold text-foreground">{releaseTotal}</span>
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
                        prefix={release.category === "manga" ? "CP" : "EP"}
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
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <span className="font-medium text-foreground">"{releaseLabel}"</span> da sua lista?
          </p>
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