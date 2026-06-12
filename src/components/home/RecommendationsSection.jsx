import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { getRecommendations, buildTasteProfile } from "@/lib/recommendations";
import { useTMDBPoster } from "@/components/catalog/useTMDBPoster";
import { Link } from "react-router-dom";

function RecoCard({ item }) {
  const navigate = useNavigate();
  const { posterUrl } = useTMDBPoster(item, item.categories[0]);

  function handleClick() {
    const tipo = item.categories.includes("anime") ? "anime"
      : item.categories.includes("manga") ? "manga" : "movie";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
  }

  return (
    <button onClick={handleClick} className="flex-shrink-0 w-20 group text-left">
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary border border-border group-hover:border-primary/50 transition-colors mb-1.5">
        {posterUrl ? (
          <img src={posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
    </button>
  );
}

export default function RecommendationsSection({ entries = [], userEmail }) {
  const myEntries = entries.filter((e) => e.created_by === userEmail);
  const profile = buildTasteProfile(myEntries);
  const recs = getRecommendations(myEntries, null, 10);

  if (recs.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">
            {myEntries.length === 0 ? "Em alta no ZOKU" : "Recomendados para você"}
          </h3>
        </div>
        <Link to="/recomendacoes" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
          Ver mais <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recs.map((item) => (
          <RecoCard key={item.slug} item={item} />
        ))}
      </div>
    </div>
  );
}