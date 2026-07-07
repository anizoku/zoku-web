import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Play, RotateCcw, Volume2, Music } from "lucide-react";

const VALID_TYPES = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/wave", "audio/x-wav"];
const VALID_EXTENSIONS = [".mp3", ".ogg", ".wav"];
const MAX_SIZE_MB = 2;
const MAX_DURATION_S = 10;

function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      URL.revokeObjectURL(audio.src);
      resolve(d);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error("Não foi possível ler o arquivo de áudio."));
    };
    audio.src = URL.createObjectURL(file);
  });
}

export default function SoundUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(null);
  const inputRef = useRef();
  const previewRef = useRef();

  useEffect(() => {
    if (!value) { setDuration(null); return; }
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.onerror = () => setDuration(null);
    audio.src = value;
  }, [value]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    e.target.value = "";

    const ext = (file.name || "").toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!VALID_TYPES.includes(file.type) && !VALID_EXTENSIONS.includes(ext)) {
      setError("Apenas arquivos .mp3, .ogg ou .wav são permitidos.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Tamanho máximo: ${MAX_SIZE_MB}MB.`);
      return;
    }

    try {
      const dur = await getAudioDuration(file);
      if (!dur || !isFinite(dur)) {
        setError("Não foi possível determinar a duração do áudio.");
        return;
      }
      if (dur > MAX_DURATION_S) {
        setError(`O som de conquista deve ter no máximo ${MAX_DURATION_S} segundos (o arquivo tem ${dur.toFixed(1)}s).`);
        return;
      }
    } catch (err) {
      setError(err.message || "Erro ao validar o áudio.");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch {
      setError("Falha no upload. Tente novamente.");
    }
    setUploading(false);
  };

  const handlePreview = () => {
    if (!value) return;
    if (previewRef.current) { previewRef.current.pause(); previewRef.current = null; }
    const audio = new Audio(value);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    previewRef.current = audio;
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">Som de Conquista</p>
        <p className="text-muted-foreground text-sm">
          Tocado quando um usuário desbloqueia uma conquista. Se vazio, usa o som padrão (plim plim).
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center bg-secondary/50 cursor-pointer transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : value
              ? <Music className="w-5 h-5 text-primary" />
              : <Upload className="w-5 h-5 text-muted-foreground/50" />}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
            className="hidden"
            onChange={handleFile}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3 h-3" /> {value ? "Trocar som" : "Enviar som"}
            </Button>
            {value && (
              <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={handlePreview}>
                <Play className="w-3 h-3" /> Ouvir
              </Button>
            )}
            {value && (
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground" onClick={() => onChange("")}>
                <RotateCcw className="w-3 h-3" /> Restaurar padrão
              </Button>
            )}
          </div>
          {value && duration != null && isFinite(duration) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Duração: {duration.toFixed(1)}s
            </p>
          )}
          {!value && (
            <p className="text-xs text-primary">Usando som padrão (plim plim)</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}