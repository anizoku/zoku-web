import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2, Eye, Pencil, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ImageUploadField from "./ImageUploadField";
import {
  newsCategoryOptions, slugify, computeReadingMinutes,
} from "@/lib/news";

const emptyForm = () => ({
  title: "",
  summary: "",
  content: "",
  category: "general",
  author_name: "ZOKU",
  published_at: new Date().toISOString().slice(0, 16),
  is_featured: false,
  status: "rascunho",
  banner_image_url: "",
  card_image_url: "",
  article_image_url: "",
  sources: [{ name: "", url: "" }],
});

function toLocalInput(iso) {
  if (!iso) return new Date().toISOString().slice(0, 16);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

async function generateUniqueSlug(title) {
  const base = slugify(title) || `noticia-${Date.now()}`;
  const existing = await base44.entities.News.filter({ slug: base }, "-created_date", 5);
  if (existing.length === 0) return base;
  let i = 2;
  while (i < 1000) {
    const candidate = `${base}-${i}`;
    const dup = await base44.entities.News.filter({ slug: candidate }, "-created_date", 1);
    if (dup.length === 0) return candidate;
    i++;
  }
  return `${base}-${Date.now()}`;
}

export default function NewsEditor({ open, onClose, news = null }) {
  const isEdit = !!news;
  const [form, setForm] = useState(emptyForm());
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (news) {
      // Migra source_name/source_url legados para sources[] se vazio
      let srcs = Array.isArray(news.sources) && news.sources.length > 0
        ? news.sources.map(s => ({ name: s.name || "", url: s.url || "" }))
        : [];
      if (srcs.length === 0 && (news.source_name || news.source_url)) {
        srcs = [{ name: news.source_name || "", url: news.source_url || "" }];
      }
      if (srcs.length === 0) srcs = [{ name: "", url: "" }];
      setForm({
        title: news.title || "",
        summary: news.summary || "",
        content: news.content || "",
        category: news.category || "general",
        author_name: news.author_name || "ZOKU",
        published_at: toLocalInput(news.published_at),
        is_featured: !!news.is_featured,
        status: news.status || "rascunho",
        banner_image_url: news.banner_image_url || "",
        card_image_url: news.card_image_url || "",
        article_image_url: news.article_image_url || "",
        sources: srcs,
      });
    } else {
      setForm(emptyForm());
    }
    setError("");
    setPreviewMode(false);
  }, [open, news]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setSource = (idx, field, val) => {
    setForm(f => ({
      ...f,
      sources: f.sources.map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    }));
  };
  const addSource = () => setForm(f => ({ ...f, sources: [...f.sources, { name: "", url: "" }] }));
  const removeSource = (idx) => setForm(f => ({ ...f, sources: f.sources.filter((_, i) => i !== idx) }));

  const previewSlug = isEdit ? (news.slug || slugify(form.title)) : slugify(form.title);

  const missingImages =
    form.status === "publicado" &&
    (!form.banner_image_url || !form.card_image_url || !form.article_image_url);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Título é obrigatório.");
      if (form.status === "publicado" && !form.summary.trim() && !form.content.trim()) {
        throw new Error("Para publicar, preencha o resumo ou o conteúdo.");
      }

      const sourcesArr = form.sources
        .filter(s => (s.name && s.name.trim()) || (s.url && s.url.trim()))
        .map(s => ({ name: (s.name || "").trim(), url: (s.url || "").trim() }));

      let slug = news?.slug;
      if (!slug) slug = await generateUniqueSlug(form.title);

      const reading_minutes = computeReadingMinutes(form.content);

      const payload = {
        title: form.title.trim(),
        slug,
        summary: form.summary.trim(),
        content: form.content,
        category: form.category,
        author_name: form.author_name.trim() || "ZOKU",
        published_at: form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString(),
        is_featured: form.is_featured,
        status: form.status,
        banner_image_url: form.banner_image_url,
        card_image_url: form.card_image_url,
        article_image_url: form.article_image_url,
        image_url: form.card_image_url || form.banner_image_url || form.article_image_url || "",
        sources: sourcesArr,
        source_name: sourcesArr[0]?.name || "",
        source_url: sourcesArr[0]?.url || "",
        reading_minutes,
      };

      if (news) return base44.entities.News.update(news.id, payload);
      return base44.entities.News.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      queryClient.invalidateQueries({ queryKey: ["news-detail"] });
      queryClient.invalidateQueries({ queryKey: ["home-news"] });
      queryClient.invalidateQueries({ queryKey: ["featured-news"] });
      queryClient.invalidateQueries({ queryKey: ["hero-carousel-news"] });
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      onClose();
    },
    onError: (err) => setError(err.message || "Erro ao salvar."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-space flex items-center gap-2">
            {isEdit ? <><Pencil className="w-4 h-4" /> Editar Notícia</> : <><Plus className="w-4 h-4" /> Criar Notícia</>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Título *</label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Digite o título da notícia..."
              className="bg-secondary border-none"
            />
            {previewSlug && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Slug: <code className="text-primary">/noticias/{previewSlug}</code>
              </p>
            )}
          </div>

          {/* Categoria + Status + Destaque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground font-medium mb-1 block">Categoria *</label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {newsCategoryOptions.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-foreground font-medium mb-1 block">Status</label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground font-medium mb-1 block">Autor</label>
              <Input value={form.author_name} onChange={(e) => set("author_name", e.target.value)} className="bg-secondary border-none" />
            </div>
            <div>
              <label className="text-xs text-foreground font-medium mb-1 block">Data de publicação</label>
              <Input type="datetime-local" value={form.published_at} onChange={(e) => set("published_at", e.target.value)} className="bg-secondary border-none" />
            </div>
          </div>

          <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
            <div>
              <label className="text-xs text-foreground font-medium block">Notícia em destaque (carrossel da home)</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Aparece no carrossel principal se publicada + com banner</p>
            </div>
            <Switch checked={form.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
          </div>

          {/* Resumo */}
          <div>
            <label className="text-xs text-foreground font-medium mb-1 block">Resumo</label>
            <Textarea
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="Resumo curto exibido nos cards..."
              className="bg-secondary border-none resize-none h-16 text-sm"
            />
          </div>

          {/* Conteúdo com preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-foreground font-medium">Conteúdo (Markdown)</label>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setPreviewMode(p => !p)}>
                <Eye className="w-3 h-3" /> {previewMode ? "Escrever" : "Pré-visualizar"}
              </Button>
            </div>
            {previewMode ? (
              <div className="bg-secondary/40 rounded-lg p-3 min-h-[160px] prose prose-sm prose-invert max-w-none text-sm">
                <ReactMarkdown>{form.content || "*Nada para pré-visualizar*"}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="Escreva a matéria completa em markdown..."
                className="bg-secondary border-none resize-y min-h-[160px] text-sm font-mono"
              />
            )}
          </div>

          {/* Fontes */}
          <div>
            <label className="text-xs text-foreground font-medium mb-2 block">Fontes</label>
            <div className="space-y-2">
              {form.sources.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="Nome da fonte"
                    value={s.name}
                    onChange={(e) => setSource(idx, "name", e.target.value)}
                    className="bg-secondary border-none text-xs h-8 flex-1"
                  />
                  <Input
                    placeholder="https://..."
                    value={s.url}
                    onChange={(e) => setSource(idx, "url", e.target.value)}
                    className="bg-secondary border-none text-xs h-8 flex-1"
                  />
                  <Button variant="ghost" size="sm" className="h-8 text-destructive/70 px-2" onClick={() => removeSource(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addSource}>
                <Plus className="w-3 h-3" /> Adicionar fonte
              </Button>
            </div>
          </div>

          {/* Imagens */}
          <div className="space-y-4 pt-2 border-t border-border">
            <ImageUploadField
              label="Imagem de Banner (carrossel principal da home)"
              hint="Recomendado 2400×1000 px, proporção ~2.4:1. O carrossel é responsivo (16:9 mobile, 21:6 desktop) e corta a imagem — mantenha o elemento principal centralizado/acima do meio; evite texto/rostos nas bordas."
              value={form.banner_image_url}
              onChange={(v) => set("banner_image_url", v)}
              minW={2400}
              minH={1000}
            />
            <ImageUploadField
              label="Imagem de Card (lista de notícias)"
              hint="Recomendado 1200×675 px, 16:9."
              value={form.card_image_url}
              onChange={(v) => set("card_image_url", v)}
              minW={1200}
              minH={675}
            />
            <ImageUploadField
              label="Imagem da Notícia aberta (topo do artigo + compartilhamento)"
              hint="Recomendado 1200×630 px, 1.91:1. Usada também como og:image."
              value={form.article_image_url}
              onChange={(v) => set("article_image_url", v)}
              minW={1200}
              minH={630}
            />
          </div>

          {missingImages && (
            <div className="flex items-start gap-2 text-xs text-chart-4 bg-chart-4/10 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Recomendamos preencher as 3 imagens antes de publicar para melhor exibição em todos os contextos.</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Salvar alterações" : "Criar notícia"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}