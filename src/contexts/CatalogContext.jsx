/**
 * CatalogContext — Catálogo mesclado em tempo real
 * Combina 3 fontes: catalog.js (estático), CatalogSync (atualizações), DynamicWork (importações).
 * Prioridade: DynamicWork > CatalogSync > catalog.js
 */
import { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";
import { parseSeasons } from "@/lib/franchiseDetection";
import { resolveReleasesSync } from "@/lib/workReleases";
import { resolveAlias, isAliasSlug } from "@/lib/catalogAliases";
import { hasActiveCategory, isCategoryFrozen, FROZEN_CATEGORIES } from "@/lib/scopeConfig";

const QUERY_KEY_SYNC = ["catalog-sync-records"];
const QUERY_KEY_DYNAMIC = ["catalog-dynamic-works"];
const QUERY_KEY_RELEASES = ["catalog-work-releases"];
const STALE_TIME = 10 * 60 * 1000; // 10 minutos

// Converte DynamicWork para formato compatível com o catálogo
function convertDynamicWork(dw) {
  return {
    slug: dw.slug,
    title: dw.title,
    title_pt: dw.title_pt,
    romaji_title: dw.romaji_title,
    categories: dw.categories ? JSON.parse(dw.categories) : [],
    genres: dw.genres ? JSON.parse(dw.genres) : [],
    synopsis: dw.synopsis,
    totalEpisodes: dw.episodes || null,
    totalChapters: dw.chapters || null,
    totalVolumes: dw.volumes || null,
    animeStatus: dw.anime_status,
    mangaStatus: dw.manga_status,
    mal_id: dw.mal_id,
    manga_mal_id: dw.manga_mal_id,
    score: dw.score,
    rating: dw.score, // normaliza para o campo usado no catálogo
    year: dw.year,
    popularity_rank: dw.popularity_rank,
    is_trending: dw.is_trending || false,
    trending_rank: dw.trending_rank,
    is_currently_airing: dw.is_currently_airing || false,
    franchise_id: dw.franchise_id || null,
    franchise_title: dw.franchise_title || null,
    franchise_score: dw.franchise_score || null,
    franchise_poster_url: dw.franchise_poster_url || null,
    seasons: parseSeasons(dw.seasons),
    related_franchise_id: dw.related_franchise_id || null,
    cover: null,
    image_url: dw.franchise_poster_url || dw.image_url,
    rating: dw.franchise_score || dw.score,
    _source: "dynamic",
    _dynamicRecord: dw,
  };
}

// Mescla item estático com CatalogSync
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
    romaji_title: syncRecord.romaji_title || work.romaji_title || null,
    _syncRecord: syncRecord,
    _isManualOverride: syncRecord.sync_status === "manual_override",
  };
}

// Deduplicação por mal_id, slug, título normalizado
function deduplicateCatalog(items) {
  const seen = new Map();
  const result = [];

  for (const item of items) {
    const malKey = item.mal_id || item.manga_mal_id;
    const slugKey = item.slug;
    const titleKey = (item.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (malKey && seen.has(`mal:${malKey}`)) continue;
    if (slugKey && seen.has(`slug:${slugKey}`)) continue;
    if (titleKey && seen.has(`title:${titleKey}`)) continue;

    if (malKey) seen.set(`mal:${malKey}`, true);
    if (slugKey) seen.set(`slug:${slugKey}`, true);
    if (titleKey) seen.set(`title:${titleKey}`, true);

    result.push(item);
  }

  return result;
}

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const queryClient = useQueryClient();

  // Carrega CatalogSync
  const { data: syncRecords = [], isLoading: syncLoading } = useQuery({
    queryKey: QUERY_KEY_SYNC,
    queryFn: () => base44.entities.CatalogSync.list("-synced_at", 1000),
    staleTime: STALE_TIME,
  });

  // Carrega DynamicWork
  const { data: dynamicWorks = [], isLoading: dynamicLoading } = useQuery({
    queryKey: QUERY_KEY_DYNAMIC,
    queryFn: () => base44.entities.DynamicWork.list("popularity_rank", 5000),
    staleTime: STALE_TIME,
  });

  // Fase 2H: Carrega WorkRelease em lote (uma query, não N+1)
  const { data: workReleases = [], isLoading: releasesLoading } = useQuery({
    queryKey: QUERY_KEY_RELEASES,
    queryFn: () => base44.entities.WorkRelease.list("-created_date", 5000),
    staleTime: STALE_TIME,
  });

  const isLoading = syncLoading || dynamicLoading || releasesLoading;

  // Constrói mapa slug → CatalogSync
  const syncMap = useMemo(() => {
    const map = new Map();
    for (const r of syncRecords) {
      if (r.slug) map.set(r.slug, r);
    }
    return map;
  }, [syncRecords]);

  // Constrói mapa para deduplicação de DynamicWork
  const dynamicMap = useMemo(() => {
    const map = new Map();
    for (const dw of dynamicWorks) {
      map.set(dw.slug, dw);
    }
    return map;
  }, [dynamicWorks]);

  // Fase 2H: Mapa group_id → [WorkRelease] (lote único, evita N+1)
  const releasesByGroupId = useMemo(() => {
    const map = new Map();
    for (const r of workReleases) {
      if (!r.group_id) continue;
      if (!map.has(r.group_id)) map.set(r.group_id, []);
      map.get(r.group_id).push(r);
    }
    return map;
  }, [workReleases]);

  // Array mesclado: static → CatalogSync → DynamicWork (prioridade inversa)
  const catalog = useMemo(() => {
    let merged = [];

    // Fonte 1: Catálogo estático (base)
    merged.push(...CATALOG.map((work) => mergeItem(work, syncMap.get(work.slug))));

    // Fonte 3: DynamicWork (nova, sobrescreve estático)
    for (const dw of dynamicWorks) {
      const existsStatic = CATALOG.find(w => w.slug === dw.slug);
      if (!existsStatic) {
        merged.push(convertDynamicWork(dw));
      } else {
        // Se existe no estático, sobrescrever com DynamicWork (camados do DW têm prioridade)
        const idx = merged.findIndex(w => w.slug === dw.slug);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...convertDynamicWork(dw) };
        }
      }
    }

    // Fase 2H: Enriquecer com releases (WorkRelease canônico OU seasons[] legado)
    // Regra: nunca mostrar WorkRelease + seasons[] juntos para a mesma obra.
    for (const item of merged) {
      if (item._dynamicRecord) {
        const { releases, source } = resolveReleasesSync(item._dynamicRecord, releasesByGroupId);
        item.releases = releases;
        item.release_source = source;
        item.has_work_releases = source === "work_release";
        item.release_count = releases.length;
        if (source === "work_release") {
          item.seasons = []; // não usar seasons[] junto com WorkRelease
        }
      } else {
        // Item estático — sem releases canônicos
        item.releases = [];
        item.release_source = "legacy_seasons";
        item.has_work_releases = false;
        item.release_count = 0;
      }
    }

    // Deduplicate, drop alias slugs, keep only works with at least one active category
    return deduplicateCatalog(merged)
      .filter(item => !isAliasSlug(item.slug))
      .filter(item => hasActiveCategory(item.categories))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }, [syncMap, dynamicWorks, releasesByGroupId]);

  const getBySlug = useCallback(
    (slug) => {
      const resolved = resolveAlias(slug);
      return catalog.find((w) => w.slug === resolved) || null;
    },
    [catalog]
  );

  const getByCategory = useCallback(
    (category) => {
      // 'all' returns the full active catalog (already filtered to active categories)
      if (category === 'all') return catalog;
      // Frozen categories return empty
      if (isCategoryFrozen(category)) return [];
      return catalog
        .filter((w) => w.categories?.includes(category))
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    },
    [catalog]
  );

  const getByMalId = useCallback(
    (malId) => catalog.find((w) => w.mal_id === malId || w.manga_mal_id === malId) || null,
    [catalog]
  );

  const refreshCatalog = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY_SYNC });
    queryClient.invalidateQueries({ queryKey: QUERY_KEY_DYNAMIC });
    queryClient.invalidateQueries({ queryKey: QUERY_KEY_RELEASES });
  }, [queryClient]);

  const getCatalogStats = useCallback(() => {
    const stats = { total: catalog.length, anime: 0, manga: 0, movie: 0, liveaction: 0 };
    for (const w of catalog) {
      for (const cat of w.categories || []) {
        if (stats[cat] !== undefined) stats[cat]++;
      }
    }
    // Zero counters for frozen categories (don't expose in active product)
    for (const frozen of FROZEN_CATEGORIES) {
      stats[frozen] = 0;
    }
    return stats;
  }, [catalog]);

  const value = useMemo(
    () => ({ catalog, isLoading, getBySlug, getByCategory, getByMalId, refreshCatalog, getCatalogStats }),
    [catalog, isLoading, getBySlug, getByCategory, getByMalId, refreshCatalog, getCatalogStats]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}