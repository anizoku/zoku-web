import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Link2, AlertTriangle } from "lucide-react";

/**
 * Campo de upload de imagem reutilizável.
 * Usa o mesmo mecanismo de storage do projeto: base44.integrations.Core.UploadFile.
 * - Mostra preview, permite colar URL, trocar/remover.
 * - Aviso não-bloqueante se a imagem estiver muito abaixo do mínimo recomendado.
 */
export default function ImageUploadField({ label, hint, value, onChange, minW = 0, minH = 0 }) {
  const [uploading, setUploading] = useState(false);
  const [warn, setWarn] = useState("");
  const inputRef = useRef();

  const checkDimensions = (url) => {
    if (!minW || !minH || !url) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < minW * 0.6 || img.naturalHeight < minH * 0.6) {
        setWarn(`Imagem pequena (${img.naturalWidth}×${img.naturalHeight}). Recomendado ~${minW}×${minH}px.`);
      } else {
        setWarn("");
      }
    };
    img.onerror = () => setWarn("");
    img.src = url;
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      checkDimensions(file_url);
    } catch (err) {
      console.error("Upload falhou:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-foreground font-medium mb-1 block">{label}</label>
      {hint && <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">{hint}</p>}

      <div className="flex gap-2">
        <div
          className="relative cursor-pointer group border-2 border-dashed border-border hover:border-primary/50 rounded-xl overflow-hidden transition-colors w-28 h-20 shrink-0 bg-secondary/40"
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              {uploading ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground/60" />
              )}
              <span className="text-[9px] text-muted-foreground/60">Enviar</span>
            </div>
          )}
          {value && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          <Input
            placeholder="Cole uma URL ou envie um arquivo..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              checkDimensions(e.target.value);
            }}
            className="bg-secondary border-none text-xs h-8"
          />
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive/70 gap-1 px-2"
              onClick={() => { onChange(""); setWarn(""); }}
            >
              <X className="w-3 h-3" /> Remover
            </Button>
          )}
        </div>
      </div>

      {warn && (
        <div className="flex items-start gap-1.5 mt-1.5 text-[10px] text-chart-4">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{warn}</span>
        </div>
      )}
    </div>
  );
}