import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Palette, ChevronDown, ImageOff } from "lucide-react";
import FanArtAccordion from "./FanArtAccordion";

/**
 * Faixa "Arte de Fãs" na home: barra compacta recolhível + accordion expandido.
 * - Estado recolhido: barra compacta com ícone + prévia de miniaturas (PRESERVADO).
 * - Ao clicar, expande o accordion visual (FanArtAccordion).
 * As artes ativas aparecem embaralhadas a cada carregamento da lista.
 */
export default function FanArtStrip() {
  const [expanded, setExpanded] = useState(false);

  const { data: arts = [], isLoading } = useQuery({
    queryKey: ["fanart-active"],
    queryFn: () => base44.entities.FanArt.filter({ active: true }, "order", 50),
    staleTime: 5 * 60 * 1000,
  });

  const shuffled = useMemo(() => {
    const arr = [...arts];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [arts]);

  if (!isLoading && shuffled.length === 0) return null;

  const previews = shuffled.slice(0, 4);

  return (
    <section className="mb-6">
      {/* Barra compacta (cabeçalho clicável) — preservada */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`fanart-wave overflow-hidden w-full flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2 hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${!expanded ? "shadow-[0_0_14px_-3px_rgba(109,255,60,0.45)]" : ""}`}
      >
        <Palette className="w-4 h-4 text-chart-3 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/90">Arte de Fãs</span>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          {shuffled.length > 0 ? `${shuffled.length} arte(s)` : ""}
        </span>

        {/* Prévia de miniaturas (estado recolhido) */}
        {!expanded && (
          <div className="flex -space-x-2 ml-1">
            {previews.map((a) => (
              <div key={a.id} className="w-7 h-7 rounded-full overflow-hidden border-2 border-card bg-secondary shrink-0">
                {a.image_url ? (
                  <img src={a.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          {expanded ? "Recolher" : "Ver galeria"}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {/* Accordion expandido */}
      {expanded && (
        <div className="mt-2">
          <FanArtAccordion arts={shuffled} isLoading={isLoading} />
        </div>
      )}
    </section>
  );
}