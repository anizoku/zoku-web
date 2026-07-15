import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Newspaper, ImageOff, Loader2, Plus, Play } from "lucide-react";
import { categoryLabels, newsCategories, getCardImage, hasNewsVideo, timeAgo } from "@/lib/news";
import NewsEditor from "@/components/news/NewsEditor";

export default function News() {
  usePageTitle("Notícias");
  const [cat, setCat] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["news", cat],
    queryFn: () =>
      cat === "all"
        ? base44.entities.News.filter({ status: "publicado" }, "-published_at", 50)
        : base44.entities.News.filter({ status: "publicado", category: cat }, "-published_at", 50),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full px-4 lg:px-6 py-6 max-w-[1000px] mx-auto">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h1 className="font-space font-bold text-xl text-foreground">Notícias</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Notícia
          </button>
        )}
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
        <div className="grid sm:grid-cols-2 gap-4">
          {news.map((item) => {
            const img = getCardImage(item);
            return (
              <Link
                key={item.id}
                to={`/noticias/${item.slug}`}
                className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-colors group flex flex-col"
              >
                {img ? (
                  <div className="w-full aspect-[1200/675] overflow-hidden bg-secondary relative">
                    <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {hasNewsVideo(item) && (
                      <span className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                        <Play className="w-3 h-3 fill-primary-foreground" />
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-[1200/675] bg-secondary/60 flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {categoryLabels[item.category] || "Geral"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(item.published_at || item.created_date)}
                    </span>
                  </div>
                  <h2 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h2>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.summary}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <NewsEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}