import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Save, Image as ImageIcon } from "lucide-react";

const VALID_TYPES = ["image/png", "image/svg+xml", "image/webp", "image/jpeg"];
const MAX_SIZE_MB = 2;

function LogoUploader({ label, hint, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (!VALID_TYPES.includes(file.type)) {
      setError("Apenas PNG, SVG ou WebP são permitidos.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Tamanho máximo: ${MAX_SIZE_MB}MB.`);
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

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="relative cursor-pointer group border-2 border-dashed border-border hover:border-primary/50 rounded-xl overflow-hidden transition-colors w-28 h-28 flex items-center justify-center bg-secondary/50"
          onClick={() => inputRef.current?.click()}>
          
          {value ?
          <img src={value} alt="preview" className="w-full h-full object-contain p-2" /> :

          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
          }
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            {uploading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-primary" />}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <input ref={inputRef} type="file" accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp" className="hidden" onChange={handleFile} />
          <Input
            placeholder="URL da imagem..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-secondary border-none text-sm" />
          
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="w-3 h-3" /> Enviar arquivo
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>);

}

export default function AppearanceManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ logo_compact_url: "", logo_full_url: "" });
  const [loaded, setLoaded] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["site-config"],
    queryFn: async () => {
      const list = await base44.entities.SiteConfig.list("-updated_date", 1);
      return list?.[0] || null;
    }
  });

  // Populate form once when config loads
  if (config && !loaded) {
    setForm({
      logo_compact_url: config.logo_compact_url || "",
      logo_full_url: config.logo_full_url || ""
    });
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const me = await base44.auth.me();
      const data = {
        label: "default",
        logo_compact_url: form.logo_compact_url,
        logo_full_url: form.logo_full_url,
        updated_by: me?.email || ""
      };
      if (config?.id) {
        return base44.entities.SiteConfig.update(config.id, data);
      }
      return base44.entities.SiteConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>);

  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-space font-bold text-xl text-foreground">Aparência da Marca</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Troque as imagens de logo usadas no site. Se um campo ficar vazio, a logo atual (padrão) continua sendo usada.
        </p>
      </div>

      <div className="space-y-6 bg-card border border-border rounded-xl p-5">
        <LogoUploader
          label="Logo compacta (ícone)"
          hint="Recomendado: quadrada, fundo transparente (PNG/SVG/WebP). Usada no menu lateral reduzido."
          value={form.logo_compact_url}
          onChange={(v) => setForm((f) => ({ ...f, logo_compact_url: v }))} />
        
        <LogoUploader
          label="Logo completa (ícone + texto)"
          hint="Recomendado: proporção horizontal (~4:1). Usada no menu expandido e cabeçalho."
          value={form.logo_full_url}
          onChange={(v) => setForm((f) => ({ ...f, logo_full_url: v }))} />
        
      </div>

      <Button
        className="gap-2"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}>
        
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar Logos
      </Button>

      <div className="bg-secondary/50 border border-border rounded-lg p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Nota sobre PWA (ícone do app instalado):</p>
        <p>
          A troca aqui atualiza a logo do site em tempo real. O ícone do app instalado (manifest.json) é gerado no build
          e exigirá um novo deploy para refletir a nova logo no dispositivo do usuário.
        </p>
      </div>
    </div>);

}