/**
 * workReleases.js — Camada central de leitura de releases de uma obra.
 *
 * Dual-read: WorkRelease (novo, canônico) OU seasons[] (legado).
 * Nunca retorna os dois ao mesmo tempo — evita duplicação visual.
 *
 * Regra:
 * 1. Se DynamicWork.sync_release_completed = true E release_count > 0:
 *    - buscar WorkRelease por group_id
 *    - se encontrar, retornar normalizado (source: "work_release")
 * 2. Senão (ou se buscar e vier vazio):
 *    - fallback para seasons[] legado
 *    - retornar normalizado (source: "legacy_seasons")
 *
 * Estrutura uniforme por release:
 *   { id, release_id, group_id, group_slug, slug, title, category, format,
 *     season_number, release_order, display_order, episode_count, season_year,
 *     cover_url, synopsis, score, mal_id, source }
 *
 * Ordenação: display_order → release_order → sort_order → season_number → title
 */

import { base44 } from "@/api/base44Client";
import { parseSeasons } from "@/lib/franchiseDetection";

/**
 * Normaliza um WorkRelease (entidade nova) para a estrutura uniforme.
 */
function normalizeWorkRelease(r, malIdByReleaseId) {
  return {
    id: r.id,
    release_id: r.id,
    group_id: r.group_id,
    group_slug: r.group_slug,
    slug: r.slug,
    title: r.title,
    title_romaji: r.title_romaji || null,
    title_english: r.title_english || null,
    title_native: r.title_native || null,
    category: r.category,
    format: r.format || null,
    season_number: r.season_number ?? null,
    release_order: r.release_order ?? null,
    display_order: r.display_order ?? r.release_order ?? null,
    episode_count: r.episode_count ?? null,
    season_year: r.season_year ?? null,
    cover_url: r.cover_url || null,
    synopsis: r.synopsis || null,
    score: r.score ?? null,
    status: r.status || null,
    chapter_count: r.chapter_count ?? null,
    duration_minutes: r.duration_minutes ?? null,
    mal_id: malIdByReleaseId?.get(r.id) ?? null,
    source: "work_release",
  };
}

/**
 * Normaliza uma season legada (item de seasons[]) para a estrutura uniforme.
 */
function normalizeLegacySeason(s, idx, dynamicWork) {
  let cats = [];
  try { cats = dynamicWork.categories ? JSON.parse(dynamicWork.categories) : []; } catch {}
  let category = "anime";
  if (cats.includes("movie")) category = "movie";
  else if (cats.includes("liveaction")) category = "liveaction";
  else if (cats.includes("manga")) category = "manga";

  const st = (s.season_title || "").toLowerCase();
  let format = "TV";
  if (st.includes("movie") || st.includes("film") || category === "movie") format = "MOVIE";
  else if (st.includes("ova")) format = "OVA";
  else if (st.includes("ona")) format = "ONA";
  else if (st.includes("special")) format = "SPECIAL";

  const sn = s.season_number != null ? s.season_number : null;
  const sortOrder = s.sort_order != null ? s.sort_order : idx + 1;

  return {
    // id sintético para legado (não há entidade dedicada)
    id: `legacy:${dynamicWork.id}:${s.mal_id ?? idx}`,
    release_id: null,
    group_id: dynamicWork.id,
    group_slug: dynamicWork.slug,
    slug: `${dynamicWork.slug}-${sn ?? idx + 1}`,
    title: s.season_title || dynamicWork.title,
    category,
    format,
    season_number: sn,
    release_order: sortOrder,
    display_order: sortOrder,
    episode_count: s.episodes ?? null,
    season_year: s.year ?? dynamicWork.year ?? null,
    cover_url: s.poster_url || dynamicWork.image_url || null,
    synopsis: s.synopsis || dynamicWork.synopsis || null,
    score: s.score ?? dynamicWork.score ?? null,
    mal_id: s.mal_id ?? null,
    source: "legacy_seasons",
  };
}

/**
 * Comparador de ordenação: display_order → release_order → sort_order → season_number → title
 */
function compareReleases(a, b) {
  const ao = a.display_order ?? a.release_order ?? 9999;
  const bo = b.display_order ?? b.release_order ?? 9999;
  if (ao !== bo) return ao - bo;

  const ar = a.release_order ?? 9999;
  const br = b.release_order ?? 9999;
  if (ar !== br) return ar - br;

  const asn = a.season_number ?? 9999;
  const bsn = b.season_number ?? 9999;
  if (asn !== bsn) return asn - bsn;

  return (a.title || "").localeCompare(b.title || "", "pt-BR");
}

/**
 * Obtém releases de uma obra (DynamicWork) usando dual-read.
 *
 * @param {Object} dynamicWork — registro DynamicWork (ou objeto compatível com .seasons, .id, .slug)
 * @param {Object} [options]
 * @param {boolean} [options.enrichMalId=true] — quando lendo de WorkRelease, busca mal_id no ExternalMapping
 * @returns {Promise<{ releases: Array, source: "work_release"|"legacy_seasons" }>}
 */
export async function getWorkReleases(dynamicWork, options = {}) {
  if (!dynamicWork) return { releases: [], source: "legacy_seasons" };

  const { enrichMalId = true } = options;

  // 1. Tentar WorkRelease se migrado
  const migrated =
    dynamicWork.sync_release_completed === true &&
    (dynamicWork.release_count || 0) > 0;

  if (migrated) {
    try {
      const releases = await base44.entities.WorkRelease.filter({
        group_id: dynamicWork.id,
      });

      if (releases.length > 0) {
        // Enriquecer mal_id via ExternalMapping (uma query por grupo)
        let malIdByReleaseId = new Map();
        if (enrichMalId) {
          try {
            const mappings = await base44.entities.ExternalMapping.filter({
              work_group_id: dynamicWork.id,
              provider: "mal",
            });
            for (const m of mappings) {
              if (m.work_release_id && m.provider_id) {
                malIdByReleaseId.set(m.work_release_id, Number(m.provider_id));
              }
            }
          } catch {
            // sem mapping não é fatal — mal_id fica null
          }
        }

        const normalized = releases
          .map((r) => normalizeWorkRelease(r, malIdByReleaseId))
          .sort(compareReleases);

        return { releases: normalized, source: "work_release" };
      }
    } catch {
      // erro ao ler WorkRelease → cai no fallback legado
    }
  }

  // 2. Fallback: seasons[] legado
  const seasons = parseSeasons(dynamicWork.seasons);
  const normalized = seasons
    .map((s, idx) => normalizeLegacySeason(s, idx, dynamicWork))
    .sort(compareReleases);

  return { releases: normalized, source: "legacy_seasons" };
}

/**
 * Variante síncrona SOMENTE para legado (seasons[]).
 * Útil em contextos onde já se tem o DynamicWork em memória e não há acesso a async
 * (ex: ordenação de catálogo em memória). Não consulta WorkRelease.
 *
 * @param {Object} dynamicWork
 * @returns {{ releases: Array, source: "legacy_seasons" }}
 */
export function getWorkReleasesLegacySync(dynamicWork) {
  if (!dynamicWork) return { releases: [], source: "legacy_seasons" };
  const seasons = parseSeasons(dynamicWork.seasons);
  const normalized = seasons
    .map((s, idx) => normalizeLegacySeason(s, idx, dynamicWork))
    .sort(compareReleases);
  return { releases: normalized, source: "legacy_seasons" };
}

/**
 * Constrói releases normalizados a partir de um lote de WorkRelease (sem queries).
 * Útil para enriquecer catálogo em memória sem N+1.
 */
export function buildReleasesFromBatch(workReleaseRecords, malIdByReleaseId = null) {
  if (!workReleaseRecords || workReleaseRecords.length === 0) return [];
  return workReleaseRecords
    .map((r) => normalizeWorkRelease(r, malIdByReleaseId))
    .sort(compareReleases);
}

/**
 * Dual-read síncrono: decide qual fonte usar dado um DynamicWork e um mapa
 * de WorkRelease por group_id (pré-carregado em lote). Sem queries.
 *
 * @param {Object} dynamicWork
 * @param {Map<string, Array>} releasesByGroupId — mapa group_id → [WorkRelease]
 * @returns {{ releases: Array, source: "work_release"|"legacy_seasons" }}
 */
export function resolveReleasesSync(dynamicWork, releasesByGroupId) {
  if (!dynamicWork) return { releases: [], source: "legacy_seasons" };

  const migrated =
    dynamicWork.sync_release_completed === true &&
    (dynamicWork.release_count || 0) > 0;

  if (migrated && releasesByGroupId) {
    const groupReleases = releasesByGroupId.get(dynamicWork.id) || [];
    if (groupReleases.length > 0) {
      return { releases: buildReleasesFromBatch(groupReleases), source: "work_release" };
    }
  }

  return { releases: getWorkReleasesLegacySync(dynamicWork).releases, source: "legacy_seasons" };
}