import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCatalog } from "@/contexts/CatalogContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import ImageUploadField from "@/components/news/ImageUploadField";
import WorkPicker from "./WorkPicker";
import {
  Loader2, Trash2, ChevronUp, ChevronDown, Plus, ImageOff,
  Pencil, Check, X, Search,
} from "lucide-react";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "active", label: "Ativas" },
  { key: "inactive", label: "Inativas" },
  { key: "noWork", label: "Sem obra" },
];

/**
 * Painel admin de Arte de Fãs (FanArt). Curadoria editorial pelo admin.
 *
 * UX:
 * - Resumo compacto no topo (total, ativas, inativas, sem obra)
 * - Formulário de nova arte organizado em seções
 * - Lista como cards compactos com expand-on-edit
 * - Filtros + busca local
 * - Feedback via toast e save state
 */
export default function FanArtPanel() {
  const queryClient = useQueryClient();
  const { catalog } = useCatalog();

  const [form, setForm] = useState({
    image_url: "", title: "", work_slug: "", work_title: "",
    artist_name: "", artist_instagram: "", artist_twitter: "", artist_website: "",
    source_url: "", credit_notes: "",
  });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saveState, setSaveState] = useState({}); // { [id]: "saving" | "saved" }

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
        source_url: "", credit_notes: "",
      });
      toast({ title: "Arte adicionada com sucesso." });
    },
    onError: () => {
      toast({
        title: "Erro ao criar arte",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FanArt.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FanArt.delete(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Arte excluída da galeria." });
    },
    onError: () => {
      toast({ title: "Erro ao excluir arte", description: "Tente novamente.", variant: "destructive" });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ a, b }) => {
      await base44.entities.FanArt.update(a.id, { order: b.order ?? 0 });
      await base44.entities.FanArt.update(b.id, { order: a.order ?? 0 });
    },
    onSuccess: invalidate,
    onError: () => {
      toast({ title: "Erro ao reordenar", description: "Tente novamente.", variant: "destructive" });
    },
  });

  // Stats
  const stats = useMemo(() => ({
    total: arts.length,
    active: arts.filter((a) => a.active).length,
    inactive: arts.filter((a) => !a.active).length,
    noWork: arts.filter((a) => !a.work_slug).length,
  }), [arts]);

  const sorted = useMemo(
    () => [...arts].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [arts]
  );

  const filtered = useMemo(() => {
    let result = sorted;
    if (filter === "active") result = result.filter((a) => a.active);
    else if (filter === "inactive") result = result.filter((a) => !a.active);
    else if (filter === "noWork") result = result.filter((a) => !a.work_slug);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((a) =>
        a.title?.toLowerCase().includes(q) ||
        a.artist_name?.toLowerCase().includes(q) ||
        a.work_title?.toLowerCase().includes(q) ||
        a.work_slug?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sorted, filter, search]);

  const canAdd = form.image_url && form.artist_name.trim();

  const handleAdd = () => {
    if (!canAdd) return;
    const baseOrder = arts.length ? Math.max(...arts.map((a) => a.order || 0)) + 1 : 0;
    createMutation.mutate({ ...form, active: true, order: baseOrder });
  };

  const handleUpdate = (id, data) => {
    setSaveState((s) => ({ ...s, [id]: "saving" }));
    updateMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          setSaveState((s) => ({ ...s, [id]: "saved" }));
          setTimeout(() => setSaveState((s) => ({ ...s, [id]: undefined })), 2000);
        },
        onError: () => {
          setSaveState((s) => ({ ...s, [id]: undefined }));
          toast({ title: "Erro ao atualizar", description: "Tente novamente.", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (art) => {
    if (confirm("Excluir esta arte de fã?\nEsta ação remove o registro da galeria.")) {
      deleteMutation.mutate(art.id);
    }
  };

  const resolveWorkPoster = (slug) => {
    if (!slug) return null;
    const w = catalog.find((w) => w.slug === slug);
    return w?.franchise_poster_url || null;
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-space font-semibold text-lg text-foreground">Arte de Fãs</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Artes ativas aparecem embaralhadas na faixa da home. Vincule a uma obra do catálogo para tornar o card clicável.
        </p>
      </div>

      {/* Resumo */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground bg-card border border-border rounded-lg px-4 py-2.5">
        <span className="font-medium text-foreground">{stats.total} artes</span>
        <span>· {stats.active} ativas</span>
        <span>· {stats.inactive} inativas</span>
        <span>· {stats.noWork} sem obra</span>
      </div>

      {/* Formulário de nova arte */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h4 className="text-sm font-semibold text-foreground">Adicionar arte</h4>

        {/* IMAGEM */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Imagem</span>
          <div className="flex gap-4">
            <ImageUploadField
              label="Imagem da arte"
              hint="Recomendado: retrato 4:5, pelo menos 800px de altura."
              value={form.image_url}
              onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
            />
            {form.image_url && (
              <div className="relative w-28 aspect-[4/5] rounded-lg overflow-hidden bg-secondary shrink-0 border border-border">
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-background/80 text-[9px] text-muted-foreground px-1 rounded">
                  4:5
                </span>
              </div>
            )}
          </div>
        </div>

        {/* INFORMAÇÕES */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Informações</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-foreground font-medium mb-1 block">Título da arte</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Cena favorita"
                className="bg-secondary border-none"
              />
            </div>
            <div>
              <Label className="text-xs text-foreground font-medium mb-1 block">Artista *</Label>
              <Input
                value={form.artist_name}
                onChange={(e) => setForm((f) => ({ ...f, artist_name: e.target.value }))}
                placeholder="Nome do artista (obrigatório)"
                className="bg-secondary border-none"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-foreground font-medium mb-1 block">Obra relacionada (opcional)</Label>
              <WorkPicker
                value={{ work_slug: form.work_slug, work_title: form.work_title }}
                onChange={(v) => setForm((f) => ({ ...f, work_slug: v.work_slug, work_title: v.work_title }))}
              />
            </div>
          </div>
        </div>

        {/* CRÉDITOS */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Créditos</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-foreground font-medium mb-1 block">Instagram (handle ou URL)</Label>
              <Input
                value={form.artist_instagram}
                onChange={(e) => setForm((f) => ({ ...f, artist_instagram: e.target.value }))}
                placeholder="@artist ou https://instagram.com/artist"
                className="bg-secondary border-none"
              />
            </div>
            <div>
              <Label className="text-xs text-foreground font-medium mb-1 block">Twitter/X (handle ou URL)</Label>
              <Input
                value={form.artist_twitter}
                onChange={(e) => setForm((f) => ({ ...f, artist_twitter: e.target.value }))}
                placeholder="@artist ou https://twitter.com/artist"
                className="bg-secondary border-none"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-foreground font-medium mb-1 block">Site/portfólio (URL)</Label>
              <Input
                value={form.artist_website}
                onChange={(e) => setForm((f) => ({ ...f, artist_website: e.target.value }))}
                placeholder="https://meuportfolio.com"
                className="bg-secondary border-none"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-foreground font-medium mb-1 block">URL de origem (opcional)</Label>
              <Input
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                placeholder="https://origem-da-arte.com/post"
                className="bg-secondary border-none"
              />
            </div>
          </div>
        </div>

        {/* INTERNO */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Interno (admin only)
          </span>
          <Input
            value={form.credit_notes}
            onChange={(e) => setForm((f) => ({ ...f, credit_notes: e.target.value }))}
            placeholder="Observação sobre crédito/permissão"
            className="bg-secondary border-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button className="gap-2" onClick={handleAdd} disabled={!canAdd || createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar arte
          </Button>
          {!canAdd && (
            <p className="text-xs text-muted-foreground">
              Imagem e nome do artista são obrigatórios.
            </p>
          )}
        </div>
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, artista ou obra..."
            className="bg-card border-border pl-9 h-9"
          />
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {arts.length === 0 ? "Nenhuma arte cadastrada ainda." : "Nenhuma arte corresponde ao filtro."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const idx = sorted.findIndex((s) => s.id === a.id);
            const isEditing = editingId === a.id;
            const poster = resolveWorkPoster(a.work_slug);

            if (isEditing) {
              return (
                <div key={a.id} className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
                  {/* Header do edit */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-14 rounded overflow-hidden bg-secondary shrink-0">
                        {a.image_url ? (
                          <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground">Editando</span>
                      {saveState[a.id] === "saving" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                        </span>
                      )}
                      {saveState[a.id] === "saved" && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Check className="w-3 h-3" /> Salvo
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      className="gap-1"
                    >
                      <X className="w-4 h-4" /> Fechar
                    </Button>
                  </div>

                  {/* Campos editáveis */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      defaultValue={a.title || ""}
                      placeholder="Título da arte"
                      onBlur={(e) => {
                        if (e.target.value !== (a.title || "")) handleUpdate(a.id, { title: e.target.value });
                      }}
                      className="bg-secondary border-none h-8 text-sm"
                    />
                    <Input
                      defaultValue={a.artist_name || ""}
                      placeholder="Artista"
                      onBlur={(e) => {
                        if (e.target.value !== (a.artist_name || "")) handleUpdate(a.id, { artist_name: e.target.value });
                      }}
                      className="bg-secondary border-none h-8 text-sm"
                    />
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-muted-foreground block mb-1">Obra relacionada</span>
                      <WorkPicker
                        value={{ work_slug: a.work_slug, work_title: a.work_title }}
                        onChange={(v) => handleUpdate(a.id, v)}
                      />
                    </div>
                    <Input
                      defaultValue={a.artist_instagram || ""}
                      placeholder="Instagram"
                      onBlur={(e) => {
                        if (e.target.value !== (a.artist_instagram || "")) handleUpdate(a.id, { artist_instagram: e.target.value });
                      }}
                      className="bg-secondary border-none h-8 text-sm"
                    />
                    <Input
                      defaultValue={a.artist_twitter || ""}
                      placeholder="Twitter/X"
                      onBlur={(e) => {
                        if (e.target.value !== (a.artist_twitter || "")) handleUpdate(a.id, { artist_twitter: e.target.value });
                      }}
                      className="bg-secondary border-none h-8 text-sm"
                    />
                    <Input
                      defaultValue={a.artist_website || ""}
                      placeholder="Site"
                      onBlur={(e) => {
                        if (e.target.value !== (a.artist_website || "")) handleUpdate(a.id, { artist_website: e.target.value });
                      }}
                      className="bg-secondary border-none h-8 text-sm sm:col-span-2"
                    />
                    <Input
                      defaultValue={a.source_url || ""}
                      placeholder="URL de origem"
                      onBlur={(e) => {
                        if (e.target.value !== (a.source_url || "")) handleUpdate(a.id, { source_url: e.target.value });
                      }}
                      className="bg-secondary border-none h-8 text-sm sm:col-span-2"
                    />
                    <Input
                      defaultValue={a.credit_notes || ""}
                      placeholder="Notas de crédito (interno)"
                      onBlur={(e) => {
                        if (e.target.value !== (a.credit_notes || "")) handleUpdate(a.id, { credit_notes: e.target.value });
                      }}
                      className="bg-secondary border-none h-8 text-sm sm:col-span-2"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                    Ativo
                    <Switch
                      checked={!!a.active}
                      onCheckedChange={(v) => handleUpdate(a.id, { active: v })}
                      aria-label={`Ativar arte de ${a.artist_name || "artista"}`}
                    />
                  </label>
                </div>
              );
            }

            // Card compacto
            return (
              <div
                key={a.id}
                className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative w-14 aspect-[4/5] rounded-lg overflow-hidden bg-secondary shrink-0">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.title || "fan art"} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {a.title || "Sem título"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    por {a.artist_name || "—"}
                  </p>
                  {a.work_slug ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      {poster && (
                        <img src={poster} alt="" className="w-3.5 h-5 rounded object-cover shrink-0" />
                      )}
                      <span className="text-xs text-primary truncate">
                        {a.work_title || a.work_slug}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Sem obra vinculada</p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    a.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {a.active ? "ATIVA" : "INATIVA"}
                </span>

                {/* Ações */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="text-[9px] text-muted-foreground/50 hidden lg:block mr-1">Ordem Admin</span>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingId(a.id)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/70 hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(a)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}