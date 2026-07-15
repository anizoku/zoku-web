import { Flame, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function FeaturedNewsStrip() {
  const { data: featured } = useQuery({
    queryKey: ["featured-news"],
    queryFn: async () => {
      const items = await base44.entities.News.filter(
        { is_featured: true, status: "publicado" },
        "-published_at",
        1
      );
      return items?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!featured) return null;

  return (
    <Link
      to={`/noticias/${featured.slug}`}
      className="flex items-center gap-3 bg-card rounded-xl border border-border p-3 mb-6 hover:border-primary/50 transition-colors group"
    >
      <div className="flex items-center gap-2 shrink-0">
        <Flame className="w-4 h-4 text-destructive" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-destructive hidden sm:inline">
          Notícia quente
        </span>
      </div>
      <p className="text-sm font-medium text-foreground truncate flex-1 group-hover:text-primary transition-colors">
        {featured.title}
      </p>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
  );
}