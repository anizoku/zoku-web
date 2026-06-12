import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";
import { delay } from "@/lib/jikan";

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

// ─── IMPORTAÇÃO EM MASSA (Top N) ─────────────────────────────────────────
export async function importTopWorks(type, totalPages, onLog, onProgress, abortRef) {
  let added = 0;
  let skipped = 0;
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
          // Verificar se já existe na DynamicWork
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

          // Criar na DynamicWork
          const normalized = normalizeJikanWork(work, type);
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
      onLog?.(`Página ${page}: +${added} adicionadas, ${skipped} puladas`);
      await delay(1000);
    } catch (e) {
      onLog?.(`Erro na página ${page}: ${e.message}`);
      errors++;
    }
  }

  return { added, skipped, errors, works: importedWorks };
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