import { Play, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCatalog } from "@/contexts/CatalogContext";
import { base44 } from "@/api/base44Client";
import { useTMDBPoster } from "@/components/catalog/useTMDBPoster";

function EpisodeRow({ item, onClick }) {
  const { posterUrl } = useTMDBPoster(item, "anime");

  return (
    <div
      onClick={() => onClick(item)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
    >
      <div className="w-16 h-10 rounded-md bg-secondary overflow-hidden shrink-0 relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center bg-secondary"
          style={{ display: posterUrl ? "none" : "flex" }}
        >
          <ImageOff className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.totalEpisodes > 0 ? `EP ${item.totalEpisodes}` : "Em breve"}
        </p>
      </div>
    </div>
  );
}

export default function RecentEpisodesSection() {
  const navigate = useNavigate();
  const { catalog, isLoading } = useCatalog();

  // Fetch CatalogSync records to get synced_at for ordering
  const { data: syncRecords = [] } = useQuery({
    queryKey: ["catalog-sync-recent"],
    queryFn: () => base44.entities.CatalogSync.list("-synced_at", 200),
    staleTime: 0,
    refetchInterval: 300000, // 5 minutes
  });

  const syncMap = new Map(syncRecords.map(r => [r.slug, r]));

  const airingAnimes = catalog
    .filter(w => w.categories?.includes("anime") && w.animeStatus === "Em exibição")
    .sort((a, b) => {
      const aSync = syncMap.get(a.slug);
      const bSync = syncMap.get(b.slug);
      const aDate = aSync?.synced_at ? new Date(aSync.synced_at).getTime() : 0;
      const bDate = bSync?.synced_at ? new Date(bSync.synced_at).getTime() : 0;
      if (bDate !== aDate) return bDate - aDate;
      return a.title.localeCompare(b.title, "pt-BR");
    })
    .slice(0, 10);

  function handleClick(item) {
    navigate(`/obra/${item.slug}?tipo=anime`);
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-primary" />
          <h3 className="font-space font-semibold text-sm">Episódios Recentes</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-16 h-10 rounded-md bg-secondary animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-secondary rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-primary" />
        <h3 className="font-space font-semibold text-sm">Episódios Recentes</h3>
      </div>
      <div className="space-y-1">
        {airingAnimes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum anime em exibição no momento.</p>
        ) : (
          airingAnimes.map(item => (
            <EpisodeRow key={item.slug} item={item} onClick={handleClick} />
          ))
        )}
      </div>
    </div>
  );
}