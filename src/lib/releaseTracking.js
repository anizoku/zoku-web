/**
 * releaseTracking.js — Helpers síncronos para resolução de entries por release.
 *
 * Prioridade de resolução:
 *   1. AnimeEntry.release_id === release.release_id (match exato)
 *   2. AnimeEntry.season_mal_id === release.mal_id (fallback legado)
 *   3. null (sem match — NÃO fuzzy match)
 *
 * Regras:
 * - Nunca fuzzy matching.
 * - Nunca associa por title/slug/genre.
 * - Só relações canônicas (release_id ou season_mal_id).
 */

import { isCategoryActive } from "@/lib/scopeConfig";

// Module-level cache for release map (evita rebuild por instância de componente)
let _releaseMapCache = { catalogRef: null, map: null };

/**
 * Encontra a AnimeEntry do usuário para um release específico.
 *
 * @param {Array} entries — todas as AnimeEntry do usuário
 * @param {Object} release — release normalizado (de workReleases.js)
 * @param {string} userEmail — email do usuário
 * @returns {Object|null} — a entry correspondente, ou null
 */
export function findEntryForRelease(entries, release, userEmail) {
  if (!entries || !release || !userEmail) return null;

  const userEntries = entries.filter((e) => e.created_by === userEmail);

  // 1. release_id direto (match exato)
  if (release.release_id) {
    const byReleaseId = userEntries.find((e) => e.release_id === release.release_id);
    if (byReleaseId) return byReleaseId;
  }

  // 2. season_mal_id fallback (legado)
  if (release.mal_id != null) {
    const byMalId = userEntries.find((e) => e.season_mal_id === release.mal_id);
    if (byMalId) return byMalId;
  }

  // 3. Sem match — NÃO fuzzy match
  return null;
}

/**
 * Filtra releases por categoria ativa (Anime Only).
 *
 * Um release com category=anime e format=MOVIE continua ativo.
 * Um release com category=manga é filtrado quando manga está congelado.
 */
export function filterActiveReleases(releases) {
  if (!releases) return [];
  return releases.filter((r) => isCategoryActive(r.category));
}

const RELEASE_STATUS_LABELS = {
  releasing: "Em exibição",
  finished: "Finalizado",
  not_yet_released: "Em breve",
  cancelled: "Cancelado",
  hiatus: "Em hiato",
};

export function getReleaseStatusLabel(release) {
  if (!release?.status) return null;
  return RELEASE_STATUS_LABELS[release.status] || null;
}

/**
 * Retorna { label, airing } para o status do release.
 * Usado pelo EntryCard para exibir badge de status com prioridade sobre o franchise.
 */
export function getReleaseStatusInfo(release) {
  if (!release?.status) return null;
  const label = RELEASE_STATUS_LABELS[release.status];
  if (!label) return null;
  return { label, airing: release.status === "releasing" };
}

/**
 * Constrói um label legível para o release.
 *
 * Exemplos:
 * - "Hunter x Hunter (1999)" — TV com ano, sem season_number
 * - "Attack on Titan — Temporada 2" — TV com season_number
 * - "Entertainment District Arc" — título do release difere do franchise
 * - "OVA 1" — format=OVA com release_order
 * - "Especial" — format=SPECIAL sem número
 */
export function buildReleaseLabel(release, franchiseTitle) {
  if (!release) return franchiseTitle || "";

  const fmt = (release.format || "").toUpperCase();
  const title = release.title || franchiseTitle || "";
  const year = release.season_year;
  const seasonNum = release.season_number;
  const order = release.release_order;

  // Se o título do release difere do franchise, usar o título do release
  if (title && title !== franchiseTitle) {
    return title;
  }

  // OVA / SPECIAL / ONA sem season_number
  if (fmt === "OVA" || fmt === "SPECIAL" || fmt === "ONA") {
    const label = fmt === "SPECIAL" ? "Especial" : fmt;
    if (order != null && order > 0) return `${label} ${order}`;
    if (seasonNum != null && seasonNum > 0) return `${label} ${seasonNum}`;
    return label;
  }

  // MOVIE
  if (fmt === "MOVIE") {
    if (year) return `${franchiseTitle} (${year})`;
    return franchiseTitle || title;
  }

  // TV com season_number
  if (seasonNum != null && seasonNum >= 1) {
    return `${franchiseTitle} — Temporada ${seasonNum}`;
  }

  // TV com ano mas sem season_number
  if (year) {
    return `${franchiseTitle} (${year})`;
  }

  return title || franchiseTitle || "";
}

/**
 * Constrói um subtítulo descritivo para o release.
 * Ex: "TV · 62 ep. · 1999"
 */
export function buildReleaseSubtitle(release) {
  if (!release) return "";

  const parts = [];
  const fmt = release.format || "";

  if (fmt) parts.push(fmt);

  if (release.category === "manga") {
    if (release.chapter_count && release.chapter_count > 0) {
      parts.push(`${release.chapter_count} cap.`);
    }
  } else {
    if (release.episode_count && release.episode_count > 0) {
      parts.push(`${release.episode_count} ep.`);
    }
  }

  if (release.season_year) {
    parts.push(String(release.season_year));
  }

  return parts.join(" · ");
}

/**
 * Constrói um mapa release_id → { work, release } para lookup O(1).
 * Cacheia no nível do módulo — todas as instâncias compartilham o mesmo mapa.
 */
export function getReleaseMap(catalog) {
  if (_releaseMapCache.catalogRef === catalog && _releaseMapCache.map) {
    return _releaseMapCache.map;
  }
  const map = new Map();
  if (catalog) {
    for (const work of catalog) {
      for (const release of work.releases || []) {
        if (release.release_id) {
          map.set(release.release_id, { work, release });
        }
        if (release.mal_id != null) {
          map.set(`mal:${release.mal_id}`, { work, release });
        }
      }
    }
  }
  _releaseMapCache = { catalogRef: catalog, map };
  return map;
}

/**
 * Resolve o release de uma AnimeEntry a partir do catálogo.
 * Retorna { work, release } ou null.
 */
export function resolveEntryRelease(entry, catalog) {
  if (!entry || !catalog) return null;
  const map = getReleaseMap(catalog);

  if (entry.release_id) {
    return map.get(entry.release_id) || null;
  }

  if (entry.season_mal_id != null) {
    return map.get(`mal:${entry.season_mal_id}`) || null;
  }

  return null;
}