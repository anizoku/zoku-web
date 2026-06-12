import { useState, useEffect } from "react";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTZmODg0N2U2ZDU5MTNiMDU4ODc0MDhiNjkyY2Q0YyIsIm5iZiI6MTc3Nzk4Nzc3Ni45OTYsInN1YiI6IjY5ZjlmMGMwNjJkMjIyYmQ5YTU1ZjVkYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.4efs6BG9Eadk5bqpUDdlGkxjAfqtECGqYofB62Fhaz4";

const TTL_24H = 24 * 60 * 60 * 1000;
const posterCache = new Map();

// Persistent cache with 24h TTL
function getPosterFromStorage(key) {
  try {
    const raw = localStorage.getItem(`tmdb_poster__${key}`);
    if (!raw) return undefined;
    const { url, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL_24H) { localStorage.removeItem(`tmdb_poster__${key}`); return undefined; }
    return url;
  } catch { return undefined; }
}
function savePosterToStorage(key, url) {
  try { localStorage.setItem(`tmdb_poster__${key}`, JSON.stringify({ url, ts: Date.now() })); } catch {}
}

// Concurrency queue — max 5 simultaneous TMDB requests
const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5;
function processQueue() {
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    const { key, title, type, resolve } = requestQueue.shift();
    doFetch(key, title, type).then(resolve).finally(() => { activeRequests--; processQueue(); });
  }
}
async function doFetch(key, title, type) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(title)}&language=pt-BR`,
      { headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTZmODg0N2U2ZDU5MTNiMDU4ODc0MDhiNjkyY2Q0YyIsIm5iZiI6MTc3Nzk4Nzc3Ni45OTYsInN1YiI6IjY5ZjlmMGMwNjJkMjIyYmQ5YTU1ZjVkYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.4efs6BG9Eadk5bqpUDdlGkxjAfqtECGqYofB62Fhaz4`, Accept: "application/json" } }
    );
    if (!res.ok) throw new Error("TMDB error");
    const data = await res.json();
    const posterPath = data.results?.[0]?.poster_path;
    const url = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
    posterCache.set(key, url);
    savePosterToStorage(key, url);
    return url;
  } catch {
    posterCache.set(key, null);
    savePosterToStorage(key, null);
    return null;
  }
}

async function fetchPoster(title, type) {
  const key = `${title}::${type}`;
  if (posterCache.has(key)) return posterCache.get(key);
  // Check localStorage 24h cache
  const stored = getPosterFromStorage(key);
  if (stored !== undefined) { posterCache.set(key, stored); return stored; }

  // Enqueue request
  return new Promise((resolve) => {
    requestQueue.push({ key, title, type, resolve });
    processQueue();
  });
}

/**
 * Returns the best poster URL for a catalog item.
 * 
 * - liveaction items: search by liveActionTMDBSearch (or liveActionTitle), type=tv or movie
 * - manga-only: skip TMDB, use cover
 * - movie-only: search by title, type=movie
 * - anime: search by title, type=tv
 */
export function useTMDBPoster(item, forceCategory) {
  const cats = item.categories;
  const isMangaOnly = cats.length === 1 && cats[0] === "manga";
  const isLiveActionContext = forceCategory === "liveaction" || (cats.length === 1 && cats[0] === "liveaction");
  const isMovieOnly = cats.length === 1 && cats[0] === "movie";

  const [posterUrl, setPosterUrl] = useState(item.cover || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Manga-only: no TMDB
    if (isMangaOnly) {
      setPosterUrl(item.cover || null);
      return;
    }

    // Live-action context: search for the live-action title specifically
    if (isLiveActionContext) {
      const searchTitle = item.liveActionTMDBSearch || item.liveActionTitle || item.title;
      // Detect if it's a movie live-action (single standalone film entry)
      const isLiveActionMovie = item.liveActionIsMovie || false;
      const tmdbType = isLiveActionMovie ? "movie" : "tv";
      setLoading(true);
      fetchPoster(searchTitle, tmdbType).then((url) => {
        setPosterUrl(url || item.cover || null);
        setLoading(false);
      });
      return;
    }

    // Movie-only: search as movie
    if (isMovieOnly) {
      setLoading(true);
      fetchPoster(item.title, "movie").then((url) => {
        setPosterUrl(url || item.cover || null);
        setLoading(false);
      });
      return;
    }

    // Anime (default): search as tv
    setLoading(true);
    fetchPoster(item.title, "tv").then((url) => {
      setPosterUrl(url || item.cover || null);
      setLoading(false);
    });
  }, [item.slug, isLiveActionContext]);

  return { posterUrl, loading };
}