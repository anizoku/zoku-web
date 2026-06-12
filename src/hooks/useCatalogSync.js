/**
 * useCatalogSync — carrega todos os registros da entidade CatalogSync
 * e retorna um Map keyed por slug para mesclagem com o catálogo estático.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCatalogSyncMap() {
  const { data: records = [] } = useQuery({
    queryKey: ["catalog-sync-records"],
    queryFn: () => base44.entities.CatalogSync.list("-synced_at", 500),
    staleTime: 5 * 60 * 1000,
  });

  const map = new Map();
  for (const r of records) {
    if (r.slug) map.set(r.slug, r);
  }
  return map;
}

/**
 * Mescla os dados estáticos de uma obra do catalog.js
 * com o registro persistido no banco (CatalogSync).
 * O banco tem prioridade para campos dinâmicos.
 * Campos null/0 no banco preservam o valor estático.
 */
export function mergeCatalogWithSync(work, syncMap) {
  if (!syncMap) return work;
  const record = syncMap.get(work.slug);
  if (!record) return work;

  // manual_override: banco é definitivo, catálogo estático é ignorado
  const isOverride = record.sync_status === "manual_override";

  return {
    ...work,
    totalEpisodes: (record.total_episodes || 0) > 0 ? record.total_episodes : work.totalEpisodes,
    totalChapters: (record.total_chapters || 0) > 0 ? record.total_chapters : work.totalChapters,
    totalVolumes: (record.total_volumes || 0) > 0 ? record.total_volumes : work.totalVolumes,
    animeStatus: record.anime_status || work.animeStatus,
    mangaStatus: record.manga_status || work.mangaStatus,
    mal_id: record.mal_id || work.mal_id,
    manga_mal_id: record.manga_mal_id || work.manga_mal_id,
    _syncRecord: record,
    _isManualOverride: isOverride,
  };
}