import { Star, Tv, BookOpen, Film, ImageOff, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTMDBPoster } from "./useTMDBPoster";

const categoryIcons = { anime: <Tv className="w-3 h-3" />, manga: <BookOpen className="w-3 h-3" />, movie: <Film className="w-3 h-3" />, series: <Monitor className="w-3 h-3" /> };
const categoryLabels = { anime: "Anime", manga: "Mangá", movie: "Filme", series: "Série" };
const categoryColors = { anime: "bg-chart-2/80 text-white border-none", manga: "bg-chart-3/80 text-white border-none", movie: "bg-chart-5/80 text-white border-none", series: "bg-chart-1/80 text-white border-none" };

function statusBadgeClass(status) {
  if (!status) return "bg-secondary/80 text-secondary-foreground border-none";
  if (["Em exibição", "Em publicação", "Em andamento", "Lançado"].includes(status)) return "bg-primary/90 text-primary-foreground border-none";
  if (status === "Hiato") return "bg-chart-4/90 text-primary-foreground border-none";
  return "bg-secondary/80 text-secondary-foreground border-none";
}

function getDisplayStatus(item, filterCategory) {
  if (filterCategory === "movie") return item.movieStatus || "Lançado";
  if (filterCategory === "manga") return item.mangaStatus;
  if (filterCategory === "series") return item.seriesStatus || "Lançado";
  return item.animeStatus || item.movieStatus || item.mangaStatus;
}

function getDisplayCount(item, filterCategory) {
  if (filterCategory === "movie") return item.movieDuration || (item.year ? String(item.year) : "");
  if (filterCategory === "manga") return item.totalChapters ? `${item.totalChapters} caps` : "";
  if (filterCategory === "series") return item.seriesSeasons ? `${item.seriesSeasons} temp.` : "";
  return item.totalEpisodes ? `${item.totalEpisodes} eps` : "";
}

export default function CatalogCardGrid({ item, onClick, filterCategory }) {
  const { posterUrl, loading } = useTMDBPoster(item);
  const status = getDisplayStatus(item, filterCategory);
  const count = getDisplayCount(item, filterCategory);

  return (
    <div
      onClick={() => onClick(item)}
      className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-all group cursor-pointer"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-secondary">
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-secondary" />
        )}
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        {/* Fallback placeholder */}
        <div
          className="absolute inset-0 flex-col items-center justify-center bg-secondary text-muted-foreground"
          style={{ display: posterUrl ? "none" : "flex" }}
        >
          <ImageOff className="w-8 h-8 mb-1 opacity-40" />
          <span className="text-[10px] text-center px-2 opacity-60 line-clamp-2">{item.title}</span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />

        {/* Category badges */}
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