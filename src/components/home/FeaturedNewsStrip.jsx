import { useState, useEffect } from "react";
import { Flame, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const CATEGORY_LABELS = {
  anime: "Anime",
  manga: "Mangá",
  movie: "Filme",
  liveaction: "Live Action",
  general: "Notícias",
};

function relativeTime(dateStr) {
  if (!dateStr) return null;
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `há ${days} d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `há ${months} mês`;
}

export default function FeaturedNewsStrip() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["featured-news"],
    queryFn: async () => {
      const list = await base44.entities.News.filter(
        { is_featured: true, status: "publicado" },
        "-published_at",
        5
      );
      return list || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasMultiple = (items?.length || 0) > 1;
  const current = items?.[index] || items?.[0] || null;

  // Autoplay: 6s, only when multiple and not paused
  useEffect(() => {
    if (!hasMultiple || paused || !items?.length) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [hasMultiple, paused, items?.length]);

  // Reset index when items change
  useEffect(() => {
    setIndex(0);
  }, [items]);

  if (!current) return null;

  const cat = CATEGORY_LABELS[current.category];
  const rt = relativeTime(current.published_at);
  const metaStr = [cat, rt].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/noticias/${current.slug}`}
      aria-label={`Abrir notícia: ${current.title}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="block mb-6 rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 bg-card/70 rounded-xl border border-border px-3 py-2 hover:border-primary/40 transition-colors group">
        {/* Badge: 🔥 NOTÍCIA QUENTE */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Flame className="w-3.5 h-3.5 text-destructive animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
            Notícia quente
          </span>
        </div>

        {/* Content row: title + meta + arrow + dots */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Title + meta (transitions on index change) */}
          <div key={index} className="ticker-fade-in flex-1 min-w-0 flex items-center gap-3">
            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {current.title}
            </p>
            {metaStr && (
              <span className="text-[11px] text-muted-foreground shrink-0 hidden md:block">
                {metaStr}
              </span>
            )}
          </div>

          {/* Arrow */}
          <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>

          {/* Dots */}
          {hasMultiple && (
            <div className="flex items-center gap-1 shrink-0">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir para notícia ${i + 1}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === index ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}