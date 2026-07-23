import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Trash2, ChevronUp, ChevronDown, ImageOff } from "lucide-react";

const ACCEPT = "image/jpeg,image/png,image/webp";

export default function LoginImagesPanel() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [multiError, setMultiError] = useState("");
  const inputRef = useRef();

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["login-bg-images"],
    queryFn: () => base44.entities.LoginBackgroundImage.list("order", 200),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["login-bg-images"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LoginBackgroundImage.update(id, data),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LoginBackgroundImage.delete(id),
    onSuccess: invalidate,
  });
  const moveMutation = useMutation({
    mutationFn: async ({ a, b }) => {
      await base44.entities.LoginBackgroundImage.update(a.id, { order: b.order ?? 0 });
      await base44.entities.LoginBackgroundImage.update(b.id, { order: a.order ?? 0 });
    },
    onSuccess: invalidate,
  });

  const handleMultiUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setMultiError("");
    setUploading(true);
    try {
      const baseOrder = images.length ? Math.max(...images.map((i) => i.order || 0)) + 1 : 0;
      for (let i = 0; i < files.length; i++) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
        await base44.entities.LoginBackgroundImage.create({
          image_url: file_url,
          title: files[i].name.replace(/\.[^.]+$/, "").slice(0, 60),
          active: true,
          order: baseOrder + i,
        });
      }
      invalidate();
    } catch (err) {
      setMultiError("Falha no upload de uma ou mais imagens.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const sorted = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-space font-bold text-xl text-foreground">Imagens de fundo do Login</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Imagens ativas fazem crossfade automático na tela de login, na ordem definida. Imagens inativas permanecem salvas mas não aparecem.
        </p>
      </div>

      {/* Multi-upload */}
      <div
        className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-card"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Enviando imagens...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="w-5 h-5 text-muted-foreground/60" />
            <span className="text-sm text-foreground">Enviar imagens (selecione várias de uma vez)</span>
            <span className="text-[10px] text-muted-foreground">JPG, PNG ou WebP</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={handleMultiUpload} />
      </div>
      {multiError && <p className="text-xs text-destructive">{multiError}</p>}

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          Nenhuma imagem cadastrada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sorted.map((img, idx) => (
            <div key={img.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-secondary">
                {img.image_url ? (
                  <img src={img.image_url} alt={img.title || "login bg"} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 bg-background/80 backdrop-blur text-[10px] text-foreground px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </span>
                {!img.active && (
                  <span className="absolute top-1.5 right-1.5 bg-destructive/80 text-[10px] text-destructive-foreground px-1.5 py-0.5 rounded">
                    Inativa
                  </span>
                )}
              </div>
              <div className="p-2 space-y-2 flex-1 flex flex-col">
                <Input
                  defaultValue={img.title || ""}
                  placeholder="Título (opcional)"
                  onBlur={(e) => {
                    if (e.target.value !== (img.title || "")) {
                      updateMutation.mutate({ id: img.id, data: { title: e.target.value } });
                    }
                  }}
                  className="bg-secondary border-none h-7 text-xs"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Ativa</span>
                  <Switch
                    checked={!!img.active}
                    onCheckedChange={(v) => updateMutation.mutate({ id: img.id, data: { active: v } })}
                  />
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === 0 || moveMutation.isPending}
                      onClick={() => moveMutation.mutate({ a: sorted[idx], b: sorted[idx - 1] })}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === sorted.length - 1 || moveMutation.isPending}
                      onClick={() => moveMutation.mutate({ a: sorted[idx], b: sorted[idx + 1] })}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm("Excluir esta imagem?")) deleteMutation.mutate(img.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}