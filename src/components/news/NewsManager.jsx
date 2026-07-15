import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Loader2, ImageOff, Star } from "lucide-react";
import NewsEditor from "./NewsEditor";
import { categoryLabels, formatDatePT } from "@/lib/news";

export default function NewsManager() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["admin-news"],
    queryFn: () => base44.entities.News.list("-published_at", 200),
  });

  const sorted = [...news].sort((a, b) => {
    const da = new Date(a.published_at || a.created_date).getTime();
    const db = new Date(b.published_at || b.created_date).getTime();
    return sortDir === "desc" ? db - da : da - db;
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, patch }) => base44.entities.News.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-news"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.News.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
      queryClient.invalidateQueries({ queryKey: ["home-news"] });
      queryClient.invalidateQueries({ queryKey: ["featured-news"] });
      queryClient.invalidateQueries({ queryKey: ["hero-carousel-news"] });
      setDeleteId(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(n) {
    setEditing(n);
    setEditorOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{news.length} notícia(s) no total</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
            {sortDir === "desc" ? "Mais recentes" : "Mais antigas"}
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground gap-1" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Criar Notícia
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-sm text-muted-foreground">
          Nenhuma notícia cadastrada.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((n) => (
            <div key={n.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
                {n.card_image_url || n.image_url ? (
                  <img src={n.card_image_url || n.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {categoryLabels[n.category] || "Geral"}
                  </Badge>
                  <span className={`text-[10px] font-medium ${n.status === "publicado" ? "text-primary" : "text-muted-foreground"}`}>
                    {n.status === "publicado" ? "Publicado" : "Rascunho"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDatePT(n.published_at || n.created_date)}
                  </span>
                </div>
              </div>

              {/* toggle destaque */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <Star className={`w-3.5 h-3.5 ${n.is_featured ? "text-chart-4 fill-chart-4" : "text-muted-foreground/40"}`} />
                <Switch
                  checked={!!n.is_featured}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: n.id, patch: { is_featured: v } })}
                />
              </div>

              {/* toggle status */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <span className="text-[9px] text-muted-foreground">Pub</span>
                <Switch
                  checked={n.status === "publicado"}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: n.id, patch: { status: v ? "publicado" : "rascunho" } })}
                />
              </div>

              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEdit(n)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive/70" onClick={() => setDeleteId(n)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewsEditor open={editorOpen} onClose={() => setEditorOpen(false)} news={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir notícia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A notícia "{deleteId?.title}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteId?.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}