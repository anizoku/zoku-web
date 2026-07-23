import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star, Play, ImageOff } from "lucide-react";

// Hero carousel — combina slides de NOTÍCIAS em destaque (banner_image_url)
// com as top obras por popularidade do DynamicWork.
// Auto-rotaciona, lazy-load de imagens, cada slide linka para sua rota.
export default function HeroCarousel() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  // Obras em destaque (fixadas pelo admin) + populares de fallback
  const { data: trendingWorks = [] } = useQuery({
    queryKey: ["hero-carousel-trending-works"],
    queryFn: () => base44.entities.DynamicWork.filter({ is_trending: true }, "trending_rank", 20),
    staleTime: 10 * 60 * 1000,
  });
  const { data: popularWorks = [] } = useQuery({
    queryKey: ["hero-carousel-popular-works"],
    queryFn: () => base44.entities.DynamicWork.list("popularity_rank", 12),
    staleTime: 10 * 60 * 1000,
  });

  // Notícias em destaque publicadas com banner
  const { data: newsSlides = [] } = useQuery({
    queryKey: ["hero-carousel-news"],
    queryFn: async () => {
      const items = await base44.entities.News.filter(
        { is_featured: true, status: "publicado" },
        "-published_at",
        5
      );
      return (items || [])
        .filter((n) => n.banner_image_url && n.title)
        .map((n) => ({
          id: n.id,
          _type: "news",
          image_url: n.banner_image_url,
          title: n.title,
          romaji_title: null,
          categories: JSON.stringify([n.category]),
          genres: "[]",
          score: null,
          year: n.published_at ? new Date(n.published_at).getFullYear() : null,
          is_currently_airing: false,
          slug: n.slug,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const _seenWorkIds = new Set();
  const workSlides = [...trendingWorks, ...popularWorks]
    .filter((w) => w.image_url && w.title)
    .filter((w) => {
      if (_seenWorkIds.has(w.id)) return false;
      _seenWorkIds.add(w.id);
      return true;
    })
    .slice(0, 6)
    .map((w) => ({ ...w, _type: "work" }));

  // Notícias primeiro, depois obras — limite total 8
  const items = [...newsSlides, ...workSlides].slice(0, 8);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[index];
  const cats = (() => {
    try { return JSON.parse(current.categories || "[]"); } catch { return []; }
  })();
  const genres = (() => {
    try { return JSON.parse(current.genres || "[]"); } catch { return []; }
  })();
  const tipo = cats.includes("anime") ? "anime" : cats.includes("manga") ? "manga" : cats[0] || "anime";

  const go = (i) => setIndex((i + items.length) % items.length);

  const openItem = () => {
    if (current._type === "news" && current.slug) {
      navigate(`/noticias/${current.slug}`);
    } else if (current.slug) {
      navigate(`/obra/${current.slug}?tipo=${tipo}`);
    }
  };

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[16/7] lg:aspect-[21/6] min-h-[240px] max-h-[380px] rounded-2xl overflow-hidden border border-border bg-card mb-6 flex">
      {/* Main image area */}
      <div className="relative flex-1 min-w-0 overflow-hidden">
        {/* Background image */}
        <img
          key={current.id}
          src={current.image_url}
          alt={current.title}
          loading="lazy"
          onClick={openItem}
          className="absolute inset-0 w-full h-full object-cover object-[center_35%] transition-opacity duration-700 cursor-pointer"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="max-w-[90%]">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {current._type === "news" ? (
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                  Notícia
                </span>
              ) : (
                cats.slice(0, 2).map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {c === "movie" ? "Filme" : c === "liveaction" ? "Live-Action" : c}
                  </span>
                ))
              )}
              {current.is_currently_airing && (
                <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold flex items-center gap-1">
                  <Play className="w-2.5 h-2.5" /> Em exibição
                </span>
              )}
            </div>
            <h2 className="font-space font-bold text-lg sm:text-2xl text-foreground leading-tight line-clamp-1 drop-shadow">
              {current.title}
            </h2>
            {current.romaji_title && current.romaji_title !== current.title && (
              <p className="text-xs text-muted-foreground line-clamp-1">{current.romaji_title}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              {current.score && (
                <span className="flex items-center gap-1 text-chart-4">
                  <Star className="w-3 h-3 fill-chart-4" /> {current.score}
                </span>
              )}
              {current.year && <span>{current.year}</span>}
              {current._type !== "news" &&
                genres.slice(0, 2).map((g) => (
                  <span key={g} className="hidden sm:inline">{g}</span>
                ))
              }
            </div>
            <button
              onClick={openItem}
              className="mt-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {current._type === "news" ? "Ler notícia" : "Ver detalhes"} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/90 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/90 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots */}
        {items.length > 1 && (
          <div className="absolute top-3 right-3 flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-foreground/40"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails panel (desktop) */}
      <div className="hidden md:flex w-[170px] shrink-0 border-l border-border bg-card/95 backdrop-blur flex-col gap-1.5 p-2 overflow-y-auto">
        {items.slice(0, 6).map((it, i) => (
          <button
            key={it.id}
            onClick={() => go(i)}
            className={`flex items-center gap-2 p-1 rounded-lg transition-all ${i === index ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-secondary/50"}`}
          >
            <div className="w-8 h-10 rounded overflow-hidden bg-secondary shrink-0">
              {it.image_url
                ? <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-3 h-3 text-muted-foreground/40" /></div>}
            </div>
            <span className="text-[10px] text-foreground/80 truncate text-left">{it.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}