import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import ImageUploadField from "@/components/news/ImageUploadField";
import { Loader2, Trash2, ChevronUp, ChevronDown, Plus, ImageOff } from "lucide-react";

/**
 * Painel admin de Arte de Fãs (FanArt). CRUD completo: adicionar, editar
 * título/obra/artista/redes, ativar/desativar, reordenar, excluir.
 * Artes ativas aparecem embaralhadas na faixa da home.
 */
export default function FanArtPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    image_url: "",
    title: "",
    work_slug: "",
    work_title: "",
    artist_name: "",
    artist_instagram: "",
    artist_twitter: "",
    artist_website: "",
  });

  const { data: arts = [], isLoading } = useQuery({
    queryKey: ["fanart-admin"],
    queryFn: () => base44.entities.FanArt.list("order", 200),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["fanart-admin"] });
    queryClient.invalidateQueries({ queryKey: ["fanart-active"] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FanArt.create(data),
    onSuccess: () => {
      invalidate();
      setForm({
        image_url: "", title: "", work_slug: "", work_title: "",
        artist_name: "", artist_instagram: "", artist_twitter: "", artist_website: "",
      });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FanArt.update(id, data),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FanArt.delete(id),
    onSuccess: invalidate,
  });
  const moveMutation = useMutation({
    mutationFn: async ({ a, b }) => {
      await base44.entities.FanArt.update(a.id, { order: b.order ?? 0 });
      await base44.entities.FanArt.update(b.id, { order: a.order ?? 0 });
    },
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    if (!form.image_url) return;
    const baseOrder = arts.length ? Math.max(...arts.map((a) => a.order || 0)) + 1 : 0;
    createMutation.mutate({ ...form, active: true, order: baseOrder });
  };

  const sorted = [...arts].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-space font-semibold text-lg text-foreground">Arte de Fãs</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Artes ativas aparecem embaralhadas na faixa da home. Vincule a uma obra (slug) para tornar o card clicável.
        </p>
      </div>

      {/* Nova arte */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Adicionar arte</h4>
        <ImageUploadField
          label="Imagem da arte"
          hint="Recomendado: retrato 4:5, pelo menos 800px de altura."
          value={form.image_url}
          onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Título da arte</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Cena favorita"
              className="bg-secondary border-none"
            />
          </div>
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Artista</label>
            <Input
              value={form.artist_name}
              onChange={(e) => setForm((f) => ({ ...f, artist_name: e.target.value }))}
              placeholder="Nome do artista"
              className="bg-secondary border-none"
            />
          </div>
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Slug da obra (opcional)</label>
            <Input
              value={form.work_slug}
              onChange={(e) => setForm((f) => ({ ...f, work_slug: e.target.value }))}
              placeholder="ex: attack-on-titan"
              className="bg-secondary border-none"
            />
          </div>
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Título da obra (opcional)</label>
            <Input
              value={form.work_title}
              onChange={(e) => setForm((f) => ({ ...f, work_title: e.target.value }))}
              placeholder="Para referência no admin"
              className="bg-secondary border-none"
            />
          </div>
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Instagram (handle ou URL)</label>
            <Input
              value={form.artist_instagram}
              onChange={(e) => setForm((f) => ({ ...f, artist_instagram: e.target.value }))}
              placeholder="@artist ou https://instagram.com/artist"
              className="bg-secondary border-none"
            />
          </div>
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Twitter/X (handle ou URL)</label>
            <Input
              value={form.artist_twitter}
              onChange={(e) => setForm((f) => ({ ...f, artist_twitter: e.target.value }))}
              placeholder="@artist ou https://twitter.com/artist"
              className="bg-secondary border-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-foreground font-medium mb-1 block">Site/portfólio (URL)</label>
            <Input
              value={form.artist_website}
              onChange={(e) => setForm((f) => ({ ...f, artist_website: e.target.value }))}
              placeholder="https://meuportfolio.com"
              className="bg-secondary border-none"
            />
          </div>
        </div>
        <Button className="gap-2" onClick={handleAdd} disabled={!form.image_url || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar arte
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          Nenhuma arte cadastrada ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((a, idx) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-32 aspect-[4/5] bg-secondary rounded-lg overflow-hidden shrink-0">
                {a.image_url ? (
                  <img src={a.image_url} alt={a.title || "fan art"} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                {!a.active && (
                  <span className="absolute top-1.5 right-1.5 bg-destructive/80 text-[10px] text-destructive-foreground px-1.5 py-0.5 rounded">
                    Inativo
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    defaultValue={a.title || ""}
                    placeholder="Título da arte"
                    onBlur={(e) => {
                      if (e.target.value !== (a.title || "")) updateMutation.mutate({ id: a.id, data: { title: e.target.value } });
                    }}
                    className="bg-secondary border-none h-8 text-sm"
                  />
                  <Input
                    defaultValue={a.artist_name || ""}
                    placeholder="Artista"
                    onBlur={(e) => {
                      if (e.target.value !== (a.artist_name || "")) updateMutation.mutate({ id: a.id, data: { artist_name: e.target.value } });
                    }}
                    className="bg-secondary border-none h-8 text-sm"
                  />
                  <Input
                    defaultValue={a.work_slug || ""}
                    placeholder="Slug da obra"
                    onBlur={(e) => {
                      if (e.target.value !== (a.work_slug || "")) updateMutation.mutate({ id: a.id, data: { work_slug: e.target.value } });
                    }}
                    className="bg-secondary border-none h-8 text-sm"
                  />
                  <Input
                    defaultValue={a.work_title || ""}
                    placeholder="Título da obra"
                    onBlur={(e) => {
                      if (e.target.value !== (a.work_title || "")) updateMutation.mutate({ id: a.id, data: { work_title: e.target.value } });
                    }}
                    className="bg-secondary border-none h-8 text-sm"
                  />
                  <Input
                    defaultValue={a.artist_instagram || ""}
                    placeholder="Instagram"
                    onBlur={(e) => {
                      if (e.target.value !== (a.artist_instagram || "")) updateMutation.mutate({ id: a.id, data: { artist_instagram: e.target.value } });
                    }}
                    className="bg-secondary border-none h-8 text-sm"
                  />
                  <Input
                    defaultValue={a.artist_twitter || ""}
                    placeholder="Twitter/X"
                    onBlur={(e) => {
                      if (e.target.value !== (a.artist_twitter || "")) updateMutation.mutate({ id: a.id, data: { artist_twitter: e.target.value } });
                    }}
                    className="bg-secondary border-none h-8 text-sm"
                  />
                  <Input
                    defaultValue={a.artist_website || ""}
                    placeholder="Site"
                    onBlur={(e) => {
                      if (e.target.value !== (a.artist_website || "")) updateMutation.mutate({ id: a.id, data: { artist_website: e.target.value } });
                    }}
                    className="bg-secondary border-none h-8 text-sm sm:col-span-2"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                  Ativo
                  <Switch
                    checked={!!a.active}
                    onCheckedChange={(v) => updateMutation.mutate({ id: a.id, data: { active: v } })}
                    aria-label={`Ativar arte de ${a.artist_name || "artista"}`}
                  />
                </label>
              </div>

              <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-1 shrink-0">
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === 0 || moveMutation.isPending}
                    onClick={() => moveMutation.mutate({ a: sorted[idx], b: sorted[idx - 1] })}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === sorted.length - 1 || moveMutation.isPending}
                    onClick={() => moveMutation.mutate({ a: sorted[idx], b: sorted[idx + 1] })}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/70 hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm("Excluir esta arte?")) deleteMutation.mutate(a.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}