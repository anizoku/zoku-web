import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Minus, Star, Zap, CheckCircle2, BookOpen, Tv, ListPlus, Loader2
} from "lucide-react";
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
  watching: "bg-primary/15 text-primary border-primary/20",
  reading: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  completed: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  planned: "bg-secondary text-secondary-foreground border-border",
  dropped: "bg-destructive/15 text-destructive border-destructive/20",
  on_hold: "bg-chart-3/15 text-chart-3 border-chart-3/20",
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

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries } = useQuery({
    queryKey: ["anime-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 200),
    initialData: [],
  });

  const myEntry = user && entries.find(
    (e) => e.created_by === user.email && e.title === media?.title && e.type === type
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
      type,
      status,
      total_episodes: isAnime ? (media.totalEpisodes || 0) : 0,
      total_chapters: !isAnime ? (media.totalChapters || 0) : 0,
      current_episode: 0,
      current_chapter: 0,
    });
  }

  function handleStatusChange(newStatus) {
    if (!myEntry) return;
    updateMutation.mutate({ id: myEntry.id, data: { status: newStatus } });
    const label = statusLabels[newStatus];
    showToast(`Status: ${label}`, CheckCircle2, "bg-card border-primary/30 text-primary");
  }

  function handleIncrement() {
    if (!myEntry) return;
    const field = isAnime ? "current_episode" : "current_chapter";
    const total = isAnime ? (myEntry.total_episodes || 0) : (myEntry.total_chapters || 0);
    const current = isAnime ? (myEntry.current_episode || 0) : (myEntry.current_chapter || 0);
    const newVal = current + 1;
    const updates = { [field]: newVal };
    const justCompleted = total > 0 && newVal >= total;
    if (justCompleted) updates.status = "completed";
    updateMutation.mutate({ id: myEntry.id, data: updates });
    const label = isAnime ? `Ep. ${newVal} assistido!` : `Cap. ${newVal} lido!`;
    const xp = isAnime ? XP_REWARDS.episode_watched : XP_REWARDS.chapter_read;
    showToast(`${label} +${xp} XP`, Zap, "bg-card border-primary/30 text-primary");
  }

  function handleDecrement() {
    if (!myEntry) return;
    const field = isAnime ? "current_episode" : "current_chapter";
    const current = isAnime ? (myEntry.current_episode || 0) : (myEntry.current_chapter || 0);
    if (current <= 0) return;
    updateMutation.mutate({ id: myEntry.id, data: { [field]: current - 1 } });
  }

  const current = myEntry ? (isAnime ? myEntry.current_episode || 0 : myEntry.current_chapter || 0) : 0;
  const total = myEntry ? (isAnime ? myEntry.total_episodes || 0 : myEntry.total_chapters || 0) : (isAnime ? media?.totalEpisodes || 0 : media?.totalChapters || 0);
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const isMutating = createMutation.isPending || updateMutation.isPending;

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
                {isAnime
                  ? <Tv className="w-4 h-4 text-chart-2" />
                  : <BookOpen className="w-4 h-4 text-chart-3" />
                }
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {isAnime ? "Anime" : "Mangá"}
                </span>
              </div>
              <h2 className="font-space font-bold text-xl text-foreground leading-tight">{media.title}</h2>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-chart-4">
                <Star className="w-4 h-4 fill-chart-4" />
                <span className="font-semibold">{media.rating}</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                {media.genre}
              </Badge>
              <Badge className={`text-[10px] border-none ${
                media.status === "Em exibição" || media.status === "Em publicação"
                  ? "bg-primary/15 text-primary"
                  : media.status === "Hiato"
                  ? "bg-chart-4/15 text-chart-4"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {media.status}
              </Badge>
            </div>

            {/* Total counter */}
            <div className="rounded-xl bg-secondary/50 border border-border px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total de {isAnime ? "Episódios" : "Capítulos"}
              </span>
              <span className="font-bold text-foreground text-sm">
                {isAnime ? media.episodesLabel : media.chaptersLabel}
              </span>
            </div>

            {/* Actions */}
            {!myEntry ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Adicionar à lista com status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {(isAnime
                    ? ["planned", "watching", "completed"]
                    : ["planned", "reading", "completed"]
                  ).map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      disabled={isMutating}
                      onClick={() => handleAddToList(s)}
                      className={`text-xs border-border hover:border-primary/40 hover:text-primary ${
                        s === "planned" ? "col-span-1" : ""
                      }`}
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

                {/* Progress */}
                <div className="rounded-xl bg-secondary/50 border border-border px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isAnime ? "Episódio atual" : "Capítulo atual"}
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
                    <div className="flex items-center gap-2">
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
                    </div>
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      +{isAnime ? XP_REWARDS.episode_watched : XP_REWARDS.chapter_read} XP por {isAnime ? "ep." : "cap."}
                    </span>
                  </div>
                </div>

                {/* In list badge */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  <span>Na sua lista como <span className={`font-medium ${statusColors[myEntry.status]?.split(" ")[1] || "text-foreground"}`}>{statusLabels[myEntry.status]}</span></span>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast {...toast} />}
      </AnimatePresence>
    </>
  );
}