import { Star, Tv, BookOpen, Film, ImageOff, ChevronRight, Clapperboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTMDBPoster } from "./useTMDBPoster";

const categoryIcons = { anime: <Tv className="w-3 h-3" />, manga: <BookOpen className="w-3 h-3" />, movie: <Film className="w-3 h-3" />, liveaction: <Clapperboard className="w-3 h-3" /> };
const categoryLabels = { anime: "Anime", manga: "Mangá", movie: "Filme", liveaction: "Live Action" };
const categoryColors = { anime: "bg-chart-2/80 text-white border-none", manga: "bg-chart-3/80 text-white border-none", movie: "bg-chart-5/80 text-white border-none", liveaction: "bg-chart-1/80 text-white border-none" };

function statusBadgeClass(status) {
  if (!status) return "bg-secondary/80 text-secondary-foreground border-none";
  if (["Em exibição", "Em publicação", "Em andamento", "Lançado"].includes(status)) return "bg-primary/90 text-primary-foreground border-none";
  if (status === "Hiato") return "bg-chart-4/90 text-primary-foreground border-none";
  return "bg-secondary/80 text-secondary-foreground border-none";
}

function getDisplayStatus(item, filterCategory) {
  if (filterCategory === "movie") return item.movieStatus || "Lançado";
  if (filterCategory === "manga") return item.mangaStatus;
  if (filterCategory === "liveaction") return item.liveActionStatus || "Lançado";
  return item.animeStatus || item.movieStatus || item.mangaStatus;
}

function getDisplayCount(item, filterCategory) {
  if (filterCategory === "movie") return item.movieDuration || "";
  if (filterCategory === "manga") return item.totalChapters ? `${item.totalChapters} capítulos` : "";
  if (filterCategory === "liveaction") return item.liveActionSeasons ? `${item.liveActionSeasons} temporada${item.liveActionSeasons !== 1 ? "s" : ""}` : "";
  return item.totalEpisodes ? `${item.totalEpisodes} episódios` : "";
}

export default function CatalogCardList({ item, onClick, filterCategory }) {
  const { posterUrl, loading } = useTMDBPoster(item);
  const status = getDisplayStatus(item, filterCategory);
  const count = getDisplayCount(item, filterCategory);

  return (
    <div
      onClick={() => onClick(item)}
      className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-all group cursor-pointer flex gap-0"
    >
      {/* Thumbnail */}
      <div className="relative w-16 sm:w-20 shrink-0 bg-secondary overflow-hidden">
        {loading && <div className="absolute inset-0 animate-pulse bg-secondary" />}
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center bg-secondary text-muted-foreground"
          style={{ display: posterUrl ? "none" : "flex" }}
        >
          <ImageOff className="w-5 h-5 opacity-40" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-1.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-1">
              {item.title}
            </h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
          </div>

          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.categories.map((cat) => (
              <Badge key={cat} className={`${categoryColors[cat]} text-[9px] px-1.5 py-0 flex items-center gap-0.5`}>
                {categoryIcons[cat]} {categoryLabels[cat]}
              </Badge>
            ))}
            {status && (
              <Badge className={`${statusBadgeClass(status)} text-[9px] px-1.5 py-0`}>{status}</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-1">
          <p className="text-[10px] text-muted-foreground truncate max-w-[60%]">
            {item.genres.slice(0, 3).join(" · ")}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {count && <span className="text-[10px] text-muted-foreground">{count}</span>}
            <div className="flex items-center gap-0.5 text-chart-4">
              <Star className="w-3 h-3 fill-chart-4" />
              <span className="text-[11px] font-medium">{item.rating}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}