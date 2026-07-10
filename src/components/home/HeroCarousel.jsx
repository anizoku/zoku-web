import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star, Play } from "lucide-react";
import { ImageOff } from "lucide-react";

// Hero carousel — top obras by popularity_rank from DynamicWork (real data).
// Auto-rotates, lazy-loads images, each slide links to /obra/:slug.
export default function HeroCarousel() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const { data: works = [] } = useQuery({
    queryKey: ["hero-carousel-works"],
    queryFn: () => base44.entities.DynamicWork.list("popularity_rank", 8),
    staleTime: 10 * 60 * 1000,
  });

  // Filter to items with a usable image + title, take top 6
  const items = works
    .filter(w => w.image_url && w.title)
    .slice(0, 6);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[index];
  const cats = (() => { try { return JSON.parse(current.categories || "[]"); } catch { return []; } })();
  const genres = (() => { try { return JSON.parse(current.genres || "[]"); } catch { return []; } })();
  const tipo = cats.includes("anime") ? "anime" : cats.includes("manga") ? "manga" : cats[0] || "anime";

  const go = (i) => setIndex((i + items.length) % items.length);

  return (
    <div className="relative w-full h-56 sm:h-72 md:h-80 rounded-2xl overflow-hidden border border-border bg-card mb-6">
      {/* Background image */}
      <img
        key={current.id}
        src={current.image_url}
        alt={current.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 opacity-90"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {cats.slice(0, 2).map(c => (
              <span key={c} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                {c === "movie" ? "Filme" : c === "liveaction" ? "Live-Action" : c}
              </span>
            ))}
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
            {genres.slice(0, 2).map(g => (
              <span key={g} className="hidden sm:inline">{g}</span>
            ))}
          </div>
          <button
            onClick={() => navigate(`/obra/${current.slug}?tipo=${tipo}`)}
            className="mt-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thumbnails (desktop) */}
        <div className="hidden md:flex flex-col gap-1.5 max-w-[140px]">
          {items.slice(0, 4).map((it, i) => (
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
  );
}