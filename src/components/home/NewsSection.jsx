import { Newspaper, ArrowRight, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { categoryLabels, getCardImage, timeAgo } from "@/lib/news";

export default function NewsSection() {
  const { data: news = [], isLoading } = useQuery({
    queryKey: ["home-news"],
    queryFn: () => base44.entities.News.filter({ status: "publicado" }, "-published_at", 5),
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoading && news.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Últimas Notícias</h3>
        </div>
        <Link
          to="/noticias"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          Ver mais <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-secondary/40 animate-pulse" />
          ))
        ) : (
          news.map((item) => {
            const img = getCardImage(item);
            return (
              <Link
                key={item.id}
                to={`/noticias/${item.slug}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
              >
                {img ? (
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary shrink-0">
                    <img src={img} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-md bg-secondary/60 flex items-center justify-center shrink-0">
                    <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(item.published_at || item.created_date)} · {categoryLabels[item.category] || "Geral"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}