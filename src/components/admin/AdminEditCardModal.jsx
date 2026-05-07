import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ImageOff, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminEditCardModal({ item, category, overrideRecord, open, onClose }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(overrideRecord?.override_title || "");
  const [description, setDescription] = useState(overrideRecord?.override_description || "");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const currentImage = overrideRecord?.override_image_url || null;

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!item) return;
    setLoading(true);
    try {
      const user = await base44.auth.me();
      let imageUrl = overrideRecord?.override_image_url || null;

      if (imageFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = file_url;
      }

      const payload = {
        card_slug: item.slug,
        category: category || null,
        override_title: title.trim() || null,
        override_description: description.trim() || null,
        override_image_url: imageUrl,
        is_manual_override: true,
        sync_disabled: true,
        edited_by: user.email,
        edited_by_name: user.full_name || user.email,
        edited_at: new Date().toISOString(),
        original_snapshot: overrideRecord?.original_snapshot || {
          title: item.title,
          cover: item.cover,
        },
      };

      if (overrideRecord?.id) {
        await base44.entities.CardOverride.update(overrideRecord.id, payload);
      } else {
        await base44.entities.CardOverride.create(payload);
      }

      qc.invalidateQueries({ queryKey: ["card-overrides"] });
      toast.success("Card atualizado com sucesso!");
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar edição.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    if (!overrideRecord?.id) { setConfirmRestore(false); return; }
    setLoading(true);
    try {
      await base44.entities.CardOverride.delete(overrideRecord.id);
      qc.invalidateQueries({ queryKey: ["card-overrides"] });
      toast.success("Sincronização restaurada.");
      setConfirmRestore(false);
      onClose();
    } catch {
      toast.error("Erro ao restaurar.");
    } finally {
      setLoading(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-space">Editar Card</DialogTitle>
        </DialogHeader>

        {confirmRestore ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Isso vai remover as edições manuais e usar os dados originais novamente. Continuar?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmRestore(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRestore} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reference */}
            <p className="text-xs text-muted-foreground">
              Original: <span className="text-foreground font-medium">{item.title}</span>
            </p>

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
              <Input
                placeholder={item.title}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
              <textarea
                placeholder="Descrição do card..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Image */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Imagem</label>
              <input
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="text-xs text-muted-foreground"
              />
              <div className="flex gap-3 mt-2">
                {(currentImage || previewUrl === null) && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Atual</span>
                    <div className="w-16 h-20 rounded bg-secondary border border-border overflow-hidden flex items-center justify-center">
                      {currentImage
                        ? <img src={currentImage} alt="atual" className="w-full h-full object-cover" />
                        : <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                      }
                    </div>
                  </div>
                )}
                {previewUrl && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-primary">Nova</span>
                    <div className="w-16 h-20 rounded border-2 border-primary overflow-hidden">
                      <img src={previewUrl} alt="nova" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              {overrideRecord && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive gap-1 mr-auto"
                  onClick={() => setConfirmRestore(true)}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar original
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSave} disabled={loading} className="gap-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}