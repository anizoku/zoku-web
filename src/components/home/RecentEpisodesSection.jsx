import { Play, ImageOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchTMDBRecentEpisodes } from "@/lib/tmdbTrending";
import { CATALOG } from "@/lib/catalog";

// Fallback
const fallbackItems = CATALOG
  .filter(item => item.categories.includes("anime") && item.animeStatus === "Em exibição")
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 4)
  .map((item, i) => ({
    id: item.slug,
    title: item.title,
    poster: null,
    episode: item.totalEpisodes || "?",
    timeLabel: ["Há 2h", "Há 5h", "Há 12h", "Há 1d"][i],
    isFallback: true,
    item,
  }));

function EpisodeRow({ entry, onClick }) {
  return (
    <div
      onClick={() => onClick(entry)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
    >
      <div className="w-16 h-10 rounded-md bg-secondary overflow-hidden shrink-0 relative">
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center bg-secondary"
          style={{ display: entry.poster ? "none" : "flex" }}
        >
          <ImageOff className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {entry.title}
        </p>
        <p className="text-xs text-muted-foreground">EP {entry.episode}</p>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{entry.timeLabel}</span>
    </div>
  );
}

export default function RecentEpisodesSection() {
  const navigate = useNavigate();
  const [items, setItems] = useState(fallbackItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTMDBRecentEpisodes()
      .then((results) => {
        if (results.length > 0) setItems(results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Refresh every hour
    const interval = setInterval(() => {
      fetchTMDBRecentEpisodes()
        .then((results) => {
          if (results.length > 0) setItems(results);
        })
        .catch(() => {});
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  function handleClick(entry) {
    if (entry.isFallback) {
      navigate(`/obra/${entry.item.slug}?tipo=anime`);
    } else {
      const match = CATALOG.find(c =>
        c.title.toLowerCase().includes(entry.title.toLowerCase()) ||
        entry.title.toLowerCase().includes(c.title.toLowerCase())
      );
      if (match) navigate(`/obra/${match.slug}?tipo=anime`);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          <h3 className="font-space font-semibold text-sm">Episódios Recentes</h3>
        </div>
        {loading && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      </div>
      <div className="space-y-1">
        {items.map((entry) => (
          <EpisodeRow key={entry.id} entry={entry} onClick={handleClick} />
        ))}
      </div>
    </div>
  );
}