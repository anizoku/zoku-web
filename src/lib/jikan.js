// Jikan API v4 — wrapper gratuito do MyAnimeList
// Rate limit: ~3 req/s, sem autenticação

const JIKAN_BASE = "https://api.jikan.moe/v4";

// Delay helper
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function jikanSearch(type, query) {
  const url = `${JIKAN_BASE}/${type}?q=${encodeURIComponent(query)}&limit=1&sfw=true`;
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

// Mapeia status do Jikan para português
export function mapAnimeStatus(status) {
  if (!status) return null;
  if (status === "Currently Airing") return "Em exibição";
  if (status === "Finished Airing") return "Finalizado";
  if (status === "Not yet aired") return "Em breve";
  return status;
}

export function mapMangaStatus(status) {
  if (!status) return null;
  if (status === "Publishing") return "Em publicação";
  if (status === "Finished") return "Concluído";
  if (status === "On Hiatus") return "Em hiato";
  if (status === "Discontinued") return "Descontinuado";
  return status;
}

// Retorna { totalEpisodes, totalChapters, airing, publishing, malId } para uma obra (anime ativo)
export async function syncWorkFromJikan(work) {
  const isAnime = work.categories?.includes("anime");
  const isManga = work.categories?.includes("manga");

  const results = {};

  if (isAnime && work.animeStatus === "Em exibição") {
    try {
      const data = work.mal_id
        ? await jikanById("anime", work.mal_id)
        : await jikanSearch("anime", work.title);

      if (data) {
        results.malId = data.mal_id;
        results.totalEpisodes = data.episodes || work.totalEpisodes;
        results.airing = data.airing;
        results.animeScore = data.score;
        results.animeStatus = mapAnimeStatus(data.status);
      }
    } catch {}
  }

  if (isManga && work.mangaStatus === "Em publicação") {
    await delay(400);
    try {
      const data = work.manga_mal_id
        ? await jikanById("manga", work.manga_mal_id)
        : await jikanSearch("manga", work.title);

      if (data) {
        results.mangaMalId = data.mal_id;
        results.totalChapters = data.chapters || work.totalChapters;
        results.totalVolumes = data.volumes;
        results.publishing = data.publishing;
        results.mangaScore = data.score;
        results.mangaStatus = mapMangaStatus(data.status);
      }
    } catch {}
  }

  return results;
}

// Sincroniza apenas os dados de um mangá específico pelo slug
export async function syncMangaData(work, onLog) {
  if (work.sync_status === "manual_override") {
    onLog?.(`${work.title}: ignorado (manual_override)`, "warn");
    return null;
  }

  const title = work.title;
  let data = null;

  try {
    if (work.manga_mal_id) {
      data = await jikanById("manga", work.manga_mal_id);
    } else {
      data = await jikanSearch("manga", title);
      // Tenta sem artigos se não encontrar
      if (!data) {
        const simplified = title.replace(/^(The |A |An )/i, "").replace(/[^a-zA-Z0-9\s]/g, "");
        data = await jikanSearch("manga", simplified);
      }
    }
  } catch (err) {
    onLog?.(`${title}: erro na busca — ${err.message}`, "error");
    return null;
  }

  if (!data) {
    onLog?.(`${title}: não encontrado no Jikan`, "warn");
    return { sync_status: "not_found" };
  }

  const newChapters = data.chapters;
  const newVolumes = data.volumes;
  const newStatus = mapMangaStatus(data.status);
  const changes = [];

  if (newChapters && newChapters !== work.totalChapters) {
    changes.push(`${work.totalChapters ?? "?"} → ${newChapters} caps`);
  }
  if (newVolumes && newVolumes !== work.totalVolumes) {
    changes.push(`${work.totalVolumes ?? "?"} → ${newVolumes} vols`);
  }

  if (changes.length > 0) {
    onLog?.(`${title}: atualizado (${changes.join(", ")})`, "success");
  } else {
    onLog?.(`${title}: sem alterações`, "info");
  }

  return {
    manga_mal_id: data.mal_id,
    totalChapters: newChapters || work.totalChapters,
    totalVolumes: newVolumes || work.totalVolumes,
    mangaStatus: newStatus || work.mangaStatus,
    mangaScore: data.score,
    last_synced_at: new Date().toISOString(),
    sync_status: "synced",
    _changed: changes.length > 0,
  };
}

// Percorre todos os mangás em publicação e sincroniza (delay 400ms entre cada)
export async function syncAllMangas(catalog, onLog, onProgress, abortRef) {
  const mangaWorks = catalog.filter((w) => {
    if (w.sync_status === "manual_override") return false;
    // Inclui mangás em publicação e opcionalmente em hiato (verificação mensal)
    const hasMangas = w.categories?.includes("manga");
    if (!hasMangas) return false;
    if (w.mangaStatus === "Em publicação") return true;
    // Em hiato: só se last_synced_at > 30 dias atrás ou ausente
    if (w.mangaStatus === "Em hiato") {
      if (!w.last_synced_at) return true;
      const daysSince = (Date.now() - new Date(w.last_synced_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30;
    }
    return false;
  });

  let updated = 0, unchanged = 0, notFound = 0;
  onLog?.(`Iniciando sincronização de ${mangaWorks.length} mangá(s) em publicação...`, "info");

  for (let i = 0; i < mangaWorks.length; i++) {
    if (abortRef?.current) break;
    const work = mangaWorks[i];
    onLog?.(`[${i + 1}/${mangaWorks.length}] ${work.title}...`, "loading");
    onProgress?.(i + 1, mangaWorks.length);

    const result = await syncMangaData(work, onLog);

    if (!result) { notFound++; }
    else if (result.sync_status === "not_found") { notFound++; }
    else if (result._changed) { updated++; }
    else { unchanged++; }

    if (i < mangaWorks.length - 1) await delay(450);
  }

  return { total: mangaWorks.length, updated, unchanged, notFound };
}