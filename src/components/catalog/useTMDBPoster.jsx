import { useState, useEffect } from "react";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTZmODg0N2U2ZDU5MTNiMDU4ODc0MDhiNjkyY2Q0YyIsIm5iZiI6MTc3Nzk4Nzc3Ni45OTYsInN1YiI6IjY5ZjlmMGMwNjJkMjIyYmQ5YTU1ZjVkYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.4efs6BG9Eadk5bqpUDdlGkxjAfqtECGqYofB62Fhaz4";

// Cache in-memory to avoid duplicate requests
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
 * Priority: item.posterUrl → TMDB fetch → item.cover → null
 * For manga-only items, skips TMDB and returns item.cover directly.
 */
export function useTMDBPoster(item) {
  const isMangaOnly = item.categories.length === 1 && item.categories[0] === "manga";
  const tmdbType = item.categories.includes("movie") && !item.categories.includes("anime") && !item.categories.includes("liveaction") ? "movie" : "tv";

  const [posterUrl, setPosterUrl] = useState(item.posterUrl || item.cover || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Manga-only: use existing cover, no TMDB
    if (isMangaOnly) {
      setPosterUrl(item.cover || null);
      return;
    }
    // Already have a TMDB poster saved
    if (item.posterUrl) {
      setPosterUrl(item.posterUrl);
      return;
    }
    // Fetch from TMDB
    setLoading(true);
    fetchPoster(item.title, tmdbType).then((url) => {
      setPosterUrl(url || item.cover || null);
      setLoading(false);
    });
  }, [item.slug]);

  return { posterUrl, loading };
}