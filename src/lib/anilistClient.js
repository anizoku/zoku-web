/**
 * anilistClient.js — Cliente GraphQL para a API pública do AniList.
 *
 * Endpoint: https://graphql.anilist.co (público, sem auth para leitura).
 * Rate limit: ~90 req/min (não documentado oficialmente — usar com moderação).
 *
 * Funções:
 * - searchAnilistByText(search, type) → busca por texto
 * - getAnilistById(anilistId, type) → leitura por AniList ID
 * - getAnilistByMalId(idMal, type) → leitura por MAL ID (idMal)
 *
 * type: "ANIME" | "MANGA"
 *
 * Nenhuma escrita no banco — este módulo é puramente de leitura/consulta.
 */

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

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
 * Busca obra no AniList por AniList ID.
 * @returns {object|null} media normalizada ou null se não encontrar
 */
export async function getAnilistById(anilistId, type = "ANIME") {
  const data = await anilistRequest(QUERY_BY_ID, { id: Number(anilistId), type });
  return data?.Media || null;
}

/**
 * Busca obra no AniList por MAL ID (idMal).
 * @returns {object|null} media normalizada ou null se não encontrar
 */
export async function getAnilistByMalId(idMal, type = "ANIME") {
  const data = await anilistRequest(QUERY_BY_MAL_ID, { idMal: Number(idMal), type });
  return data?.Media || null;
}

/**
 * Busca obras no AniList por texto.
 * @returns {array} lista de medias normalizadas (até perPage)
 */
export async function searchAnilistByText(search, type = "ANIME", perPage = 5) {
  const data = await anilistRequest(QUERY_SEARCH, { search, type, perPage });
  return data?.Page?.media || [];
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