// Jikan API v4 — wrapper gratuito do MyAnimeList
// Rate limit: ~3 req/s, sem autenticação

const JIKAN_BASE = "https://api.jikan.moe/v4";

// Delay helper
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function jikanSearch(type, query) {
  const url = `${JIKAN_BASE}/${type}?q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error("Jikan rate limit atingido. Aguarde e tente novamente.");
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);
  const data = await res.json();
  return data.data?.[0] || null;
}

export async function jikanById(type, malId) {
  const url = `${JIKAN_BASE}/${type}/${malId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || null;
}

// Retorna { totalEpisodes, totalChapters, airing, publishing, malId } para uma obra
export async function syncWorkFromJikan(work) {
  const isAnime = work.categories?.includes("anime");
  const isManga = work.categories?.includes("manga");

  const results = {};

  if (isAnime && (work.animeStatus === "Em exibição" || !work.animeStatus?.includes("Finalizado"))) {
    try {
      const data = work.mal_id
        ? await jikanById("anime", work.mal_id)
        : await jikanSearch("anime", work.title);

      if (data) {
        results.malId = data.mal_id;
        results.totalEpisodes = data.episodes || work.totalEpisodes;
        results.airing = data.airing;
        results.animeScore = data.score;
      }
    } catch {}
  }

  if (isManga && (work.mangaStatus === "Em publicação" || work.mangaStatus?.includes("publicação"))) {
    await delay(400);
    try {
      const data = work.manga_mal_id
        ? await jikanById("manga", work.manga_mal_id)
        : await jikanSearch("manga", work.title);

      if (data) {
        results.mangaMalId = data.mal_id;
        results.totalChapters = data.chapters || work.totalChapters;
        results.publishing = data.publishing;
        results.mangaScore = data.score;
      }
    } catch {}
  }

  return results;
}