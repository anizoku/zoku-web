import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import ImageUploadField from "@/components/news/ImageUploadField";
import { Loader2, Trash2, ChevronUp, ChevronDown, Plus, ExternalLink, ImageOff } from "lucide-react";

/**
 * Faixa horizontal de banners (PlatformBanner) exibida na home.
 * CRUD completo: adicionar, editar título/link, ativar/desativar, reordenar, excluir.
 */
export default function PlatformBannersSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ image_url: "", title: "", link_url: "" });

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["platform-banners-admin"],
    queryFn: () => base44.entities.PlatformBanner.list("order", 200),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-banners-admin"] });
    queryClient.invalidateQueries({ queryKey: ["platform-banners"] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlatformBanner.create(data),
    onSuccess: () => {
      invalidate();
      setForm({ image_url: "", title: "", link_url: "" });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlatformBanner.update(id, data),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlatformBanner.delete(id),
    onSuccess: invalidate,
  });
  const moveMutation = useMutation({
    mutationFn: async ({ a, b }) => {
      await base44.entities.PlatformBanner.update(a.id, { order: b.order ?? 0 });
      await base44.entities.PlatformBanner.update(b.id, { order: a.order ?? 0 });
    },
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    if (!form.image_url) return;
    const baseOrder = banners.length ? Math.max(...banners.map((b) => b.order || 0)) + 1 : 0;
    createMutation.mutate({
      image_url: form.image_url,
      title: form.title,
      link_url: form.link_url,
      active: true,
      order: baseOrder,
    });
  };

  const sorted = [...banners].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-space font-semibold text-lg text-foreground">Faixa de Banners</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Banners ativos aparecem na home, na ordem definida. Defina um link de destino opcional.
        </p>
      </div>

      {/* Novo banner */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Adicionar banner</h4>
        <ImageUploadField
          label="Imagem do banner"
          hint="Recomendado: 16:9, pelo menos 800px de largura."
          value={form.image_url}
          onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Título</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Promoção de verão"
              className="bg-secondary border-none"
            />
          </div>
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Link (opcional)</label>
            <Input
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              placeholder="https://..."
              className="bg-secondary border-none"
            />
          </div>
        </div>
        <Button className="gap-2" onClick={handleAdd} disabled={!form.image_url || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar banner
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          Nenhum banner cadastrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((b, idx) => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-48 aspect-video bg-secondary rounded-lg overflow-hidden shrink-0">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title || "banner"} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                {!b.active && (
                  <span className="absolute top-1.5 right-1.5 bg-destructive/80 text-[10px] text-destructive-foreground px-1.5 py-0.5 rounded">
                    Inativo
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <Input
                  defaultValue={b.title || ""}
                  placeholder="Título"
                  onBlur={(e) => {
                    if (e.target.value !== (b.title || "")) {
                      updateMutation.mutate({ id: b.id, data: { title: e.target.value } });
                    }
                  }}
                  className="bg-secondary border-none h-8 text-sm"
                />
                <Input
                  defaultValue={b.link_url || ""}
                  placeholder="Link (opcional)"
                  onBlur={(e) => {
                    if (e.target.value !== (b.link_url || "")) {
                      updateMutation.mutate({ id: b.id, data: { link_url: e.target.value } });
                    }
                  }}
                  className="bg-secondary border-none h-8 text-sm"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {b.link_url && (
                    <a
                      href={b.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Abrir link
                    </a>
                  )}
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                    Ativo
                    <Switch
                      checked={!!b.active}
                      onCheckedChange={(v) => updateMutation.mutate({ id: b.id, data: { active: v } })}
                    />
                  </label>
                </div>
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
                    if (confirm("Excluir este banner?")) deleteMutation.mutate(b.id);
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