import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { getRelatedWorks } from "@/lib/recommendations";
import { useTMDBPoster } from "@/components/catalog/useTMDBPoster";
import { useCatalog } from "@/contexts/CatalogContext";

function RelatedCard({ item }) {
  const navigate = useNavigate();
  const { posterUrl } = useTMDBPoster(item, item.categories[0]);

  function handleClick() {
    const tipo = item.categories.includes("anime") ? "anime"
      : item.categories.includes("manga") ? "manga" : "movie";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
  }

  return (
    <button onClick={handleClick} className="flex flex-col gap-1.5 group text-left">
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary border border-border group-hover:border-primary/50 transition-colors">
        {posterUrl ? (
          <img src={posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
      <p className="text-[10px] text-muted-foreground">★ {item.rating}</p>
    </button>
  );
}

export default function RelatedWorks({ item, entries = [] }) {
  const { catalog } = useCatalog();
  const related = getRelatedWorks(item, entries, 6, catalog);
  if (related.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Você também pode gostar</h3>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {related.map((work) => (
          <RelatedCard key={work.slug} item={work} />
        ))}
      </div>
    </div>
  );
}