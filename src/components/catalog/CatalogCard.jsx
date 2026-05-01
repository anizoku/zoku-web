import { Star, Tv, BookOpen, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categoryIcons = {
  anime: <Tv className="w-3 h-3" />,
  manga: <BookOpen className="w-3 h-3" />,
  movie: <Film className="w-3 h-3" />,
};

const categoryLabels = {
  anime: "Anime",
  manga: "Mangá",
  movie: "Filme",
};

const categoryColors = {
  anime: "bg-chart-2/80 text-white border-none",
  manga: "bg-chart-3/80 text-white border-none",
  movie: "bg-chart-5/80 text-white border-none",
};

function statusBadgeClass(status) {
  if (!status) return "bg-secondary/80 text-secondary-foreground border-none";
  if (status === "Em exibição" || status === "Em publicação" || status === "Em andamento")
    return "bg-primary/90 text-primary-foreground border-none";
  if (status === "Hiato") return "bg-chart-4/90 text-primary-foreground border-none";
  return "bg-secondary/80 text-secondary-foreground border-none";
}

function getDisplayStatus(item, filterCategory) {
  if (filterCategory === "movie" || (item.categories.length === 1 && item.categories[0] === "movie")) {
    return item.movieStatus || "Lançado";
  }
  if (filterCategory === "manga") return item.mangaStatus;
  return item.animeStatus || item.movieStatus || item.mangaStatus;
}

function getDisplayCount(item, filterCategory) {
  if (filterCategory === "movie" || (item.categories.length === 1 && item.categories[0] === "movie")) {
    return item.movieDuration || "";
  }
  if (filterCategory === "manga") {
    return item.totalChapters ? `${item.totalChapters} caps` : "";
  }
  return item.totalEpisodes ? `${item.totalEpisodes} eps` : "";
}

export default function CatalogCard({ item, onClick, filterCategory }) {
  const status = getDisplayStatus(item, filterCategory);
  const count = getDisplayCount(item, filterCategory);

  return (
    <div
      onClick={() => onClick(item)}
      className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-all group cursor-pointer"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={item.cover}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

        {/* Category badges top-right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {item.categories.map((cat) => (
            <Badge key={cat} className={`${categoryColors[cat]} text-[9px] px-1.5 py-0 flex items-center gap-0.5`}>
              {categoryIcons[cat]} {categoryLabels[cat]}
            </Badge>
          ))}
        </div>

        {/* Status bottom */}
        <div className="absolute bottom-2 left-2 right-2">
          <Badge className={`${statusBadgeClass(status)} text-[10px]`}>{status}</Badge>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors leading-tight">
          {item.title}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.genres.slice(0, 2).join(" / ")}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-chart-4">
            <Star className="w-3 h-3 fill-chart-4" />
            <span className="font-medium">{item.rating}</span>
          </div>
          {count && <span className="text-[10px] text-muted-foreground">{count}</span>}
        </div>
      </div>
    </div>
  );
}