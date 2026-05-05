import { TrendingUp, Star, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CATALOG } from "@/lib/catalog";
import { useTMDBPoster } from "@/components/catalog/useTMDBPoster";

const trendingItems = [...CATALOG]
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 5)
  .map((item, i) => ({ ...item, rank: i + 1 }));

function TrendingRow({ item, onClick }) {
  const { posterUrl } = useTMDBPoster(item);
  return (
    <div
      onClick={() => onClick(item)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
    >
      <span className="text-lg font-bold text-muted-foreground/40 w-5 text-center font-space">
        {item.rank}
      </span>
      <div className="w-10 h-14 rounded-md bg-secondary overflow-hidden shrink-0 relative">
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
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">{item.genres[0]}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-chart-4">
        <Star className="w-3 h-3 fill-chart-4" />
        {item.rating}
      </div>
    </div>
  );
}

export default function TrendingSection() {
  const navigate = useNavigate();

  function handleClick(item) {
    const tipo = item.categories.includes("anime") ? "anime"
      : item.categories.includes("manga") ? "manga" : "movie";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-space font-semibold text-sm">Trending Agora</h3>
      </div>
      <div className="space-y-1">
        {trendingItems.map((item) => (
          <TrendingRow key={item.slug} item={item} onClick={handleClick} />
        ))}
      </div>
    </div>
  );
}