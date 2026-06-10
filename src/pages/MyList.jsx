import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { List, Plus, Search, SortAsc, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EntryCard from "@/components/mylist/EntryCard";

// ── Constantes ────────────────────────────────────────────────
const STATUS_LABELS = {
  watching: "Assistindo", reading: "Lendo", completed: "Concluído",
  planned: "Planejado", dropped: "Dropado", on_hold: "Pausado",
};

const TABS = [
  { value: "all", label: "Todos" },
  { value: "watching", label: "Assistindo" },
  { value: "reading", label: "Lendo" },
  { value: "completed", label: "Concluído" },
  { value: "planned", label: "Planejado" },
  { value: "on_hold", label: "Pausado" },
];

const SORT_OPTIONS = [
  { value: "title_az", label: "Nome A–Z" },
  { value: "updated_desc", label: "Recém atualizado" },
  { value: "progress_desc", label: "Mais progresso" },
  { value: "status", label: "Por status" },
];

// ── Helpers ───────────────────────────────────────────────────
function getMediaType(entry) {
  const fmt = entry.genre?.startsWith("__format:") ? entry.genre.replace("__format:", "") : null;
  if (fmt === "movie" || entry.type === "movie") return "movie";
  if (fmt === "liveaction") return "liveaction";
  if (fmt === "manga" || entry.type === "manga") return "manga";
  return "anime";
}

function getProgress(entry) {
  const mediaType = getMediaType(entry);
  const isAnime = mediaType === "anime" || mediaType === "liveaction";
  const current = isAnime ? (entry.current_episode || 0) : (entry.current_chapter || 0);
  const total = isAnime ? (entry.total_episodes || 0) : (entry.total_chapters || 0);
  return total > 0 ? current / total : 0;
}

function filterEntries(entries, status, search) {
  let result = status === "all" ? entries : entries.filter(e => e.status === status);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      getMediaType(e).includes(q) ||
      ["anime", "mangá", "manga", "filme", "movie", "live-action", "liveaction"].some(t => t.includes(q) && getMediaType(e).includes(q.replace("mangá","manga").replace("filme","movie").replace("live-action","liveaction")))
    );
  }
  return result;
}

function sortEntries(entries, sort) {
  const statusOrder = { watching: 0, reading: 1, on_hold: 2, planned: 3, completed: 4, dropped: 5 };
  return [...entries].sort((a, b) => {
    if (sort === "title_az") return a.title.localeCompare(b.title, "pt-BR");
    if (sort === "updated_desc") return new Date(b.updated_date) - new Date(a.updated_date);
    if (sort === "progress_desc") return getProgress(b) - getProgress(a);
    if (sort === "status") return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

// ── Deduplication (same as before) ───────────────────────────
function deduplicateEntries(rawEntries) {
  return Object.values(
    rawEntries.reduce((acc, entry) => {
      const key = `${entry.title}__${entry.genre || ""}`;
      const existing = acc[key];
      if (!existing || new Date(entry.updated_date) > new Date(existing.updated_date)) {
        acc[key] = entry;
      }
      return acc;
    }, {})
  );
}

// ── AddEntryDialog (preserved from original) ─────────────────
function AddEntryDialog({ onAdd, existingTitles = [] }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("anime");
  const [status, setStatus] = useState("watching");
  const [totalCount, setTotalCount] = useState("");
  const [open, setOpen] = useState(false);

  const isDuplicate = title.trim() && existingTitles.some(t => t.toLowerCase() === title.trim().toLowerCase());

  function handleSubmit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      type,
      status,
      total_episodes: type === "anime" ? parseInt(totalCount) || 0 : 0,
      total_chapters: type === "manga" ? parseInt(totalCount) || 0 : 0,
      current_episode: 0,
      current_chapter: 0,
      rating: 0,
    });
    setTitle("");
    setTotalCount("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Adicionar título
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-space">Adicionar à Lista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Input
              placeholder="Título"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-secondary border-none"
            />
            {isDuplicate && (
              <p className="text-xs text-yellow-400 mt-1">Esta obra já está na lista — o status será atualizado.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="manga">Mangá</SelectItem>
                <SelectItem value="movie">Filme</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder={type === "anime" ? "Total de episódios" : "Total de capítulos"}
            type="number"
            value={totalCount}
            onChange={e => setTotalCount(e.target.value)}
            className="bg-secondary border-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isDuplicate ? "Atualizar Status" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ isSearch, statusLabel }) {
  if (isSearch) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground text-sm">Nenhum resultado encontrado para a busca.</p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-xl border border-border p-12 text-center">
      <List className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
      <p className="text-muted-foreground text-sm">
        {statusLabel ? `Nenhuma obra com status "${statusLabel}"` : "Sua lista está vazia. Adicione obras para começar!"}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function MyList() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("title_az");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["anime-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("title", 100),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnimeEntry.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anime-entries"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-entries"] });
    },
  });

  const [removedToast, setRemovedToast] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnimeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anime-entries"] });
      setRemovedToast(true);
      setTimeout(() => setRemovedToast(false), 2500);
    },
  });

  // Deduplicate raw entries for this user
  const myEntriesRaw = entries.filter(e => e.created_by === user?.email);
  const myEntries = deduplicateEntries(myEntriesRaw);

  // Clean up duplicates in background (same logic as before)
  useEffect(() => {
    if (!user?.email || myEntriesRaw.length === 0) return;
    const groups = myEntriesRaw.reduce((acc, entry) => {
      const key = `${entry.title}__${entry.genre || ""}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});
    Object.values(groups).forEach((group) => {
      if (group.length <= 1) return;
      const sorted = [...group].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
      sorted.slice(1).forEach((dup) => {
        base44.entities.AnimeEntry.delete(dup.id)
          .then(() => queryClient.invalidateQueries({ queryKey: ["anime-entries"] }))
          .catch(() => {});
      });
    });
  }, [user?.email, myEntriesRaw.length]);

  // Counters per status for tab badges
  const counts = useMemo(() => {
    const result = { all: myEntries.length };
    TABS.slice(1).forEach(t => {
      result[t.value] = myEntries.filter(e => e.status === t.value).length;
    });
    return result;
  }, [myEntries]);

  const existingTitles = myEntries.map(e => e.title);

  function handleAdd(data) {
    const existing = myEntriesRaw.find(
      e => e.title.toLowerCase() === data.title.toLowerCase() && !e.genre?.startsWith("__format:")
    );
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: { status: data.status } });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleUpdate(id, data) {
    updateMutation.mutate({ id, data });
  }

  function handleRemove(id) {
    deleteMutation.mutate(id);
  }

  function getTabEntries(status) {
    const filtered = filterEntries(myEntries, status, search);
    return sortEntries(filtered, sort);
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <List className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Minha Lista</h1>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-3 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <List className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Minha Lista</h1>
            <p className="text-sm text-muted-foreground">{myEntries.length} títulos</p>
          </div>
        </div>
        <AddEntryDialog onAdd={handleAdd} existingTitles={existingTitles} />
      </div>

      {/* Busca + ordenação */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na minha lista..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="bg-secondary border-none w-auto gap-2 shrink-0">
            <SortAsc className="w-4 h-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs com contadores */}
      <Tabs defaultValue="all">
        <TabsList className="bg-secondary mb-5 flex-wrap h-auto gap-1">
          {TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.label}
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 h-4 border-border/50 bg-transparent font-semibold"
              >
                {counts[tab.value] || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(tab => {
          const tabEntries = getTabEntries(tab.value);
          return (
            <TabsContent key={tab.value} value={tab.value}>
              {tabEntries.length === 0 ? (
                <EmptyState isSearch={!!search} statusLabel={tab.value !== "all" ? tab.label : null} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tabEntries.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Toast de remoção */}
      {removedToast && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 bg-card shadow-2xl text-sm font-medium text-destructive">
          Obra removida da sua lista.
        </div>
      )}
    </div>
  );
}