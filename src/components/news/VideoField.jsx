import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, AlertTriangle, Film } from "lucide-react";
import { getVideoEmbed } from "@/lib/news";

const MAX_VIDEO_MB = 50;
const ACCEPT_ATTR = ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime";

/**
 * Campo de vídeo com seletor de fonte: Nenhum | Link (YouTube/Vimeo) | Enviar arquivo.
 * - Link: input de URL + preview do embed (respeita proporção).
 * - Arquivo: upload via base44.integrations.Core.UploadFile com validação de tamanho,
 *   indicador de progresso e preview <video>.
 * - Trocar de fonte limpa o valor da fonte anterior.
 */
export default function VideoField({ videoType, videoUrl, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef();

  const setSource = (type) => {
    onChange({ video_type: type, video_url: "" });
    setUploadError("");
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_VIDEO_MB) {
      setUploadError(
        `Vídeo muito grande (${sizeMB.toFixed(1)} MB, máx. ${MAX_VIDEO_MB} MB). Para vídeos maiores, suba no YouTube e use a opção Link.`
      );
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange({ video_type: "file", video_url: file_url });
    } catch (err) {
      setUploadError("Falha no upload do vídeo. Tente novamente ou use a opção Link (YouTube).");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const embed = videoType === "embed" ? getVideoEmbed(videoUrl) : null;

  return (
    <div>
      <label className="text-xs text-foreground font-medium mb-1.5 block">Vídeo (opcional)</label>

      {/* Seletor de fonte */}
      <div className="flex gap-1.5 bg-secondary/50 rounded-lg p-1 mb-3">
        {[
          { key: "none", label: "Nenhum" },
          { key: "embed", label: "Link (YouTube/Vimeo)" },
          { key: "file", label: "Enviar arquivo" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSource(opt.key)}
            className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              videoType === opt.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {videoType === "embed" && (
        <div>
          <input
            value={videoUrl}
            onChange={(e) => onChange({ video_type: "embed", video_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=... ou youtu.be/..."
            className="w-full h-9 px-3 bg-secondary border-none rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {(() => {
            if (!videoUrl) return null;
            if (!embed) return (
              <p className="text-[10px] text-chart-4 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> URL de vídeo inválida. Use YouTube ou Vimeo.
              </p>
            );
            return (
              <div className={`mt-2 ${embed.orientation === "vertical" ? "max-w-[360px] mx-auto" : ""}`}>
                <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: embed.aspectRatio }}>
                  <iframe
                    src={embed.embedUrl}
                    title="Prévia do vídeo"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{embed.platform} · {embed.orientation}</p>
              </div>
            );
          })()}
        </div>
      )}

      {videoType === "file" && (
        <div>
          {!videoUrl ? (
            <div
              className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
              onClick={() => !uploading && inputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">Enviando vídeo... pode demorar.</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-5 h-5 text-muted-foreground/60" />
                  <span className="text-xs text-foreground">Clique para enviar um vídeo</span>
                  <span className="text-[10px] text-muted-foreground">MP4, WEBM ou MOV · máx. {MAX_VIDEO_MB} MB</span>
                </div>
              )}
              <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={handleFile} />
            </div>
          ) : (
            <div>
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <video src={videoUrl} controls preload="metadata" className="absolute inset-0 w-full h-full" />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Film className="w-3 h-3" /> Arquivo enviado
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-destructive/70 gap-1 px-2"
                  onClick={() => onChange({ video_type: "file", video_url: "" })}
                >
                  <X className="w-3 h-3" /> Remover
                </Button>
              </div>
            </div>
          )}
          {uploadError && (
            <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {uploadError}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            Dica: para trailers e vídeos longos, prefira a opção Link (YouTube) — não ocupa armazenamento e carrega mais rápido. O upload é ideal para clipes curtos próprios.
          </p>
        </div>
      )}
    </div>
  );
}