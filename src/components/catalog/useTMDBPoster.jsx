import { useState, useEffect } from "react";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTZmODg0N2U2ZDU5MTNiMDU4ODc0MDhiNjkyY2Q0YyIsIm5iZiI6MTc3Nzk4Nzc3Ni45OTYsInN1YiI6IjY5ZjlmMGMwNjJkMjIyYmQ5YTU1ZjVkYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.4efs6BG9Eadk5bqpUDdlGkxjAfqtECGqYofB62Fhaz4";

const posterCache = new Map();

async function fetchPoster(title, type) {
  const key = `${title}::${type}`;
  if (posterCache.has(key)) return posterCache.get(key);

  try {
    const res = await fetch(
      `${TMDB_BASE}/search/${type}?query=${encodeURIComponent(title)}&language=pt-BR`,
      { headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" } }
    );
    if (!res.ok) throw new Error("TMDB error");
    const data = await res.json();
    const result = data.results?.[0];
    const posterPath = result?.poster_path;
    const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
    posterCache.set(key, posterUrl);
    return posterUrl;
  } catch {
    posterCache.set(key, null);
    return null;
  }
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