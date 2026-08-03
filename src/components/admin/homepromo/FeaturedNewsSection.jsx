import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Loader2, Flame, ImageOff } from "lucide-react";
import { categoryLabels, getCardImage, timeAgo } from "@/lib/news";

/**
 * Notícias publicadas com toggle de "destaque" (is_featured).
 * As destacadas aparecem no HeroCarousel e na faixa "Notícia quente" da home.
 */
export default function FeaturedNewsSection() {
  const queryClient = useQueryClient();

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["admin-featured-news"],
    queryFn: () => base44.entities.News.filter({ status: "publicado" }, "-published_at", 40),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-featured-news"] });
    queryClient.invalidateQueries({ queryKey: ["hero-carousel-news"] });
    queryClient.invalidateQueries({ queryKey: ["featured-news"] });
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }) => base44.entities.News.update(id, { is_featured: value }),
    onSuccess: invalidate,
  });

  const sorted = [...news].sort((a, b) => {
    if (!!b.is_featured !== !!a.is_featured) return b.is_featured ? 1 : -1;
    return new Date(b.published_at || b.created_date) - new Date(a.published_at || a.created_date);
  });

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-space font-semibold text-lg text-foreground flex items-center gap-2">
          <Flame className="w-4 h-4 text-destructive" /> Notícias em Destaque
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Notícias marcadas como destaque aparecem no carrossel principal e na faixa "Notícia quente" da home.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma notícia publicada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sorted.map((n) => {
            const img = getCardImage(n);
            return (
              <div
                key={n.id}
                className={`bg-card border rounded-xl p-2.5 flex items-center gap-3 ${
                  n.is_featured ? "border-primary/40" : "border-border"
                }`}
              >
                <div className="w-12 h-12 rounded-md overflow-hidden bg-secondary shrink-0">
                  {img ? (
                    <img src={img} alt={n.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {categoryLabels[n.category] || "Geral"} · {timeAgo(n.published_at || n.created_date)}
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer shrink-0">
                  Destaque
                  <Switch
                    checked={!!n.is_featured}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: n.id, value: v })}
                    aria-label="Destacar notícia"
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}