import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Loader2, Star, ImageOff, Pin } from "lucide-react";

/**
 * Obras do catálogo com toggle de "em alta" (is_trending).
 * As marcadas aparecem primeiro no carrossel principal da home,
 * seguidas das mais populares (popularity_rank) como fallback.
 */
export default function HeroWorksSection() {
  const queryClient = useQueryClient();

  const { data: trending = [], isLoading: lt } = useQuery({
    queryKey: ["admin-hero-trending"],
    queryFn: () => base44.entities.DynamicWork.filter({ is_trending: true }, "trending_rank", 50),
  });
  const { data: popular = [], isLoading: lp } = useQuery({
    queryKey: ["admin-hero-popular"],
    queryFn: () => base44.entities.DynamicWork.list("popularity_rank", 30),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-hero-trending"] });
    queryClient.invalidateQueries({ queryKey: ["admin-hero-popular"] });
    queryClient.invalidateQueries({ queryKey: ["hero-carousel-trending-works"] });
    queryClient.invalidateQueries({ queryKey: ["hero-carousel-popular-works"] });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ work, value }) => {
      if (value) {
        const maxRank = trending.reduce((m, w) => Math.max(m, w.trending_rank || 0), 0);
        await base44.entities.DynamicWork.update(work.id, {
          is_trending: true,
          trending_rank: maxRank + 1,
        });
      } else {
        await base44.entities.DynamicWork.update(work.id, { is_trending: false });
      }
    },
    onSuccess: invalidate,
  });

  const isLoading = lt || lp;
  const seen = new Set();
  const combined = [];
  for (const w of [...trending, ...popular]) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    combined.push(w);
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-space font-semibold text-lg text-foreground flex items-center gap-2">
          <Pin className="w-4 h-4 text-primary" /> Obras no Carrossel Principal
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Marque obras como "Em alta" para exibi-las no carrossel principal da home. Apenas as marcadas aparecem — não há preenchimento automático.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : combined.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma obra disponível no catálogo.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {combined.map((w) => (
            <div
              key={w.id}
              className={`bg-card border rounded-xl p-2.5 flex items-center gap-3 ${
                w.is_trending ? "border-primary/40" : "border-border"
              }`}
            >
              <div className="w-10 h-14 rounded-md overflow-hidden bg-secondary shrink-0">
                {w.image_url ? (
                  <img src={w.image_url} alt={w.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{w.title}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  {w.year ? <span>{w.year}</span> : null}
                  {w.score ? (
                    <span className="flex items-center gap-0.5 text-chart-4">
                      <Star className="w-3 h-3 fill-chart-4" /> {w.score}
                    </span>
                  ) : null}
                  {w.is_trending ? <span className="text-primary">· fixada</span> : null}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer shrink-0">
                Em alta
                <Switch
                  checked={!!w.is_trending}
                  disabled={toggleMutation.isPending}
                  onCheckedChange={(v) => toggleMutation.mutate({ work: w, value: v })}
                  aria-label="Marcar como em alta"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}