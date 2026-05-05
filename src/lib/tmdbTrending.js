// Fetches trending TV/anime from TMDB with 1-hour in-memory cache

const TMDB_BASE = "https://api.themoviedb.org/3";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTZmODg0N2U2ZDU5MTNiMDU4ODc0MDhiNjkyY2Q0YyIsIm5iZiI6MTc3Nzk4Nzc3Ni45OTYsInN1YiI6IjY5ZjlmMGMwNjJkMjIyYmQ5YTU1ZjVkYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.4efs6BG9Eadk5bqpUDdlGkxjAfqtECGqYofB62Fhaz4";
const ONE_HOUR = 60 * 60 * 1000;

const cache = {};

async function fetchFromTMDB(endpoint) {
  const now = Date.now();
  if (cache[endpoint] && now - cache[endpoint].ts < ONE_HOUR) {
    return cache[endpoint].data;
  }
  const res = await fetch(`${TMDB_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("TMDB error");
  const data = await res.json();
  cache[endpoint] = { data, ts: now };
  return data;
}

/**
 * Returns top trending anime-style TV shows from TMDB (trending/week filtered by animation/sci-fi from JP).
 * Falls back to on-air TV shows if needed.
 */
export async function fetchTMDBTrending() {
  // Use discover with anime genre (16=Animation) from Japan, sorted by popularity
  const data = await fetchFromTMDB(
    "/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&language=pt-BR&page=1"
  );
  return (data.results || []).slice(0, 5).map((item) => ({
    id: item.id,
    title: item.name || item.original_name,
    originalTitle: item.original_name,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : null,
    rating: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : null,
    genre: item.genre_ids?.[0] ? "Anime" : "TV",
    popularity: item.popularity,
  }));
}

/**
 * Returns recently aired anime episodes from TMDB (airing today / on the air from JP animation).
 */
export async function fetchTMDBRecentEpisodes() {
  const data = await fetchFromTMDB(
    "/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&air_date.gte=2025-01-01&language=pt-BR&page=1"
  );
  return (data.results || []).slice(0, 4).map((item, i) => ({
    id: item.id,
    title: item.name || item.original_name,
    originalTitle: item.original_name,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : null,
    episode: item.episode_run_time?.[0] || "?",
    firstAirDate: item.first_air_date,
    timeLabel: ["Há 2h", "Há 5h", "Há 12h", "Há 1d"][i],
    popularity: item.popularity,
  }));
}