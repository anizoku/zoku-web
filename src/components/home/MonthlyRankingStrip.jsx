import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { TrendingUp, Flame } from "lucide-react";

const TYPE_LABEL = { anime: "Anime", manga: "Mangá", movie: "Filme", liveaction: "Live" };

/**
 * Ranking mensal compacto: top 3 obras com mais atualizações de progresso
 * (AnimeEntry) nos últimos 30 dias. Não toma protagonismo — faixa horizontal
 * discreta logo abaixo da notícia em destaque.
 */
export default function MonthlyRankingStrip({ entries = [] }) {
  const top3 = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const counts = new Map();
    for (const e of entries) {
      if (!e?.title) continue;
      const updated = e.updated_date ? new Date(e.updated_date).getTime() : 0;
      if (updated < cutoff) continue;
      const key = e.title.trim().toLowerCase();
      const cur = counts.get(key);
      if (cur) {
        cur.count += 1;
      } else {
        counts.set(key, { key, title: e.title, type: e.type, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  }, [entries]);

  const { data: works = [] } = useQuery({
    queryKey: ["monthly-ranking-works"],
    queryFn: () => base44.entities.DynamicWork.list("popularity_rank", 100),
    staleTime: 10 * 60 * 1000,
  });

  const posterMap = useMemo(() => {
    const m = new Map();
    for (const w of works) {
      const label = (w.franchise_title || w.title || "").trim().toLowerCase();
      if (label) m.set(label, w);
    }
    return m;
  }, [works]);

  if (top3.length === 0) return null;

  const rankColors = ["text-chart-4", "text-primary", "text-muted-foreground"];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Flame className="w-4 h-4 text-chart-4" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">Ranking do mês</h3>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">obras com mais progresso registrado</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {top3.map((item, i) => {
          const w = posterMap.get(item.key);
          const slug = w?.slug;
          const img = w?.franchise_poster_url || w?.image_url;
          const inner = (
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 min-w-[210px] flex-1 hover:border-primary/40 transition-colors">
              <div className="relative w-10 h-14 rounded-md overflow-hidden bg-secondary shrink-0">
                {img ? (
                  <img src={img} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${rankColors[i]}`}>#{i + 1}</span>
                  {item.type && (
                    <span className="text-[9px] uppercase text-muted-foreground bg-secondary px-1 py-0.5 rounded">
                      {TYPE_LABEL[item.type] || item.type}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {item.count} progresso{item.count > 1 ? "s" : ""} no mês
                </p>
              </div>
            </div>
          );
          return slug ? (
            <Link key={item.key} to={`/obra/${slug}`} className="flex-1 min-w-[210px]">
              {inner}
            </Link>
          ) : (
            <div key={item.key} className="flex-1 min-w-[210px]">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}