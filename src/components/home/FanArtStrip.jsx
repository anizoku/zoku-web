import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Palette, Instagram, Twitter, Globe, ChevronLeft, ChevronRight } from "lucide-react";

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
 * Faixa "Arte de Fãs" na home: carrossel horizontal rotativo (ordem aleatória
 * a cada carregamento) de artes ativas. Cada card mostra a arte, o artista e
 * ícones de redes sociais (Instagram, Twitter, site) quando setados pelo admin.
 */
export default function FanArtStrip() {
  const scrollRef = useRef(null);

  const { data: arts = [], isLoading } = useQuery({
    queryKey: ["fanart-active"],
    queryFn: () => base44.entities.FanArt.filter({ active: true }, "order", 50),
    staleTime: 5 * 60 * 1000,
  });

  // Embaralha a ordem a cada carregamento dos dados
  const shuffled = useMemo(() => {
    const arr = [...arts];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [arts]);

  if (!isLoading && shuffled.length === 0) return null;

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-chart-3" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">Arte de Fãs</h3>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">galeria rotativa de artistas</span>
        </div>
        {shuffled.length > 3 && (
          <div className="flex gap-1">
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
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[200px] h-[260px] bg-card rounded-xl animate-pulse shrink-0" />
          ))}
        </div>
      ) : (
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
      )}
    </section>
  );
}