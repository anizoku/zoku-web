import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tv, BookOpen, Film, Clapperboard, Plus, X, Loader2 } from "lucide-react";

const categories = [
  { key: "anime", label: "Anime", icon: Tv, color: "text-chart-2" },
  { key: "manga", label: "Mangá", icon: BookOpen, color: "text-chart-3" },
  { key: "movie", label: "Filme", icon: Film, color: "text-chart-5" },
  { key: "liveaction", label: "Live-Action", icon: Clapperboard, color: "text-chart-1" },
];

export default function AdminMediaManager() {
  const [activeCategory, setActiveCategory] = useState("anime");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["admin-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-created_date", 500),
    initialData: [],
  });

  const addMutation = useMutation({
    mutationFn: async (title) => {
      return base44.entities.AnimeEntry.create({
        title,
        type: activeCategory === "manga" ? "manga" : "anime",
        status: "planned",
        current_episode: 0,
        current_chapter: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entries"] });
      setNewTitle("");
      setAddDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnimeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entries"] });
    },
  });

  const filteredEntries = entries.filter(e => {
    if (activeCategory === "anime") return e.type === "anime";
    if (activeCategory === "manga") return e.type === "manga";
    return false;
  });

  const handleAdd = () => {
    if (newTitle.trim()) {
      setLoading(true);
      addMutation.mutate(newTitle.trim());
      setLoading(false);
    }
  };

  const category = categories.find(c => c.key === activeCategory);
  const Icon = category?.icon;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="mb-4">
        <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
          {Icon && <Icon className={`w-5 h-5 ${category.color}`} />}
          Gerenciar Obras
        </h2>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="bg-secondary gap-1 flex-wrap h-auto">
          {categories.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key} className="gap-1">
              <cat.icon className="w-3.5 h-3.5" /> {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.key} value={cat.key} className="mt-4 space-y-3">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder={`Adicionar ${cat.label.toLowerCase()}...`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAdd()}
                className="bg-secondary border-border"
              />
              <Button
                onClick={handleAdd}
                disabled={!newTitle.trim() || loading}
                className="gap-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Nenhum {cat.label.toLowerCase()} adicionado</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-secondary/40 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{entry.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.current_episode || entry.current_chapter || 0} / {entry.total_episodes || entry.total_chapters || "?"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => deleteMutation.mutate(entry.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}