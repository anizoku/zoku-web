/**
 * anilistClient.js — Cliente GraphQL para a API pública do AniList.
 *
 * Endpoint: https://graphql.anilist.co (público, sem auth para leitura).
 * Rate limit: ~90 req/min (não documentado oficialmente — usar com moderação).
 *
 * ────────────────────────────────────────────────────────────────────
 * PONTO 11 — Client-side vs Backend-side
 * ────────────────────────────────────────────────────────────────────
 * AniList é público e sem chave, então chamadas client-side são aceitáveis
 * para DRY-RUN e BUSCA (Fase 3A).
 *
 * SYNC futuro (Fase 3B+) deve ser BACKEND-SIDE (backend function) porque:
 *   - Evita expor lógica de upsert ao cliente
 *   - Permite controle centralizado de rate limit
 *   - Permite persistir ExternalMapping/SyncConflict com asServiceRole
 *   - Evita que usuários disparem syncs arbitrários
 *
 * Este módulo é CLIENT-SIDE por design (dry-run/busca). NÃO usar para sync
 * real — mover para base44/functions/ quando a Fase 3B começar.
 *
 * ────────────────────────────────────────────────────────────────────
 * PONTO 12 — Cache + Debounce
 * ────────────────────────────────────────────────────────────────────
 * Cache em memória com TTL de 5 minutos para evitar chamadas repetidas.
 * Para buscas por texto em UI (autocomplete), o COMPONENTE deve aplicar
 * debounce de ~500ms antes de chamar searchAnilistByText() — o cache aqui
 * evita refetch da mesma query, mas não substitui debounce no caller.
 *
 * Funções:
 * - searchAnilistByText(search, type) → busca por texto (com cache)
 * - getAnilistById(anilistId, type) → leitura por AniList ID (com cache)
 * - getAnilistByMalId(idMal, type) → leitura por MAL ID (com cache)
 * - clearAnilistCache() → limpa o cache (para testes/refresh manual)
 *
 * type: "ANIME" | "MANGA"
 *
 * Nenhuma escrita no banco — este módulo é puramente de leitura/consulta.
 */

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

// ── Cache em memória (PONTO 12) ──
// Chave: `${type}:${kind}:${id}` onde kind = "id" | "mal" | "search"
// TTL: 5 minutos. Evita refetch da mesma query dentro da janela.
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  _cache.set(key, { value, ts: Date.now() });
}

/**
 * Limpa o cache do AniList. Útil para forçar refresh após edição manual
 * ou para testes determinísticos.
 */
export function clearAnilistCache() {
  _cache.clear();
}

// Query GraphQL base — campos normalizados para o formato interno
const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  format
  status
  season
  seasonYear
  episodes
  chapters
  volumes
  duration
  genres
  averageScore
  meanScore
  popularity
  trending
  coverImage { large extraLarge }
  bannerImage
  siteUrl
  relations {
    edges {
      relationType
      node {
        id
        idMal
        type
        format
        title { romaji english native }
      }
    }
  }
`;

const QUERY_BY_ID = `
  query ($id: Int, $type: MediaType) {
    Media(id: $id, type: $type) {
      ${MEDIA_FIELDS}
    }
  }
`;

const QUERY_BY_MAL_ID = `
  query ($idMal: Int, $type: MediaType) {
    Media(idMal: $idMal, type: $type) {
      ${MEDIA_FIELDS}
    }
  }
`;

const QUERY_SEARCH = `
  query ($search: String, $type: MediaType, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: $type, sort: SEARCH_MATCH) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

async function anilistRequest(query, variables) {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AniList API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`AniList GraphQL error: ${json.errors.map(e => e.message).join("; ")}`);
  }
  return json.data;
}

/**
 * Busca obra no AniList por AniList ID (com cache).
 * @returns {object|null} media normalizada ou null se não encontrar
 */
export async function getAnilistById(anilistId, type = "ANIME") {
  const key = `${type}:id:${anilistId}`;
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  const data = await anilistRequest(QUERY_BY_ID, { id: Number(anilistId), type });
  const result = data?.Media || null;
  cacheSet(key, result);
  return result;
}

/**
 * Busca obra no AniList por MAL ID (idMal) (com cache).
 * @returns {object|null} media normalizada ou null se não encontrar
 */
export async function getAnilistByMalId(idMal, type = "ANIME") {
  const key = `${type}:mal:${idMal}`;
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  const data = await anilistRequest(QUERY_BY_MAL_ID, { idMal: Number(idMal), type });
  const result = data?.Media || null;
  cacheSet(key, result);
  return result;
}

/**
 * Busca obras no AniList por texto (com cache).
 *
 * PONTO 12: O cache evita refetch da mesma query. O CALLER deve aplicar
 * debounce de ~500ms em UI de autocomplete antes de chamar esta função.
 * @returns {array} lista de medias normalizadas (até perPage)
 */
export async function searchAnilistByText(search, type = "ANIME", perPage = 5) {
  const key = `${type}:search:${search}:${perPage}`;
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  const data = await anilistRequest(QUERY_SEARCH, { search, type, perPage });
  const result = data?.Page?.media || [];
  cacheSet(key, result);
  return result;
}

/**
 * Normaliza dados crus do AniList para o formato interno.
 * Não inclui raw_payload — apenas campos leves e estruturados.
 */
export function normalizeAnilistMedia(media) {
  if (!media) return null;
  return {
    anilist_id: media.id,
    idMal: media.idMal ? Number(media.idMal) : null,
    title_romaji: media.title?.romaji || null,
    title_english: media.title?.english || null,
    title_native: media.title?.native || null,
    format: media.format || null, // TV, MOVIE, OVA, ONA, SPECIAL, MANGA, NOVEL
    status: media.status || null, // FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS
    season: media.season?.toLowerCase() || null, // winter, spring, summer, fall
    season_year: media.seasonYear || null,
    episodes: media.episodes || null,
    chapters: media.chapters || null,
    volumes: media.volumes || null,
    duration_minutes: media.duration || null,
    genres: media.genres || [],
    score: media.averageScore ? media.averageScore / 10 : null, // AniList usa 0-100, normaliza para 0-10
    popularity: media.popularity || null,
    trending_score: media.trending || 0,
    cover_url: media.coverImage?.large || media.coverImage?.extraLarge || null,
    banner_url: media.bannerImage || null,
    site_url: media.siteUrl || null,
    relations: (media.relations?.edges || []).map(edge => ({
      relation_type: edge.relationType, // PREQUEL, SEQUEL, SIDE_STORY, etc.
      anilist_id: edge.node?.id,
      idMal: edge.node?.idMal ? Number(edge.node.idMal) : null,
      type: edge.node?.type, // ANIME, MANGA
      format: edge.node?.format,
      title_romaji: edge.node?.title?.romaji || null,
      title_english: edge.node?.title?.english || null,
    })),
  };
}