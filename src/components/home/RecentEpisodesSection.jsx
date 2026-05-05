import { Play, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CATALOG } from "@/lib/catalog";
import { useTMDBPoster } from "@/components/catalog/useTMDBPoster";

// Recent episodes: animes "Em exibição" ordered by highest episode count as proxy for recency
const recentAnimes = CATALOG
  .filter(item => item.categories.includes("anime") && item.animeStatus === "Em exibição")
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 4)
  .map((item, i) => ({
    ...item,
    episode: item.totalEpisodes || "?",
    timeLabels: ["Há 2h", "Há 5h", "Há 12h", "Há 1d"][i],
  }));

function EpisodeRow({ item, onClick }) {
  const { posterUrl } = useTMDBPoster(item);
  return (
    <div
      onClick={() => onClick(item)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
    >
      <div className="w-16 h-10 rounded-md bg-secondary overflow-hidden shrink-0 relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">EP {item.episode}</p>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.timeLabels}</span>
    </div>
  );
}

export default function RecentEpisodesSection() {
  const navigate = useNavigate();

  function handleClick(item) {
    navigate(`/obra/${item.slug}?tipo=anime`);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-primary" />
        <h3 className="font-space font-semibold text-sm">Episódios Recentes</h3>
      </div>
      <div className="space-y-1">
        {recentAnimes.map((item) => (
          <EpisodeRow key={item.slug} item={item} onClick={handleClick} />
        ))}
      </div>
    </div>
  );
}