import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ImageOff, RotateCcw, Save, Tv, BookOpen, Film, Clapperboard, X, Upload } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "anime",      label: "Anime",       Icon: Tv,          color: "text-chart-2" },
  { key: "manga",      label: "Mangá",       Icon: BookOpen,    color: "text-chart-3" },
  { key: "movie",      label: "Filme",       Icon: Film,        color: "text-chart-5" },
  { key: "liveaction", label: "Live-Action", Icon: Clapperboard, color: "text-chart-1" },
];

function CategoryImageBlock({ catKey, label, Icon, color, overrideRecord, item, onSaved }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentImage = overrideRecord?.override_image_url || null;
  const originalImage = overrideRecord?.original_snapshot?.cover || item?.cover || null;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!imageFile) return;
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

      const payload = {
        card_slug: item.slug,
        category: catKey,
        override_image_url: file_url,
        override_title: overrideRecord?.override_title || null,
        override_description: overrideRecord?.override_description || null,
        is_manual_override: true,
        sync_disabled: true,
        edited_by: user.email,
        edited_by_name: user.full_name || user.email,
        edited_at: new Date().toISOString(),
        original_snapshot: overrideRecord?.original_snapshot || { title: item.title, cover: item.cover },
      };

      if (overrideRecord?.id) {
        await base44.entities.CardOverride.update(overrideRecord.id, payload);
      } else {
        await base44.entities.CardOverride.create(payload);
      }

      qc.invalidateQueries({ queryKey: ["card-overrides"] });
      toast.success(`Imagem de ${label} salva!`);
      setPreviewUrl(null);
      setImageFile(null);
      onSaved?.();
    } catch {
      toast.error("Erro ao salvar imagem.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveImage() {
    if (!overrideRecord?.id) return;
    setLoading(true);
    try {
      await base44.entities.CardOverride.update(overrideRecord.id, { override_image_url: null });
      qc.invalidateQueries({ queryKey: ["card-overrides"] });
      toast.success(`Imagem de ${label} removida.`);
      setPreviewUrl(null);
      setImageFile(null);
    } catch {
      toast.error("Erro ao remover imagem.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreOriginal() {
    if (!overrideRecord?.id) { setConfirmDelete(false); return; }
    setLoading(true);
    try {
      // If only image was set (no title/description), delete the whole record
      const hasOtherData = overrideRecord.override_title || overrideRecord.override_description;
      if (hasOtherData) {
        await base44.entities.CardOverride.update(overrideRecord.id, { override_image_url: null });
      } else {
        await base44.entities.CardOverride.delete(overrideRecord.id);
      }
      qc.invalidateQueries({ queryKey: ["card-overrides"] });
      toast.success(`Imagem original de ${label} restaurada.`);
      setConfirmDelete(false);
      setPreviewUrl(null);
      setImageFile(null);
    } catch {
      toast.error("Erro ao restaurar.");
    } finally {
      setLoading(false);
    }
  }

  const displayImage = previewUrl || currentImage;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className={`flex items-center gap-2 text-xs font-semibold ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>

      <div className="flex gap-3 items-start">
        {/* Thumbnail */}
        <div className="w-14 h-18 flex-shrink-0 rounded overflow-hidden border border-border bg-secondary flex items-center justify-center" style={{ height: '4.5rem' }}>
          {displayImage
            ? <img src={displayImage} alt={label} className="w-full h-full object-cover" />
            : <ImageOff className="w-4 h-4 text-muted-foreground/40" />
          }
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-1.5">
          {previewUrl ? (
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" onClick={handleUpload} disabled={loading} className="h-7 text-xs gap-1">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setPreviewUrl(null); setImageFile(null); }} className="h-7 text-xs">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="h-7 text-xs gap-1">
                <Upload className="w-3 h-3" />
                {currentImage ? "Trocar" : "Adicionar"}
              </Button>
              {currentImage && (
                <>
                  <Button size="sm" variant="ghost" onClick={handleRemoveImage} disabled={loading} className="h-7 text-xs text-muted-foreground hover:text-destructive">
                    Remover
                  </Button>
                  {confirmDelete ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="destructive" onClick={handleRestoreOriginal} disabled={loading} className="h-7 text-xs">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="h-7 text-xs">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="h-7 text-xs text-muted-foreground gap-1">
                      <RotateCcw className="w-3 h-3" />
                      Restaurar
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          {/* Status label */}
          {!currentImage && !previewUrl && (
            <p className="text-[10px] text-muted-foreground">
              {originalImage ? "Usando imagem original" : "Sem imagem"}
            </p>
          )}
          {currentImage && !previewUrl && (
            <p className="text-[10px] text-primary">Imagem customizada</p>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpg,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
    </div>
  );
}

export default function AdminEditCardModal({ item, allOverridesByCategory, open, onClose }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(() => {
    const anyOverride = allOverridesByCategory ? Object.values(allOverridesByCategory).find(o => o?.override_title) : null;
    return anyOverride?.override_title || "";
  });
  const [description, setDescription] = useState(() => {
    const anyOverride = allOverridesByCategory ? Object.values(allOverridesByCategory).find(o => o?.override_description) : null;
    return anyOverride?.override_description || "";
  });
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  async function handleSaveMeta() {
    if (!title.trim() && !description.trim()) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      // Apply title/description to all existing overrides, or create a generic one if none
      const existing = allOverridesByCategory ? Object.values(allOverridesByCategory).filter(Boolean) : [];
      if (existing.length > 0) {
        await Promise.all(existing.map(o =>
          base44.entities.CardOverride.update(o.id, {
            override_title: title.trim() || null,
            override_description: description.trim() || null,
            edited_by: user.email,
            edited_at: new Date().toISOString(),
          })
        ));
      } else {
        await base44.entities.CardOverride.create({
          card_slug: item.slug,
          category: null,
          override_title: title.trim() || null,
          override_description: description.trim() || null,
          is_manual_override: true,
          sync_disabled: true,
          edited_by: user.email,
          edited_by_name: user.full_name || user.email,
          edited_at: new Date().toISOString(),
          original_snapshot: { title: item.title, cover: item.cover },
        });
      }
      qc.invalidateQueries({ queryKey: ["card-overrides"] });
      toast.success("Título/descrição salvos!");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-space text-base">
            Editar Card — <span className="text-muted-foreground font-normal">{item.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título (global)</label>
              <Input
                placeholder={item.title}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição (global)</label>
              <textarea
                placeholder="Descrição do card..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button size="sm" onClick={handleSaveMeta} disabled={saving} className="gap-1 h-7 text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Salvar título/descrição
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Imagens por categoria</p>
            <div className="space-y-2">
              {CATEGORIES.map(({ key, label, Icon, color }) => (
                <CategoryImageBlock
                  key={key}
                  catKey={key}
                  label={label}
                  Icon={Icon}
                  color={color}
                  item={item}
                  overrideRecord={allOverridesByCategory?.[key] || null}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="ghost" onClick={onClose} className="text-sm">Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}