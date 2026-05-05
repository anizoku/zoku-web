import { TrendingUp, Star, ImageOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchTMDBTrending } from "@/lib/tmdbTrending";
import { CATALOG } from "@/lib/catalog";

// Fallback: top rated from local catalog
const fallbackItems = [...CATALOG]
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 5)
  .map((item, i) => ({
    id: item.slug,
    title: item.title,
    poster: null,
    rating: item.rating,
    genre: item.genres[0],
    slug: item.slug,
    categories: item.categories,
    rank: i + 1,
    isFallback: true,
    item,
  }));

function TrendingRow({ entry, onClick }) {
  return (
    <div
      onClick={() => onClick(entry)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
    >
      <span className="text-lg font-bold text-muted-foreground/40 w-5 text-center font-space">
        {entry.rank}
      </span>
      <div className="w-10 h-14 rounded-md bg-secondary overflow-hidden shrink-0 relative">
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ display: entry.poster ? "none" : "flex" }}
        >
          <ImageOff className="w-4 h-4 text-muted-foreground/40" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {entry.title}
        </p>
        <p className="text-xs text-muted-foreground">{entry.genre}</p>
      </div>
      {entry.rating && (
        <div className="flex items-center gap-1 text-xs text-chart-4">
          <Star className="w-3 h-3 fill-chart-4" />
          {entry.rating}
        </div>
      )}
    </div>
  );
}

export default function TrendingSection() {
  const navigate = useNavigate();
  const [items, setItems] = useState(fallbackItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTMDBTrending()
      .then((results) => {
        if (results.length > 0) {
          setItems(results.map((r, i) => ({ ...r, rank: i + 1 })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Refresh every hour
    const interval = setInterval(() => {
      fetchTMDBTrending()
        .then((results) => {
          if (results.length > 0) setItems(results.map((r, i) => ({ ...r, rank: i + 1 })));
        })
        .catch(() => {});
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  function handleClick(entry) {
    if (entry.isFallback) {
      const tipo = entry.item.categories.includes("anime") ? "anime"
        : entry.item.categories.includes("manga") ? "manga" : "movie";
      navigate(`/obra/${entry.slug}?tipo=${tipo}`);
    } else {
      // Search catalog for a match, otherwise go to TMDB page
      const match = CATALOG.find(c =>
        c.title.toLowerCase().includes(entry.title.toLowerCase()) ||
        entry.title.toLowerCase().includes(c.title.toLowerCase())
      );
      if (match) {
        const tipo = match.categories.includes("anime") ? "anime" : match.categories[0];
        navigate(`/obra/${match.slug}?tipo=${tipo}`);
      }
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-space font-semibold text-sm">Trending Agora</h3>
        </div>
        {loading && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      </div>
      <div className="space-y-1">
        {items.map((entry) => (
          <TrendingRow key={entry.id || entry.slug} entry={entry} onClick={handleClick} />
        ))}
      </div>
    </div>
  );
}