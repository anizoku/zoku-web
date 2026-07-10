import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Newspaper, ExternalLink, ImageOff, Loader2 } from "lucide-react";
import { categoryLabels, newsCategories, timeAgo } from "@/lib/news";

export default function News() {
  usePageTitle("Notícias");
  const [cat, setCat] = useState("all");

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["news", cat],
    queryFn: () =>
      cat === "all"
        ? base44.entities.News.list("-published_at", 50)
        : base44.entities.News.filter({ category: cat }, "-published_at", 50),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full px-4 lg:px-6 py-6 max-w-[1000px] mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Newspaper className="w-5 h-5 text-primary" />
        <h1 className="font-space font-bold text-xl text-foreground">Notícias</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        As últimas novidades do mundo dos animes, mangás e filmes.
      </p>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {newsCategories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              cat === c.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : news.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma notícia encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.source_url || "#"}
              target={item.source_url ? "_blank" : undefined}
              rel={item.source_url ? "noopener noreferrer" : undefined}
              className="flex gap-4 bg-card rounded-xl border border-border p-3 hover:border-primary/40 transition-colors group"
            >
              {item.image_url ? (
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-secondary shrink-0">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                  <ImageOff className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {categoryLabels[item.category] || "Geral"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(item.published_at || item.created_date)}
                  </span>
                </div>
                <h2 className="font-semibold text-sm sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h2>
                {item.summary && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">{item.summary}</p>
                )}
                <div className="mt-auto pt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  {item.source_name && <span>{item.source_name}</span>}
                  {item.source_url && <ExternalLink className="w-3 h-3" />}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}