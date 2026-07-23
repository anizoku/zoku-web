import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Faixa de banners da plataforma exibida na home.
 * Busca apenas banners ativos, ordenados por `order`.
 * Cada banner é clicável se tiver link_url.
 */
export default function PlatformBannerStrip() {
  const { data: banners = [] } = useQuery({
    queryKey: ["platform-banners"],
    queryFn: () => base44.entities.PlatformBanner.filter({ active: true }, "order", 20),
    staleTime: 5 * 60 * 1000,
  });

  if (!banners.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 mb-2 scrollbar-thin">
      {banners.map((b) => {
        const inner = (
          <div className="relative w-[300px] sm:w-[440px] aspect-[16/9] rounded-xl overflow-hidden border border-border bg-card group">
            <img
              src={b.image_url}
              alt={b.title || "banner"}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {b.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                <span className="text-xs font-medium text-foreground line-clamp-1">{b.title}</span>
              </div>
            )}
          </div>
        );
        if (b.link_url) {
          return (
            <a
              key={b.id}
              href={b.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              {inner}
            </a>
          );
        }
        return (
          <div key={b.id} className="shrink-0">
            {inner}
          </div>
        );
      })}
    </div>
  );
}