import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tv, BookOpen, Film, Clapperboard, Plus, X, Loader2, Image, Settings } from "lucide-react";

const categories = [
  { key: "anime", label: "Anime", icon: Tv, color: "text-chart-2" },
  { key: "manga", label: "Mangá", icon: BookOpen, color: "text-chart-3" },
  { key: "movie", label: "Filme", icon: Film, color: "text-chart-5" },
  { key: "liveaction", label: "Live-Action", icon: Clapperboard, color: "text-chart-1" },
];

function WorkCard({ work, onEdit, onDelete, isDeleting }) {
  return (
    <div className="bg-secondary/40 rounded-lg border border-border p-3">
      <div className="flex gap-3">
        {work.cover_url && (
          <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
            <img src={work.cover_url} alt={work.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{work.title}</p>
          {work.genres?.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{work.genres.join(", ")}</p>
          )}
          {work.rating > 0 && (
            <p className="text-xs text-chart-4 mt-1">⭐ {work.rating}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(work)}>
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader>
                <DialogTitle>Editar "{work.title}"</DialogTitle>
              </DialogHeader>
              <EditWorkDialog work={work} />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(work.id)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditWorkDialog({ work }) {
  const [coverFile, setCoverFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleCoverUpload = async () => {
    if (!coverFile) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: coverFile });
    await base44.entities.MediaWork.update(work.id, { cover_url: file_url });
    queryClient.invalidateQueries({ queryKey: ["media-works"] });
    setCoverFile(null);
    setLoading(false);
  };

  const handleBannerUpload = async () => {
    if (!bannerFile) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: bannerFile });
    await base44.entities.MediaWork.update(work.id, { banner_url: file_url });
    queryClient.invalidateQueries({ queryKey: ["media-works"] });
    setBannerFile(null);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Foto/Cover */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Foto da Obra</label>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0])}
            disabled={loading}
            className="text-xs"
          />
          <Button
            size="sm"
            onClick={handleCoverUpload}
            disabled={!coverFile || loading}
            className="flex-shrink-0"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Upload"}
          </Button>
        </div>
        {work.cover_url && (
          <img src={work.cover_url} alt="cover" className="w-16 h-20 object-cover rounded mt-2" />
        )}
      </div>

      {/* Banner */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Banner</label>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0])}
            disabled={loading}
            className="text-xs"
          />
          <Button
            size="sm"
            onClick={handleBannerUpload}
            disabled={!bannerFile || loading}
            className="flex-shrink-0"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Upload"}
          </Button>
        </div>
        {work.banner_url && (
          <img src={work.banner_url} alt="banner" className="w-32 h-12 object-cover rounded mt-2" />
        )}
      </div>
    </div>
  );
}

export default function CatalogManager() {
  const [activeCategory, setActiveCategory] = useState("anime");
  const [newTitle, setNewTitle] = useState("");
  const queryClient = useQueryClient();

  const { data: works } = useQuery({
    queryKey: ["media-works"],
    queryFn: () => base44.entities.MediaWork.list("-created_date", 500),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MediaWork.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-works"] });
      setNewTitle("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaWork.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-works"] });
    },
  });

  const filteredWorks = works.filter(w => w.category === activeCategory);
  const category = categories.find(c => c.key === activeCategory);
  const Icon = category?.icon;

  const handleAdd = () => {
    if (newTitle.trim()) {
      createMutation.mutate({
        title: newTitle.trim(),
        category: activeCategory,
      });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${category.color}`} />}
            Gerenciar Catálogo
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Adicione, edite fotos/banners ou remova obras</p>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="bg-secondary gap-1 flex-wrap h-auto mb-4">
          {categories.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key} className="gap-1 text-xs">
              <cat.icon className="w-3.5 h-3.5" /> {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.key} value={cat.key} className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={`Adicionar ${cat.label.toLowerCase()}...`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAdd()}
                className="bg-secondary border-border text-sm"
              />
              <Button
                onClick={handleAdd}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="gap-1 flex-shrink-0"
                size="sm"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>

            {filteredWorks.length === 0 ? (
              <div className="text-center py-8 rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground text-sm">Nenhum {cat.label.toLowerCase()} no catálogo</p>
              </div>
            ) : (
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {filteredWorks.map(work => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    isDeleting={deleteMutation.isPending}
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