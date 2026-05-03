import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { List, Plus, Tv, BookOpen, Star, Minus, Zap, Film } from "lucide-react";
import ProgressInput from "@/components/media/ProgressInput";
import { XP_REWARDS } from "@/lib/xpSystem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

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

function AddEntryDialog({ onAdd }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("anime");
  const [status, setStatus] = useState("watching");
  const [totalEpisodes, setTotalEpisodes] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title,
      type,
      status,
      total_episodes: type === "anime" ? parseInt(totalEpisodes) || 0 : 0,
      total_chapters: type === "manga" ? parseInt(totalEpisodes) || 0 : 0,
      current_episode: 0,
      current_chapter: 0,
      rating: 0,
    });
    setTitle("");
    setTotalEpisodes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-space">Adicionar à Lista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-none" />
          <div className="grid grid-cols-2 gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="manga">Mangá</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder={type === "anime" ? "Total de episódios" : "Total de capítulos"}
            type="number"
            value={totalEpisodes}
            onChange={(e) => setTotalEpisodes(e.target.value)}
            className="bg-secondary border-none"
          />
          <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Adicionar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EntryCard({ entry, onUpdate }) {
  // Support __format: marker from ObraProfile
  const formatFromGenre = entry.genre?.startsWith("__format:") ? entry.genre.replace("__format:", "") : null;
  const isMovie = formatFromGenre === "movie";
  const isAnime = isMovie ? false : (formatFromGenre === "anime" || entry.type === "anime");
  const current = isAnime ? entry.current_episode || 0 : entry.current_chapter || 0;
  const total = isAnime ? entry.total_episodes || 0 : entry.total_chapters || 0;
  const progress = total > 0 ? (current / total) * 100 : 0;

  const increment = () => {
    const field = isAnime ? "current_episode" : "current_chapter";
    const newVal = current + 1;
    const updates = { [field]: newVal };
    if (total > 0 && newVal >= total) updates.status = "completed";
    onUpdate(entry.id, updates);
  };

  const decrement = () => {
    if (current <= 0) return;
    const field = isAnime ? "current_episode" : "current_chapter";
    onUpdate(entry.id, { [field]: current - 1 });
  };

  const jumpTo = (newVal) => {
    const field = isAnime ? "current_episode" : "current_chapter";
    const updates = { [field]: newVal };
    if (total > 0 && newVal >= total) updates.status = "completed";
    onUpdate(entry.id, updates);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isMovie ? <Film className="w-4 h-4 text-chart-5" /> : isAnime ? <Tv className="w-4 h-4 text-chart-2" /> : <BookOpen className="w-4 h-4 text-chart-3" />}
          <h3 className="font-semibold text-sm text-foreground">{entry.title}</h3>
        </div>
        <Badge variant="outline" className={`text-[10px] ${statusColors[entry.status] || ""}`}>
          {statusLabels[entry.status]}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isAnime ? "Episódio" : "Capítulo"}</span>
          <span className="font-medium text-foreground">{current}{total > 0 ? ` / ${total}` : ""}</span>
        </div>
        {total > 0 && <Progress value={progress} className="h-1.5" />}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={decrement}>
              <Minus className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:text-primary hover:bg-primary/10"
              onClick={increment}
              title={`+${isAnime ? XP_REWARDS.episode_watched : XP_REWARDS.chapter_read} XP`}
            >
              <Plus className="w-3 h-3" />
            </Button>
            {!isMovie && (
              <ProgressInput
                current={current}
                total={total}
                prefix={isAnime ? "EP" : "CP"}
                onConfirm={jumpTo}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-primary/70 flex items-center gap-0.5 font-medium">
              <Zap className="w-2.5 h-2.5" />
              +{isAnime ? XP_REWARDS.episode_watched : XP_REWARDS.chapter_read} XP
            </span>
            {entry.rating > 0 && (
              <div className="flex items-center gap-1 text-xs text-chart-4">
                <Star className="w-3 h-3 fill-chart-4" /> {entry.rating}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyList() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["anime-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 100),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnimeEntry.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anime-entries"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnimeEntry.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anime-entries"] }),
  });

  const myEntries = entries.filter((e) => e.created_by === user?.email);

  const getFiltered = (status) => {
    if (status === "all") return myEntries;
    return myEntries.filter((e) => e.status === status);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <List className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Minha Lista</h1>
            <p className="text-sm text-muted-foreground">{myEntries.length} títulos</p>
          </div>
        </div>
        <AddEntryDialog onAdd={createMutation.mutate} />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="watching">Assistindo</TabsTrigger>
          <TabsTrigger value="reading">Lendo</TabsTrigger>
          <TabsTrigger value="completed">Concluído</TabsTrigger>
          <TabsTrigger value="planned">Planejado</TabsTrigger>
          <TabsTrigger value="on_hold">Pausado</TabsTrigger>
        </TabsList>

        {["all", "watching", "reading", "completed", "planned", "on_hold"].map((status) => (
          <TabsContent key={status} value={status}>
            {getFiltered(status).length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <p className="text-muted-foreground text-sm">
                  Nenhum título {status !== "all" ? `com status "${statusLabels[status]}"` : "na lista"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFiltered(status).map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}