import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Star, Zap, CheckCircle2, BookOpen, Tv, Film, ListPlus, Loader2, Clock } from "lucide-react";
import ProgressInput from "@/components/media/ProgressInput";
import { motion, AnimatePresence } from "framer-motion";
import { XP_REWARDS } from "@/lib/xpSystem";

const statusLabels = {
  watching: "Assistindo",
  reading: "Lendo",
  completed: "Concluído",
  planned: "Planejado",
  dropped: "Dropado",
  on_hold: "Pausado",
};

const statusColors = {
  watching: "text-primary",
  reading: "text-chart-2",
  completed: "text-chart-4",
  planned: "text-secondary-foreground",
  dropped: "text-destructive",
  on_hold: "text-chart-3",
};

function Toast({ message, icon: ToastIcon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm text-sm font-medium ${color}`}
    >
      <ToastIcon className="w-4 h-4 shrink-0" />
      {message}
    </motion.div>
  );
}

export default function MediaDrawer({ media, type, open, onClose }) {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const queryClient = useQueryClient();

  const isAnime = type === "anime";
  const isMovie = type === "movie";
  const isManga = type === "manga";

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries } = useQuery({
    queryKey: ["anime-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 200),
    initialData: [],
  });

  const myEntry = user && media && entries.find(
    (e) => e.created_by === user.email && e.title === media.title
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      showToast("Adicionado à sua lista!", ListPlus, "bg-card border-primary/40 text-primary");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnimeEntry.update(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      if (vars.data.status === "completed") {
        showToast("Marcado como Concluído! 🎉", CheckCircle2, "bg-card border-chart-4/40 text-chart-4");
      }
    },
  });

  function showToast(message, icon, color) {
    setToast({ message, icon, color });
    setTimeout(() => setToast(null), 3000);
  }

  function handleAddToList(status = "planned") {
    if (!user || !media) return;
    createMutation.mutate({
      title: media.title,
      type: isMovie ? "anime" : type, // store movies as anime type with 1 episode
      status,
      total_episodes: isAnime ? (media.totalEpisodes || 0) : isMovie ? 1 : 0,
      total_chapters: isManga ? (media.totalChapters || 0) : 0,
      current_episode: 0,
      current_chapter: 0,
    });
  }

  function handleStatusChange(newStatus) {
    if (!myEntry) return;
    updateMutation.mutate({ id: myEntry.id, data: { status: newStatus } });
    showToast(`Status: ${statusLabels[newStatus]}`, CheckCircle2, "bg-card border-primary/30 text-primary");
  }

  function handleIncrement() {
    if (!myEntry) return;
    const field = isManga ? "current_chapter" : "current_episode";
    const total = isManga ? (myEntry.total_chapters || 0) : (myEntry.total_episodes || 0);
    const current = isManga ? (myEntry.current_chapter || 0) : (myEntry.current_episode || 0);
    const newVal = current + 1;
    const updates = { [field]: newVal };
    if (total > 0 && newVal >= total) updates.status = "completed";
    updateMutation.mutate({ id: myEntry.id, data: updates });
    const label = isManga ? `Cap. ${newVal} lido!` : `Ep. ${newVal} assistido!`;
    const xp = isManga ? XP_REWARDS.chapter_read : XP_REWARDS.episode_watched;
    showToast(`${label} +${xp} XP`, Zap, "bg-card border-primary/30 text-primary");
  }

  function handleDecrement() {
    if (!myEntry) return;
    const field = isManga ? "current_chapter" : "current_episode";
    const current = isManga ? (myEntry.current_chapter || 0) : (myEntry.current_episode || 0);
    if (current <= 0) return;
    updateMutation.mutate({ id: myEntry.id, data: { [field]: current - 1 } });
  }

  function handleJumpTo(newVal) {
    if (!myEntry) return;
    const field = isManga ? "current_chapter" : "current_episode";
    const prev = isManga ? (myEntry.current_chapter || 0) : (myEntry.current_episode || 0);
    const totalVal = isManga ? (myEntry.total_chapters || 0) : (myEntry.total_episodes || 0);
    const updates = { [field]: newVal };
    if (totalVal > 0 && newVal >= totalVal) updates.status = "completed";
    updateMutation.mutate({ id: myEntry.id, data: updates });
    const diff = Math.max(0, newVal - prev);
    const xp = isManga ? XP_REWARDS.chapter_read : XP_REWARDS.episode_watched;
    const unit = isManga ? "Cap." : "Ep.";
    if (diff > 0) {
      showToast(`Progresso → ${unit} ${newVal}! +${diff * xp} XP`, Zap, "bg-card border-primary/30 text-primary");
    } else {
      showToast(`Progresso atualizado para ${unit} ${newVal}`, CheckCircle2, "bg-card border-primary/30 text-primary");
    }
  }

  const current = myEntry ? (isManga ? myEntry.current_chapter || 0 : myEntry.current_episode || 0) : 0;
  const total = myEntry
    ? (isManga ? myEntry.total_chapters || 0 : myEntry.total_episodes || 0)
    : (isManga ? media?.totalChapters || 0 : isAnime ? media?.totalEpisodes || 0 : isMovie ? 1 : 0);
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  // Display values
  const displayStatus = isMovie
    ? media?.movieStatus
    : isAnime ? media?.animeStatus : media?.mangaStatus;

  const TypeIcon = isAnime ? Tv : isManga ? BookOpen : Film;
  const typeLabel = isAnime ? "Anime" : isManga ? "Mangá" : "Filme";
  const typeColor = isAnime ? "text-chart-2" : isManga ? "text-chart-3" : "text-chart-5";

  const addStatuses = isAnime
    ? ["planned", "watching", "completed"]
    : isManga
    ? ["planned", "reading", "completed"]
    : ["planned", "completed"];

  if (!media) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border p-0 overflow-y-auto">
          {/* Cover */}
          <div className="relative h-64 overflow-hidden">
            <img src={media.cover} alt={media.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <div className="flex items-center gap-2 mb-1">
                <TypeIcon className={`w-4 h-4 ${typeColor}`} />
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{typeLabel}</span>
              </div>
              <h2 className="font-space font-bold text-xl text-foreground leading-tight">{media.title}</h2>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-chart-4">
                <Star className="w-4 h-4 fill-chart-4" />
                <span className="font-semibold">{media.rating}</span>
              </div>
              {media.genres?.slice(0, 3).map((g) => (
                <Badge key={g} variant="outline" className="text-[10px] border-border text-muted-foreground px-1.5 py-0">
                  {g}
                </Badge>
              ))}
            </div>

            {/* Info block */}
            <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
              {displayStatus && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge className={`text-[10px] border-none ${
                    displayStatus === "Em exibição" || displayStatus === "Em publicação"
                      ? "bg-primary/15 text-primary"
                      : displayStatus === "Hiato"
                      ? "bg-chart-4/15 text-chart-4"
                      : displayStatus === "Clássico"
                      ? "bg-chart-3/15 text-chart-3"
                      : "bg-secondary text-secondary-foreground"
                  }`}>
                    {displayStatus}
                  </Badge>
                </div>
              )}
              {isAnime && media.totalEpisodes > 0 && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total de Episódios</span>
                  <span className="text-xs font-bold text-foreground">{media.totalEpisodes} eps</span>
                </div>
              )}
              {isManga && media.totalChapters > 0 && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total de Capítulos</span>
                  <span className="text-xs font-bold text-foreground">{media.totalChapters} caps</span>
                </div>
              )}
              {isMovie && media.movieDuration && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duração
                  </span>
                  <span className="text-xs font-bold text-foreground">{media.movieDuration}</span>
                </div>
              )}
              {/* Show multiple categories if combined work */}
              {media.categories && media.categories.length > 1 && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Disponível como</span>
                  <div className="flex gap-1">
                    {media.categories.map(cat => (
                      <Badge key={cat} className="text-[9px] border-none bg-secondary text-secondary-foreground">
                        {cat === "anime" ? "Anime" : cat === "manga" ? "Mangá" : "Filme"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {!myEntry ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Adicionar à lista com status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {addStatuses.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      disabled={isMutating}
                      onClick={() => handleAddToList(s)}
                      className="text-xs border-border hover:border-primary/40 hover:text-primary"
                    >
                      {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : statusLabels[s]}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status selector */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Status atual</p>
                  <Select value={myEntry.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="bg-secondary border-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress — hide for movies */}
                {!isMovie && (
                  <div className="rounded-xl bg-secondary/50 border border-border px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {isManga ? "Capítulo atual" : "Episódio atual"}
                      </span>
                      <span className="font-bold text-foreground">
                        {current}{total > 0 ? ` / ${total}` : ""}
                      </span>
                    </div>
                    {total > 0 && (
                      <>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% concluído</p>
                      </>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 border-border hover:border-primary/40"
                          onClick={handleDecrement}
                          disabled={isMutating || current <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={handleIncrement}
                          disabled={isMutating}
                        >
                          {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                        <ProgressInput
                          current={current}
                          total={total}
                          prefix={isManga ? "CP" : "EP"}
                          onConfirm={handleJumpTo}
                          disabled={isMutating}
                        />
                      </div>
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        +{isManga ? XP_REWARDS.chapter_read : XP_REWARDS.episode_watched} XP
                      </span>
                    </div>
                  </div>
                )}

                {/* In list badge */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  <span>
                    Na sua lista como{" "}
                    <span className={`font-medium ${statusColors[myEntry.status] || "text-foreground"}`}>
                      {statusLabels[myEntry.status]}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AnimatePresence>
        {toast && <Toast {...toast} />}
      </AnimatePresence>
    </>
  );
}