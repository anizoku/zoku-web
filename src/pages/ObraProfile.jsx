import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBySlug } from "@/lib/catalog";
import { XP_REWARDS } from "@/lib/xpSystem";
import { getTMDBWorkDetails } from "@/lib/tmdb";
import { ArrowLeft, Star, Tv, BookOpen, Film, Plus, Minus, Zap, CheckCircle2, ListPlus, Loader2, Users, Trash2 } from "lucide-react";
import ProgressInput from "@/components/media/ProgressInput";
import TMDBDetails from "@/components/media/TMDBDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { getMyFriends } from "@/lib/social";

const FORMAT_CONFIG = {
  series: {
    label: "Série",
    icon: Film,
    color: "text-chart-1",
    bg: "bg-chart-1/10",
    border: "border-chart-1/30",
    statusKey: "seriesStatus",
    progressKey: "current_episode",
    totalKey: "total_episodes",
    catalogTotalKey: "seriesSeasons",
    catalogStatusKey: "seriesStatus",
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
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnimeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
      showToast("Obra removida da sua lista.", Trash2, "bg-card border-destructive/30 text-destructive");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      onMutate?.();
    },
  });

  function showToast(msg, icon, color) {
    setToast({ message: msg, icon, color });
    setTimeout(() => setToast(null), 2500);
  }

  function handleAdd(status) {
    if (!user) return;
    // Upsert: if an entry already exists for this title+format, update instead of creating
    if (entry) {
      updateMutation.mutate({ id: entry.id, data: { status } });
      showToast(`Status: ${STATUS_LABELS[status]}`, CheckCircle2, "bg-card border-primary/30 text-primary");
      return;
    }
    // Also check for entries without the format marker (created via MyList or MediaDrawer)
    const genericEntry = user ? entries.find(
      (e) => e.created_by === user.email && e.title === media.title && !e.genre?.startsWith("__format:")
    ) : null;
    if (genericEntry) {
      updateMutation.mutate({ id: genericEntry.id, data: { status, genre: formatMarker } });
      showToast(`Status: ${STATUS_LABELS[status]}`, CheckCircle2, "bg-card border-primary/30 text-primary");
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

  function handleStatusChange(newStatus) {
    if (!entry) return;
    updateMutation.mutate({ id: entry.id, data: { status: newStatus } });
    showToast(`Status: ${STATUS_LABELS[newStatus]}`, CheckCircle2, "bg-card border-primary/30 text-primary");
  }

  function handleIncrement() {
    if (!entry) return;
    const field = cfg.progressKey;
    const total = entry[cfg.totalKey] || 0;
    const current = entry[field] || 0;
    const newVal = current + 1;
    const updates = { [field]: newVal };
    if (total > 0 && newVal >= total) updates.status = "completed";
    updateMutation.mutate({ id: entry.id, data: updates });
    const xp = XP_REWARDS[cfg.xpKey];
    showToast(`${cfg.unit} ${newVal}! +${xp} XP`, Zap, "bg-card border-primary/30 text-primary");
  }

  function handleDecrement() {
    if (!entry) return;
    const field = cfg.progressKey;
    const current = entry[field] || 0;
    if (current <= 0) return;
    updateMutation.mutate({ id: entry.id, data: { [field]: current - 1 } });
  }

  function handleJumpTo(newVal) {
    if (!entry) return;
    const field = cfg.progressKey;
    const prev = entry[field] || 0;
    if (newVal === prev) return;
    const totalVal = entry[cfg.totalKey] || 0;
    const updates = { [field]: newVal };
    if (totalVal > 0 && newVal >= totalVal) updates.status = "completed";
    updateMutation.mutate({ id: entry.id, data: updates });
    const diff = Math.max(0, newVal - prev);
    const xp = XP_REWARDS[cfg.xpKey];
    if (diff > 0) {
      showToast(`Progresso → ${cfg.unit} ${newVal}! +${diff * xp} XP`, Zap, "bg-card border-primary/30 text-primary");
    } else {
      showToast(`Progresso atualizado para ${cfg.unit} ${newVal}`, CheckCircle2, "bg-card border-primary/30 text-primary");
    }
  }

  const current = entry ? (entry[cfg.progressKey] || 0) : 0;
  const total = entry ? (entry[cfg.totalKey] || 0) : catalogTotal;
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const isMutating = createMutation.isPending || updateMutation.isPending;
  const catalogStatus = media[cfg.catalogStatusKey];
  const isMovie = format === "movie";

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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8 border-border" onClick={handleDecrement} disabled={isMutating || current <= 0}>
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" className={`h-8 w-8 ${cfg.bg} ${cfg.color} border ${cfg.border} hover:opacity-80`} onClick={handleIncrement} disabled={isMutating}>
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
  const { slug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [tmdbData, setTmdbData] = useState(null);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState(null);

  // Read ?tipo= from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo");
    if (tipo) setActiveTab(tipo);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const media = getBySlug(slug);

  // Fetch TMDB data — skip manga-only works
  useEffect(() => {
    if (!media) return;
    const isMangaOnly = media.categories.length === 1 && media.categories[0] === "manga";
    if (isMangaOnly) return;
    const type = media.categories.includes("movie") && !media.categories.includes("anime") ? "movie" : "tv";
    setTmdbLoading(true);
    setTmdbError(null);
    getTMDBWorkDetails(media.title, type)
      .then(setTmdbData)
      .catch((e) => setTmdbError(e.message))
      .finally(() => setTmdbLoading(false));
  }, [media?.slug]);

  function handleTMDBRefresh() {
    if (!media) return;
    const type = media.categories.includes("movie") && !media.categories.includes("anime") ? "movie" : "tv";
    setTmdbLoading(true);
    setTmdbError(null);
    getTMDBWorkDetails(media.title, type)
      .then(setTmdbData)
      .catch((e) => setTmdbError("Não foi possível atualizar os dados pelo TMDB agora. Tente novamente mais tarde."))
      .finally(() => setTmdbLoading(false));
  }

  const { data: entries, refetch } = useQuery({
    queryKey: ["anime-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 200),
    initialData: [],
  });

  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: () => base44.entities.Friendship.list("-created_date", 200),
    initialData: [],
  });

  const { data: allEntries } = useQuery({
    queryKey: ["all-entries-public"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 500),
    initialData: [],
  });

  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 200),
    initialData: [],
  });

  if (!media) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Obra não encontrada.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const formats = media.categories || [];
  const activeFormat = activeTab || formats[0];

  // Friends watching/reading this work
  const myFriends = user ? getMyFriends(friendships, user.email) : [];
  const friendsWithWork = myFriends.filter(f => {
    return allEntries.some(e => e.created_by === f.email && e.title === media.title);
  }).map(f => {
    const fEntry = allEntries.find(e => e.created_by === f.email && e.title === media.title);
    const profile = profiles.find(p => p.user_email === f.email);
    return { ...f, entry: fEntry, profile };
  });

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
    return { label: f, icon: Tv, color: "text-foreground" };
  };

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
                  const { label, icon: FIcon, color } = formatTabLabel(f);
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
                      <FIcon className="w-3 h-3" /> {label}
                    </button>
                  );
                })}
              </div>
              <h1 className="font-space font-bold text-2xl sm:text-3xl text-foreground leading-tight">{media.title}</h1>
              {tmdbData?.originalTitle && tmdbData.originalTitle !== media.title && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{tmdbData.originalTitle}</p>
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

      {/* Format blocks */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {formats.map(f => (
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

      {/* TMDB Details: overview, cast, seasons, trailer, where to watch */}
      {tmdbLoading && (
        <div className="flex items-center gap-2 py-6 justify-center mb-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Buscando dados no TMDB...</span>
        </div>
      )}
      {tmdbError && !tmdbLoading && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <p className="text-xs text-destructive">{tmdbError}</p>
        </div>
      )}
      {!tmdbLoading && tmdbData && (
        <div className="mb-6">
          <TMDBDetails
            data={tmdbData}
            onUpdate={handleTMDBRefresh}
            updating={tmdbLoading}
          />
        </div>
      )}

      {/* Friends watching */}
      {friendsWithWork.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Amigos acompanhando</h2>
          </div>
          <div className="space-y-2">
            {friendsWithWork.map(f => {
              const isAnimeEntry = f.entry?.type === "anime";
              const current = isAnimeEntry ? f.entry?.current_episode : f.entry?.current_chapter;
              const total = isAnimeEntry ? f.entry?.total_episodes : f.entry?.total_chapters;
              return (
                <div key={f.email} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                    {f.profile?.avatar_url
                      ? <img src={f.profile.avatar_url} alt={f.name} className="w-full h-full object-cover" />
                      : <span className="text-primary">{(f.name || "A")[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{f.name || f.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {STATUS_LABELS[f.entry?.status] || f.entry?.status}
                      {current > 0 && ` · ${isAnimeEntry ? "Ep." : "Cap."} ${current}${total > 0 ? `/${total}` : ""}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}