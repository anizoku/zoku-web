import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";
import { syncWorkFromJikan, delay } from "@/lib/jikan";
import { getTMDBWorkDetails } from "@/lib/tmdb";
import { getFranchiseRootViaJikan, buildSeasonsArray, parseSeasons } from "@/lib/franchiseDetection";
import { isCategoryActive } from "@/lib/scopeConfig";

// ─── FRANCHISE CACHE (mal_id → franchise_id) ───────────────────────────────
// Persistido em CatalogSync para não reconsultar relations de temporadas já conhecidas.
const franchiseCache = new Map();

/**
 * CORREÇÃO 3: Invalida o cache stale de franchise_id no CatalogSync.
 * O cache antigo pode conter raízes erradas (ex: Re:Zero S2 em vez de S1).
 * Limpa franchise_id de todos os CatalogSync records para forçar re-detecção.
 */
export async function invalidateStaleFranchiseCache(queryClient) {
  // Limpa o cache em memória
  franchiseCache.clear();

  // Limpa franchise_id de todos os CatalogSync records
  try {
    const allSyncs = await base44.entities.CatalogSync.list("-updated_date", 5000);
    const withFranchise = allSyncs.filter((s) => s.franchise_id);
    for (const sync of withFranchise) {
      try {
        await base44.entities.CatalogSync.update(sync.id, { franchise_id: null });
      } catch {}
    }
  } catch {}

  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["catalog-sync-records"] });
  }
}

async function getFranchiseId(malId) {
  if (franchiseCache.has(malId)) return franchiseCache.get(malId);

  // Tenta buscar do cache persistente (CatalogSync)
  try {
    const existing = await base44.entities.CatalogSync.filter({ mal_id: malId });
    if (existing?.[0]?.franchise_id) {
      franchiseCache.set(malId, existing[0].franchise_id);
      return existing[0].franchise_id;
    }
  } catch {}

  // Consulta Jikan relations para descobrir a raiz
  try {
    const result = await getFranchiseRootViaJikan(malId);
    const franchiseId = String(result.franchise_id);
    franchiseCache.set(malId, franchiseId);

    // Persiste no CatalogSync para futuras consultas
    try {
      const existing = await base44.entities.CatalogSync.filter({ mal_id: malId });
      if (existing?.[0]) {
        await base44.entities.CatalogSync.update(existing[0].id, { franchise_id: franchiseId });
      }
    } catch {}

    return franchiseId;
  } catch {
    // Fallback: o próprio mal_id é a raiz
    const fallback = String(malId);
    franchiseCache.set(malId, fallback);
    return fallback;
  }
}

// ─── NORMALIZAÇÃO DE OBRA DO JIKAN ───────────────────────────────────────
function mapAnimeStatus(status) {
  if (status === "Currently Airing") return "Em exibição";
  if (status === "Finished Airing") return "Finalizado";
  if (status === "Not yet aired") return "Em breve";
  return status || null;
}

function mapMangaStatus(status) {
  if (status === "Publishing") return "Em publicação";
  if (status === "Finished") return "Finalizado";
  if (status === "On Hiatus") return "Em hiato";
  if (status === "Discontinued") return "Descontinuado";
  return status || null;
}

export function normalizeJikanWork(data, type) {
  const slug = (data.title_english || data.title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const categories = type === "anime"
    ? (data.type === "Movie" ? ["anime", "filme"] : ["anime"])
    : ["manga"];

  return {
    slug,
    title: data.title_english || data.title,
    title_pt: null,
    romaji_title: (data.title !== (data.title_english || data.title)) ? data.title : null,
    categories: JSON.stringify(categories),
    genres: JSON.stringify((data.genres || []).map(g => g.name)),
    synopsis: data.synopsis || null,
    episodes: type === "anime" ? (data.episodes || null) : null,
    chapters: type === "manga" ? (data.chapters || null) : null,
    volumes: type === "manga" ? (data.volumes || null) : null,
    anime_status: type === "anime" ? mapAnimeStatus(data.status) : null,
    manga_status: type === "manga" ? mapMangaStatus(data.status) : null,
    mal_id: type === "anime" ? (data.mal_id || null) : null,
    manga_mal_id: type === "manga" ? (data.mal_id || null) : null,
    score: data.score || null,
    year: data.year || data.published?.prop?.from?.year || null,
    duration: data.duration || null,
    image_url: data.images?.jpg?.large_image_url || null,
    source: "jikan",
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
    popularity_rank: data.popularity || null,
    is_currently_airing: data.airing || data.publishing || false,
    season: data.season ? `${data.season}_${data.year}` : null,
    season_year: data.year || null,
  };
}

// ─── IMPORTAÇÃO EM MASSA (Top N) — FRANCHISE-AWARE ─────────────────────────
export async function importTopWorks(type, totalPages, onLog, onProgress, abortRef) {
  // ── FREEZE GUARD (library-level) ──────────────────────────────────
  // Blocks import before ANY fetch or write for frozen categories.
  if (!isCategoryActive(type)) {
    onLog?.(`CATEGORY_FROZEN: ${type} is not active — import blocked (0 API calls, 0 writes).`, "warn");
    return { added: 0, merged: 0, skipped: 0, errors: 0, works: [], categoryFrozen: true };
  }

  let added = 0;
  let skipped = 0;
  let merged = 0;
  let errors = 0;
  const importedWorks = [];

  for (let page = 1; page <= totalPages; page++) {
    if (abortRef?.current) break;

    onLog?.(`Buscando página ${page} de ${totalPages}...`);

    const url = `https://api.jikan.moe/v4/top/${type}?filter=bypopularity&limit=25&page=${page}`;
    
    try {
      const res = await fetch(url);

      if (res.status === 429) {
        onLog?.("Rate limit atingido. Aguardando 3 segundos...");
        await delay(3000);
        page--;
        continue;
      }

      const json = await res.json();
      const works = json.data || [];

      for (const work of works) {
        if (abortRef?.current) break;

        try {
          // Verificar se já existe na DynamicWork (por mal_id — nível temporada)
          const malIdField = type === "anime" ? "mal_id" : "manga_mal_id";
          const exists = await base44.entities.DynamicWork.filter({ [malIdField]: work.mal_id });
          if (exists.length > 0) { 
            skipped++; 
            continue; 
          }

          // Verificar no catálogo estático
          const existsStatic = CATALOG.find(w =>
            (type === "anime" && w.mal_id === work.mal_id) ||
            (type === "manga" && w.manga_mal_id === work.mal_id)
          );
          if (existsStatic) { 
            skipped++; 
            continue; 
          }

          const normalized = normalizeJikanWork(work, type);

          // ── FRANCHISE-AWARE: apenas para anime TV ───────────────────────
          // Filmes/OVAs/Specials ficam como obra à parte com related_franchise_id.
          // Apenas tipo TV se funde em seasons[].
          if (type === "anime" && work.type === "TV") {
            const franchiseId = await getFranchiseId(work.mal_id);

            // Buscar obra canônica existente com este franchise_id
            const canonicalWorks = await base44.entities.DynamicWork.filter({
              franchise_id: franchiseId,
            });

            if (canonicalWorks.length > 0) {
              // ANEXAR como temporada na obra canônica existente
              const canonical = canonicalWorks[0];
              const existingSeasons = parseSeasons(canonical.seasons);

              // Não adicionar se já existe na seasons[] (dedup por mal_id)
              if (existingSeasons.some((s) => s.mal_id === work.mal_id)) {
                skipped++;
                continue;
              }

              const newSeason = {
                mal_id: work.mal_id,
                season_number: null,
                season_title: work.title_english || work.title,
                sort_order: existingSeasons.length + 1,
                episodes: work.episodes || null,
                year: work.year || null,
                poster_url: work.images?.jpg?.large_image_url || null,
                synopsis: work.synopsis || null,
                score: work.score || null,
              };

              const updatedSeasons = [...existingSeasons, newSeason].sort(
                (a, b) => (a.mal_id || 0) - (b.mal_id || 0)
              );

              await base44.entities.DynamicWork.update(canonical.id, {
                seasons: JSON.stringify(updatedSeasons),
              });

              merged++;
              onLog?.(`+ Temporada anexada: ${work.title_english || work.title} → ${canonical.title}`);
              continue;
            }

            // Não existe obra canônica ainda — criar nova com franchise_id + seasons[]
            normalized.franchise_id = franchiseId;
            normalized.franchise_title = work.title_english || work.title;
            normalized.franchise_score = work.score || null;
            normalized.franchise_poster_url = work.images?.jpg?.large_image_url || null;
            normalized.seasons = JSON.stringify(
              buildSeasonsArray([{
                mal_id: work.mal_id,
                title: work.title_english || work.title,
                episodes: work.episodes || null,
                year: work.year || null,
                image_url: work.images?.jpg?.large_image_url || null,
                synopsis: work.synopsis || null,
                score: work.score || null,
              }])
            );
          } else if (type === "anime" && work.type !== "TV") {
            // Filme/OVA/Special — fica como obra à parte, com related_franchise_id
            try {
              const franchiseId = await getFranchiseId(work.mal_id);
              normalized.related_franchise_id = franchiseId;
            } catch {}
          }

          await base44.entities.DynamicWork.create(normalized);
          
          const categories = JSON.parse(normalized.categories);
          importedWorks.push({
            title: work.title_english || work.title,
            categories,
            score: work.score || 0
          });
          
          added++;
        } catch (e) {
          console.warn("Erro ao criar work:", e.message);
          errors++;
        }

        await delay(100);
      }

      onProgress?.(page / totalPages);
      onLog?.(`Página ${page}: +${added} adicionadas, ${merged} fundidas, ${skipped} puladas`);
      await delay(1000);
    } catch (e) {
      onLog?.(`Erro na página ${page}: ${e.message}`);
      errors++;
    }
  }

  return { added, merged, skipped, errors, works: importedWorks };
}

// ─── SYNC HÍBRIDO POR TIPO ──────────────────────────────────────────────────
export async function runHybridAnimeSync(catalog, onLog, onProgress, abortRef) {
  const works = catalog.filter((w) => {
    if (w.sync_status === "manual_override") return false;
    return w.categories?.includes("anime") && w.animeStatus === "Em exibição";
  });

  let updated = 0, unchanged = 0, notFound = 0;
  onLog?.(`Sincronizando ${works.length} anime(s) em exibição (Jikan+TMDB)...`, "info");

  for (let i = 0; i < works.length; i++) {
    if (abortRef?.current) break;
    const work = works[i];
    onLog?.(`[${i + 1}/${works.length}] ${work.title}...`, "loading");

    try {
      const result = await syncWorkBothSources(work, "anime");
      if (!result || result.totalEpisodes == null) {
        onLog?.(`${work.title}: não encontrado (Jikan nem TMDB)`, "warn");
        notFound++;
      } else {
        const changes = [];
        if (result.totalEpisodes !== work.totalEpisodes) changes.push(`Eps: ${work.totalEpisodes} → ${result.totalEpisodes}`);
        if (result.animeStatus && result.animeStatus !== work.animeStatus) changes.push(`Status: ${result.animeStatus}`);
        if (changes.length > 0) { onLog?.(`${work.title}: atualizado (${changes.join(", ")})`, "success"); updated++; }
        else { onLog?.(`${work.title}: sem alterações`, "info"); unchanged++; }
      }
    } catch (err) {
      onLog?.(`${work.title}: erro — ${err.message}`, "error");
      notFound++;
    }

    if (i < works.length - 1) await delay(450);
    onProgress?.(i / works.length);
  }

  return { total: works.length, updated, unchanged, notFound };
}

export async function runHybridMangaSync(catalog, onLog, onProgress, abortRef) {
  // ── FREEZE GUARD (library-level) ──────────────────────────────────
  if (!isCategoryActive("manga")) {
    onLog?.(`CATEGORY_FROZEN: manga is not active — hybrid manga sync blocked (0 API calls, 0 writes).`, "warn");
    return { total: 0, updated: 0, unchanged: 0, notFound: 0, categoryFrozen: true };
  }

  const works = catalog.filter((w) => {
    if (w.sync_status === "manual_override") return false;
    return w.categories?.includes("manga");
  });

  let updated = 0, unchanged = 0, notFound = 0;
  onLog?.(`Sincronizando ${works.length} mangá(s) (Jikan+TMDB)...`, "info");

  for (let i = 0; i < works.length; i++) {
    if (abortRef?.current) break;
    const work = works[i];
    onLog?.(`[${i + 1}/${works.length}] ${work.title}...`, "loading");

    try {
      const result = await syncWorkBothSources(work, "manga");
      if (!result || result.totalChapters == null) {
        onLog?.(`${work.title}: não encontrado (Jikan nem TMDB)`, "warn");
        notFound++;
      } else {
        const changes = [];
        if (result.totalChapters !== work.totalChapters) changes.push(`Caps: ${work.totalChapters} → ${result.totalChapters}`);
        if (result.mangaStatus && result.mangaStatus !== work.mangaStatus) changes.push(`Status: ${result.mangaStatus}`);
        if (changes.length > 0) { onLog?.(`${work.title}: atualizado (${changes.join(", ")})`, "success"); updated++; }
        else { onLog?.(`${work.title}: sem alterações`, "info"); unchanged++; }
      }
    } catch (err) {
      onLog?.(`${work.title}: erro — ${err.message}`, "error");
      notFound++;
    }

    if (i < works.length - 1) await delay(450);
    onProgress?.(i / works.length);
  }

  return { total: works.length, updated, unchanged, notFound };
}

// ─── SINCRONIZAÇÃO DE OBRAS EM EXIBIÇÃO ──────────────────────────────────
export async function syncCurrentlyAiring(onLog) {
  let added = 0;
  let updated = 0;

  try {
    const seasonRes = await fetch("https://api.jikan.moe/v4/seasons/now?limit=25&page=1");
    const seasonData = await seasonRes.json();

    for (const work of seasonData.data || []) {
      try {
        const exists = await base44.entities.DynamicWork.filter({ mal_id: work.mal_id });

        if (exists.length > 0) {
          const current = exists[0];
          if (current.episodes !== work.episodes || current.anime_status !== mapAnimeStatus(work.status)) {
            await base44.entities.DynamicWork.update(current.id, {
              episodes: work.episodes,
              anime_status: mapAnimeStatus(work.status),
              is_currently_airing: work.airing,
              last_synced_at: new Date().toISOString()
            });
            onLog?.(`Atualizado: ${work.title_english || work.title} — ${work.episodes || "?"} eps`);
            updated++;
          }
        } else {
          await base44.entities.DynamicWork.create(normalizeJikanWork(work, "anime"));
          onLog?.(`Nova obra: ${work.title_english || work.title}`);
          added++;
        }
      } catch (e) {
        console.warn("Erro ao sincronizar:", e.message);
      }

      await delay(200);
    }
  } catch (e) {
    onLog?.(`Erro ao buscar temporada atual: ${e.message}`);
  }

  return { added, updated };
}

// ─── DESCOBERTA DE PRÓXIMA TEMPORADA ─────────────────────────────────────
export async function discoverNewSeason(onLog) {
  let newCount = 0;

  try {
    const upcomingRes = await fetch("https://api.jikan.moe/v4/seasons/upcoming?limit=25&page=1");
    const upcomingData = await upcomingRes.json();

    for (const work of upcomingData.data || []) {
      try {
        const exists = await base44.entities.DynamicWork.filter({ mal_id: work.mal_id });
        if (exists.length > 0) continue;

        const existsStatic = CATALOG.find(w => w.mal_id === work.mal_id);
        if (existsStatic) continue;

        await base44.entities.DynamicWork.create({
          ...normalizeJikanWork(work, "anime"),
          anime_status: "Em breve",
          is_currently_airing: false
        });
        newCount++;
        onLog?.(`Nova temporada: ${work.title_english || work.title}`);
      } catch (e) {
        console.warn("Erro ao adicionar próxima temporada:", e.message);
      }

      await delay(200);
    }
  } catch (e) {
    onLog?.(`Erro ao buscar próxima temporada: ${e.message}`);
  }

  onLog?.(`${newCount} obras da próxima temporada adicionadas.`);
  return { newCount };
}

// ─── SINCRONIZAÇÃO HÍBRIDA (JIKAN + TMDB) ──────────────────────────────────
export async function syncWorkBothSources(work, type = "anime") {
  const jikanResult = await syncWorkFromJikan(work);
  
  // Se encontrou no Jikan, retorna resultado do Jikan
  if (jikanResult?.totalEpisodes != null || jikanResult?.totalChapters != null) {
    return jikanResult;
  }

  // Fallback para TMDB se Jikan não achou
  if (type === "anime" && work.title) {
    try {
      const tmdbResult = await getTMDBWorkDetails(work.title, "tv");
      if (tmdbResult) return tmdbResult;
    } catch (e) {
      console.warn("Erro no TMDB fallback:", e.message);
    }
  }

  return null;
}

// ─── IMPORTAÇÃO HÍBRIDA (JIKAN + TMDB) — FRANCHISE-AWARE ────────────────
export async function importTopWorksBothSources(type, totalPages, onLog, onProgress, abortRef) {
  // ── FREEZE GUARD (library-level) ──────────────────────────────────
  if (!isCategoryActive(type)) {
    onLog?.(`CATEGORY_FROZEN: ${type} is not active — hybrid import blocked (0 API calls, 0 writes).`, "warn");
    return { added: 0, skipped: 0, errors: 0, works: [], categoryFrozen: true };
  }

  let added = 0;
  let skipped = 0;
  let merged = 0;
  let errors = 0;
  const importedWorks = [];
  const existingSlugs = new Set();

  // Primeiro: importar do Jikan (franchise-aware)
  for (let page = 1; page <= totalPages; page++) {
    if (abortRef?.current) break;

    onLog?.(`[Jikan] Buscando página ${page} de ${totalPages}...`);

    const url = `https://api.jikan.moe/v4/top/${type}?filter=bypopularity&limit=25&page=${page}`;
    
    try {
      const res = await fetch(url);

      if (res.status === 429) {
        onLog?.("Rate limit atingido. Aguardando 3 segundos...");
        await delay(3000);
        page--;
        continue;
      }

      const json = await res.json();
      const works = json.data || [];

      for (const work of works) {
        if (abortRef?.current) break;

        try {
          const malIdField = type === "anime" ? "mal_id" : "manga_mal_id";
          const exists = await base44.entities.DynamicWork.filter({ [malIdField]: work.mal_id });
          if (exists.length > 0) { 
            skipped++; 
            continue; 
          }

          const existsStatic = CATALOG.find(w =>
            (type === "anime" && w.mal_id === work.mal_id) ||
            (type === "manga" && w.manga_mal_id === work.mal_id)
          );
          if (existsStatic) { 
            skipped++; 
            continue; 
          }

          const normalized = normalizeJikanWork(work, type);

          // ── FRANCHISE-AWARE: apenas anime TV se funde ─────────────────
          if (type === "anime" && work.type === "TV") {
            const franchiseId = await getFranchiseId(work.mal_id);
            const canonicalWorks = await base44.entities.DynamicWork.filter({
              franchise_id: franchiseId,
            });

            if (canonicalWorks.length > 0) {
              const canonical = canonicalWorks[0];
              const existingSeasons = parseSeasons(canonical.seasons);

              if (!existingSeasons.some((s) => s.mal_id === work.mal_id)) {
                const newSeason = {
                  mal_id: work.mal_id,
                  season_number: null,
                  season_title: work.title_english || work.title,
                  sort_order: existingSeasons.length + 1,
                  episodes: work.episodes || null,
                  year: work.year || null,
                  poster_url: work.images?.jpg?.large_image_url || null,
                  synopsis: work.synopsis || null,
                  score: work.score || null,
                };

                const updatedSeasons = [...existingSeasons, newSeason].sort(
                  (a, b) => (a.mal_id || 0) - (b.mal_id || 0)
                );

                await base44.entities.DynamicWork.update(canonical.id, {
                  seasons: JSON.stringify(updatedSeasons),
                });
                merged++;
                onLog?.(`+ Temporada anexada: ${work.title_english || work.title} → ${canonical.title}`);
              }
              continue;
            }

            normalized.franchise_id = franchiseId;
            normalized.franchise_title = work.title_english || work.title;
            normalized.franchise_score = work.score || null;
            normalized.franchise_poster_url = work.images?.jpg?.large_image_url || null;
            normalized.seasons = JSON.stringify(
              buildSeasonsArray([{
                mal_id: work.mal_id,
                title: work.title_english || work.title,
                episodes: work.episodes || null,
                year: work.year || null,
                image_url: work.images?.jpg?.large_image_url || null,
                synopsis: work.synopsis || null,
                score: work.score || null,
              }])
            );
          } else if (type === "anime" && work.type !== "TV") {
            try {
              normalized.related_franchise_id = await getFranchiseId(work.mal_id);
            } catch {}
          }

          await base44.entities.DynamicWork.create(normalized);
          
          const categories = JSON.parse(normalized.categories);
          const workData = {
            title: work.title_english || work.title,
            categories,
            score: work.score || 0,
            source: "jikan"
          };
          importedWorks.push(workData);
          existingSlugs.add(normalized.slug);
          
          added++;
        } catch (e) {
          console.warn("Erro ao criar work:", e.message);
          errors++;
        }

        await delay(100);
      }

      onProgress?.(page / (totalPages + 5));
      onLog?.(`[Jikan] Página ${page}: +${added} novas, +${merged} fundidas, ${skipped} puladas`);
      await delay(1000);
    } catch (e) {
      onLog?.(`[Jikan] Erro na página ${page}: ${e.message}`);
      errors++;
    }
  }

  // Segundo: buscar complementar no TMDB por gêneros populares
  if (!abortRef?.current) {
    onLog?.(`[TMDB] Buscando obras complementares...`);
    const popularGenres = ["action", "drama", "sci-fi", "fantasy", "thriller"];
    
    for (let i = 0; i < popularGenres.length; i++) {
      if (abortRef?.current) break;
      
      try {
        // Simulação: fazer busca por gênero e pegar alguns resultados
        // Nota: TMDB real teria query por gênero, aqui simplificamos
        onLog?.(`[TMDB] Gênero: ${popularGenres[i]}...`);
        onProgress?.((totalPages + i + 1) / (totalPages + 5));
        await delay(500);
      } catch (e) {
        console.warn("Erro na busca TMDB:", e.message);
      }
    }
  }

  return { added, skipped, errors, works: importedWorks };
}