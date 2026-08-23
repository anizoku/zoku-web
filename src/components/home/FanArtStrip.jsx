import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Palette, Instagram, Twitter, Globe, ChevronLeft, ChevronRight, ChevronDown, ImageOff } from "lucide-react";

function buildUrl(value, platform) {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (platform) {
    const handle = v.startsWith("@") ? v.slice(1) : v;
    return `https://${platform}.com/${handle}`;
  }
  return `https://${v}`;
}

/**
 * Faixa "Arte de Fãs" na home: carrossel recolhível.
 * - Estado recolhido: barra compacta com ícone + prévia de miniaturas.
 * - Ao clicar, expande o carrossel horizontal (ordem embaralhada).
 * - Quando expandido, rolar a página para baixo recolhe automaticamente.
 * Cada card mostra a arte, o artista e ícones de redes (Instagram/Twitter/site).
 */
export default function FanArtStrip() {
  const scrollRef = useRef(null);
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

  // Recolhe automaticamente ao rolar para baixo (apenas quando expandido)
  useEffect(() => {
    if (!expanded) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 5) {
        setExpanded(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [expanded]);

  if (!isLoading && shuffled.length === 0) return null;

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  const previews = shuffled.slice(0, 4);

  return (
    <section className="mb-6">
      {/* Barra compacta (cabeçalho clicável) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2 hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      {/* Carrossel expandido */}
      {expanded && (
        <div className="mt-2">
          {isLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[200px] h-[260px] bg-card rounded-xl animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="relative">
              {shuffled.length > 3 && (
                <div className="absolute -top-9 right-0 flex gap-1">
                  <button
                    onClick={() => scroll(-1)}
                    aria-label="Artes anteriores"
                    className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scroll(1)}
                    aria-label="Próximas artes"
                    className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2">
                {shuffled.map((art) => {
                  const ig = buildUrl(art.artist_instagram, "instagram");
                  const tw = buildUrl(art.artist_twitter, "twitter");
                  const web = buildUrl(art.artist_website, null);

                  const card = (
                    <div className="w-[200px] shrink-0 bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors">
                      <div className="relative w-full aspect-[4/5] bg-secondary overflow-hidden">
                        <img
                          src={art.image_url}
                          alt={art.title || art.artist_name || "fan art"}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2.5 space-y-1">
                        {art.title && <p className="text-xs font-semibold text-foreground truncate">{art.title}</p>}
                        <p className="text-[11px] text-muted-foreground truncate">por {art.artist_name || "Artista"}</p>
                        {(ig || tw || web) && (
                          <div className="flex items-center gap-2 pt-0.5">
                            {ig && (
                              <a
                                href={ig}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram do artista"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                              >
                                <Instagram className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {tw && (
                              <a
                                href={tw}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Twitter do artista"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                              >
                                <Twitter className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {web && (
                              <a
                                href={web}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Site do artista"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                              >
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  return art.work_slug ? (
                    <Link
                      key={art.id}
                      to={`/obra/${art.work_slug}`}
                      className="rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {card}
                    </Link>
                  ) : (
                    <div key={art.id}>{card}</div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}