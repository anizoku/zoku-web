import { Flame } from "lucide-react";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import AdminEditableCard from "@/components/admin/AdminEditableCard";
import { useNavigate } from "react-router-dom";

const TRENDING_COUNT = 10; // 2 linhas × 5 colunas em desktop

/**
 * Score híbrido de trending:
 *   score = nota (0–10) + bônus de popularidade (máx 3 pts)
 *   popularity_rank menor = mais popular → bônus maior
 */
function getTrendingScore(w) {
  const rating = w.rating || w.score || 0;
  const popRank = w.popularity_rank || w.popularity;
  const popBonus = (popRank && popRank > 0 && popRank !== Infinity)
    ? Math.max(0, 3 - popRank / 500)
    : 0;
  return rating + popBonus;
}

/**
 * Seleciona obras "Em Alta" usando modelo híbrido:
 * 1. Curadoria manual: is_trending=true, ordenadas por trending_rank
 * 2. Fallback automático: completa com score híbrido (nota + popularidade)
 * 3. Nunca vazio: se não houver dados, usa as melhores avaliadas da categoria
 */
function getTrendingItems(works) {
  if (!works || works.length === 0) return [];

  const manual = works
    .filter(w => w.is_trending)
    .sort((a, b) => (a.trending_rank ?? 999) - (b.trending_rank ?? 999));

  if (manual.length >= TRENDING_COUNT) return manual.slice(0, TRENDING_COUNT);

  const manualSlugs = new Set(manual.map(w => w.slug));
  const auto = works
    .filter(w => !manualSlugs.has(w.slug))
    .map(w => ({ ...w, _score: getTrendingScore(w) }))
    .sort((a, b) => b._score - a._score);

  const result = [...manual];
  for (const w of auto) {
    if (result.length >= TRENDING_COUNT) break;
    result.push(w);
  }

  if (result.length === 0) {
    return [...works]
      .sort((a, b) => (b.rating || b.score || 0) - (a.rating || a.score || 0))
      .slice(0, Math.min(TRENDING_COUNT, works.length));
  }

  return result.slice(0, TRENDING_COUNT);
}

export default function TrendingStrip({ works, isAdmin }) {
  const navigate = useNavigate();
  if (!works || works.length === 0) return null;

  const items = getTrendingItems(works);
  if (items.length === 0) return null;

  function handleClick(item) {
    const tipo = item.categories?.includes("anime") ? "anime"
      : item.categories?.includes("manga") ? "manga" : "movie";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
  }

  function getFilterCategory(item) {
    if (item.categories?.includes("anime")) return "anime";
    if (item.categories?.includes("movie")) return "movie";
    if (item.categories?.includes("liveaction")) return "liveaction";
    return "manga";
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 rounded-full bg-primary" />
        <Flame className="w-5 h-5 text-primary" />
        <h2 className="font-space font-bold text-lg text-foreground">Em Alta</h2>
        <span className="text-xs text-muted-foreground">Destaques da categoria</span>
      </div>

      <div
        className="grid grid-rows-2 gap-3 overflow-x-auto pb-2"
        style={{ gridAutoFlow: 'column', gridAutoColumns: 'minmax(7rem, 10rem)' }}
      >
        {items.map((item) => (
          <div key={item.slug} className="min-w-0">
            <AdminEditableCard item={item} isAdmin={isAdmin} category={getFilterCategory(item)}>
              <CatalogCardGrid item={item} filterCategory={getFilterCategory(item)} onClick={handleClick} />
            </AdminEditableCard>
          </div>
        ))}
      </div>
    </section>
  );
}