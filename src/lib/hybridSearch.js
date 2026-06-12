import { searchAnime, searchManga } from "@/lib/jikan";
import { getTMDBWorkDetails } from "@/lib/tmdb";

/**
 * Busca em Jikan + TMDB com deduplicação
 * Retorna obras únicas, priorizando dados do Jikan sobre TMDB
 */
export async function hybridSearch(query) {
  const results = [];
  const seenTitles = new Set();

  try {
    // 1. Busca no Jikan (anime + manga)
    const [animes, mangas] = await Promise.all([
      searchAnime(query),
      searchManga(query),
    ]);

    const jikanWorks = [...animes, ...mangas];
    
    jikanWorks.forEach(work => {
      const title = (work.title_english || work.title).toLowerCase();
      if (!seenTitles.has(title)) {
        seenTitles.add(title);
        results.push({
          ...work,
          _source: "jikan",
          mal_id: work.mal_id,
        });
      }
    });
  } catch (e) {
    console.warn("Erro na busca Jikan:", e);
  }

  try {
    // 2. Busca no TMDB (apenas se houver poucas resultados do Jikan)
    if (results.length < 6) {
      const tmdbData = await getTMDBWorkDetails(query, "tv");
      
      if (tmdbData && tmdbData.tmdbId) {
        const title = (tmdbData.title || "").toLowerCase();
        
        // Verificar se já não existe nos resultados do Jikan (por título normalizado)
        const exists = results.some(r => 
          (r.title_english || r.title).toLowerCase().includes(query.toLowerCase()) ||
          query.toLowerCase().includes((r.title_english || r.title).toLowerCase())
        );

        if (!exists && !seenTitles.has(title)) {
          seenTitles.add(title);
          results.push({
            title_english: tmdbData.title,
            title: tmdbData.title,
            images: {
              jpg: {
                small_image_url: tmdbData.posterUrl,
                large_image_url: tmdbData.posterUrl,
              },
            },
            genres: (tmdbData.genres || []).map(g => ({ name: g })),
            score: tmdbData.rating || null,
            synopsis: tmdbData.overview || null,
            _source: "tmdb",
            _tmdbId: tmdbData.tmdbId,
            mal_id: null,
            type: "TV",
          });
        }
      }
    }
  } catch (e) {
    console.warn("Erro na busca TMDB:", e);
  }

  return results.slice(0, 6);
}