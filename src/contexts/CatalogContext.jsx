/**
 * CatalogContext — Provê o catálogo enriquecido com dados do banco (CatalogSync)
 * para toda a aplicação via React Context + React Query.
 *
 * O array estático do catalog.js serve como base/fallback.
 * Os registros da entidade CatalogSync sobrescrevem campos dinâmicos (episódios,
 * capítulos, status) quando o valor do banco é não-nulo e não-zero.
 */
import { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";

const QUERY_KEY = ["catalog-sync-records"];
const STALE_TIME = 5 * 60 * 1000; // 5 minutos

// Mescla um item estático com o registro do banco
function mergeItem(work, syncRecord) {
  if (!syncRecord) return work;
  return {
    ...work,
    totalEpisodes:
      (syncRecord.total_episodes || 0) > 0
        ? syncRecord.total_episodes
        : work.totalEpisodes,
    totalChapters:
      (syncRecord.total_chapters || 0) > 0
        ? syncRecord.total_chapters
        : work.totalChapters,
    totalVolumes:
      (syncRecord.total_volumes || 0) > 0
        ? syncRecord.total_volumes
        : work.totalVolumes,
    animeStatus: syncRecord.anime_status || work.animeStatus,
    mangaStatus: syncRecord.manga_status || work.mangaStatus,
    mal_id: syncRecord.mal_id || work.mal_id,
    manga_mal_id: syncRecord.manga_mal_id || work.manga_mal_id,
    _syncRecord: syncRecord,
    _isManualOverride: syncRecord.sync_status === "manual_override",
  };
}

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const queryClient = useQueryClient();

  const { data: syncRecords = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => base44.entities.CatalogSync.list("-synced_at", 1000),
    staleTime: STALE_TIME,
  });

  // Constrói o mapa slug → registro do banco
  const syncMap = useMemo(() => {
    const map = new Map();
    for (const r of syncRecords) {
      if (r.slug) map.set(r.slug, r);
    }
    return map;
  }, [syncRecords]);

  // Array mesclado completo
  const catalog = useMemo(
    () => CATALOG.map((work) => mergeItem(work, syncMap.get(work.slug))),
    [syncMap]
  );

  const getBySlug = useCallback(
    (slug) => catalog.find((w) => w.slug === slug) || null,
    [catalog]
  );

  const getByCategory = useCallback(
    (category) =>
      catalog
        .filter((w) => w.categories?.includes(category))
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [catalog]
  );

  const refreshCatalog = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const getCatalogStats = useCallback(() => {
    const stats = { total: catalog.length, anime: 0, manga: 0, movie: 0, liveaction: 0 };
    for (const w of catalog) {
      for (const cat of w.categories || []) {
        if (stats[cat] !== undefined) stats[cat]++;
      }
    }
    return stats;
  }, [catalog]);

  const value = useMemo(
    () => ({ catalog, isLoading, getBySlug, getByCategory, refreshCatalog, getCatalogStats }),
    [catalog, isLoading, getBySlug, getByCategory, refreshCatalog, getCatalogStats]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}