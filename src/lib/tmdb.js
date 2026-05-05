const TMDB_BASE = "https://api.themoviedb.org/3";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MTZmODg0N2U2ZDU5MTNiMDU4ODc0MDhiNjkyY2Q0YyIsIm5iZiI6MTc3Nzk4Nzc3Ni45OTYsInN1YiI6IjY5ZjlmMGMwNjJkMjIyYmQ5YTU1ZjVkYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.4efs6BG9Eadk5bqpUDdlGkxjAfqtECGqYofB62Fhaz4";

const STATUS_TV = {
  "Returning Series": "Em exibição",
  "Ended": "Finalizado",
  "Canceled": "Cancelado",
  "In Production": "Em produção",
  "Planned": "Planejado",
};

const STATUS_MOVIE = {
  "Released": "Lançado",
  "In Production": "Em produção",
  "Planned": "Planejado",
  "Post Production": "Pós-produção",
};

export const IMG = {
  poster: (path) => path ? `https://image.tmdb.org/t/p/w500${path}` : null,
  backdrop: (path) => path ? `https://image.tmdb.org/t/p/w1280${path}` : null,
  profile: (path) => path ? `https://image.tmdb.org/t/p/w185${path}` : null,
  logo: (path) => path ? `https://image.tmdb.org/t/p/w92${path}` : null,
};

async function tmdbFetch(path, lang = "pt-BR") {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${TMDB_BASE}${path}${sep}language=${lang}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (res.status === 401) throw new Error("Token TMDB inválido.");
  if (res.status === 429) throw new Error("Limite de requisições do TMDB atingido.");
  if (!res.ok) throw new Error(`Erro TMDB: ${res.status}`);
  return res.json();
}

function pickBestResult(results, title) {
  if (!results || results.length === 0) return null;
  const norm = title.toLowerCase().trim();
  return (
    results.find((r) => (r.title || r.name || "").toLowerCase() === norm) ||
    results[0]
  );
}

function extractCreators(details, type) {
  if (type === "tv") {
    if (details.created_by && details.created_by.length > 0) {
      return details.created_by.map((c) => ({ name: c.name, role: "Criador" }));
    }
    const wantedJobs = ["Creator", "Writer", "Original Story", "Screenplay", "Director", "Series Director"];
    const crew = (details.credits?.crew || []).filter((c) => wantedJobs.includes(c.job));
    return crew.slice(0, 3).map((c) => ({ name: c.name, role: c.job }));
  }
  // movie
  const directors = (details.credits?.crew || []).filter((c) => c.job === "Director");
  return directors.slice(0, 3).map((c) => ({ name: c.name, role: "Direção" }));
}

function extractTrailer(videos) {
  if (!videos?.results?.length) return null;
  const trailer = videos.results.find((v) => v.type === "Trailer" && v.site === "YouTube");
  if (trailer) return `https://www.youtube.com/watch?v=${trailer.key}`;
  const teaser = videos.results.find((v) => v.site === "YouTube");
  if (teaser) return `https://www.youtube.com/watch?v=${teaser.key}`;
  return null;
}

export async function getTMDBWorkDetails(title, type) {
  if (!TOKEN) return { found: false, error: "Token TMDB não configurado." };

  // 1. Search
  const searchData = await tmdbFetch(`/search/${type}?query=${encodeURIComponent(title)}`);
  const best = pickBestResult(searchData.results, title);
  if (!best) return { found: false, error: "Obra não encontrada no TMDB." };

  const id = best.id;
  const appendFields = type === "tv"
    ? "credits,images,external_ids,videos,keywords,content_ratings"
    : "credits,images,external_ids,videos,keywords,release_dates";

  // 2. Details (pt-BR)
  let details = await tmdbFetch(`/${type}/${id}?append_to_response=${appendFields}`);

  // 3. Fallback overview to en-US
  let overview = details.overview;
  if (!overview) {
    const detailsEn = await tmdbFetch(`/${type}/${id}`, "en-US");
    overview = detailsEn.overview || "Sinopse indisponível no momento.";
  }

  // 4. Watch providers
  const providersData = await tmdbFetch(`/${type}/${id}/watch/providers`);
  const br = providersData.results?.BR;

  // 5. Build object
  const tmdbTitle = type === "tv" ? details.name : details.title;
  const originalTitle = type === "tv" ? details.original_name : details.original_title;
  const fullDate = type === "tv" ? details.first_air_date : details.release_date;
  const year = fullDate ? fullDate.slice(0, 4) : null;

  const rawStatus = details.status;
  const statusMap = type === "tv" ? STATUS_TV : STATUS_MOVIE;
  const status = statusMap[rawStatus] || rawStatus || null;

  const genres = (details.genres || []).map((g) => g.name);

  const cast = (details.credits?.cast || []).slice(0, 10).map((a) => ({
    name: a.name,
    character: a.character,
    photoUrl: IMG.profile(a.profile_path),
  }));

  const creators = extractCreators(details, type);
  const trailerUrl = extractTrailer(details.videos);

  const seasons = type === "tv"
    ? (details.seasons || []).map((s) => ({
        name: s.name,
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
        airDate: s.air_date,
        posterUrl: IMG.poster(s.poster_path),
      }))
    : [];

  const watchProviders = br
    ? {
        country: "BR",
        link: br.link || null,
        streaming: br.flatrate || [],
        rent: br.rent || [],
        buy: br.buy || [],
      }
    : null;

  return {
    found: true,
    source: "TMDB",
    tmdbId: id,
    type,
    title: tmdbTitle,
    originalTitle,
    overview,
    posterUrl: IMG.poster(details.poster_path),
    backdropUrl: IMG.backdrop(details.backdrop_path),
    year,
    fullDate,
    genres,
    rating: details.vote_average ? Math.round(details.vote_average * 10) / 10 : null,
    voteCount: details.vote_count || 0,
    popularity: details.popularity || 0,
    status,
    numberOfSeasons: details.number_of_seasons || null,
    numberOfEpisodes: details.number_of_episodes || null,
    seasons,
    creators,
    cast,
    trailerUrl,
    externalIds: details.external_ids || {},
    watchProviders,
  };
}