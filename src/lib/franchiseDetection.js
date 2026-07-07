/**
 * franchiseDetection.js — Detecção e agrupamento de franchises de anime.
 *
 * Regras do modelo:
 * 1. Uma obra canônica por (franchise + media_type). Anime só funde com anime.
 * 2. Toda obra de anime passa a ter seasons[] (inclusive standalone com 1 item).
 * 3. mal_id de cada temporada é PRESERVADO dentro de seasons[] — é a dedup no nível temporada.
 * 4. sort_order define a ordem de exibição. NÃO renumere "Final Season" como temporada 4/5.
 *    Preserve o season_title oficial; use sort_order só para ordenar.
 * 5. franchise_score (canônico): padrão = score da raiz, editável no admin (override manual).
 * 6. franchise_poster_url: padrão = poster da raiz, editável no admin.
 * 7. Filmes, recaps, OVAs e Specials NÃO entram em seasons[]. Ficam como DynamicWork à parte
 *    com related_franchise_id apontando para a obra canônica. Apenas entradas de tipo TV se fundem.
 */

import { delay } from "@/lib/jikan";
import { base44 } from "@/api/base44Client";

const JIKAN_BASE = "https://api.jikan.moe/v4";

/**
 * Strip season/part/number suffixes from a title to group by franchise.
 * This is a SECONDARY signal — the primary signal is Jikan relations (Prequel chain).
 */
export function normalizeForFranchise(title) {
  return (title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[:\-–—]+/g, " ")
    .replace(/season\s*\d+/gi, "")
    .replace(/s\d+$/i, "")
    .replace(/final season/gi, "")
    .replace(/final chapters/gi, "")
    .replace(/the final chapters/gi, "")
    .replace(/part\s*\d+/gi, "")
    .replace(/\b2nd\b|\b3rd\b|\b4th\b|\b5th\b/gi, "")
    .replace(/\bii\b|\biii\b|\biv\b|\bv\b|\bvi\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a season number from a title.
 * Returns null for unparseable titles (e.g. "Final Season Part 2").
 * NEVER renumbers — just extracts the number if present.
 */
function parseSeasonNumber(title) {
  const seasonMatch = title.match(/season\s*(\d+)/i);
  if (seasonMatch) return parseInt(seasonMatch[1]);
  const romanMatch = title.match(/\b(ii|iii|iv|v|vi|vii)\b/i);
  if (romanMatch) {
    const romans = { ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
    return romans[romanMatch[1].toLowerCase()];
  }
  return null;
}

/**
 * Detects franchise groups from a list of anime DynamicWork records.
 * Groups by normalized title, then picks root = smallest mal_id (NOT smallest year).
 *
 * @param {Array} animeWorks — DynamicWork records with categories including "anime"
 * @returns {Array} groups with { franchiseKey, root, absorbed, allItems }
 */
export function detectFranchiseGroups(animeWorks) {
  const groups = {};
  for (const w of animeWorks) {
    const key = normalizeForFranchise(w.title);
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => {
      // Root = smallest mal_id (NOT smallest year — that was the Re:Zero bug)
      const sorted = [...items].sort((a, b) => (a.mal_id || 0) - (b.mal_id || 0));
      const root = sorted[0];
      const absorbed = sorted.slice(1);
      return {
        franchiseKey: key,
        root,
        absorbed,
        allItems: sorted,
      };
    })
    .sort((a, b) => b.allItems.length - a.allItems.length);
}

/**
 * Walks the Prequel chain via Jikan /anime/{id}/relations to find the true franchise root.
 * The root is the entry with the smallest mal_id in the chain (the one with no Prequel of type anime).
 *
 * @param {number} malId — starting mal_id
 * @returns {Promise<{franchise_id: number, chain: Array}>}
 */
export async function getFranchiseRootViaJikan(malId) {
  const chain = [];
  let currentId = malId;
  const visited = new Set();

  // Types that are clearly NOT a season (filme, OVA, especial, música)
  const NON_SEASON_TYPES = ["movie", "ova", "special", "music", "cm", "pv", "tv_special"];

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    try {
      // Fetch full entry to get title, type, and relations
      const entryRes = await fetch(`${JIKAN_BASE}/anime/${currentId}/full`);
      if (entryRes.status === 429) {
        await delay(1000);
        continue;
      }
      if (!entryRes.ok) break;

      const entryJson = await entryRes.json();
      const entryData = entryJson.data;
      if (!entryData) break;

      chain.push({
        mal_id: currentId,
        title: entryData.title_english || entryData.title || "",
        type: entryData.type,
        year: entryData.year,
      });

      const relations = entryData.relations || [];

      // CORREÇÃO 1: Aceitar Prequel de qualquer type que NÃO seja claramente não-temporada.
      // O Jikan v4 retorna entry como ARRAY: r.entry = [{mal_id, type, name, url}]
      // O type que importa (anime vs manga) está em r.entry[0].type, NÃO em r.type.
      // Antes exigia r.type === "anime" — mas r.type não existe no Jikan v4, então
      // o .find() nunca casava e o loop parava cedo, coroando temporada intermediária como raiz.
      const prequel = relations.find((r) => {
        const rel = (r.relation || "").toLowerCase().trim();
        if (rel !== "prequel") return false;

        // Jikan v4: entry é um array — pegar o primeiro item
        const entries = Array.isArray(r.entry) ? r.entry : [r.entry];
        const firstEntry = entries[0];
        if (!firstEntry?.mal_id) return false;

        // O type do prequel está no entry, não na relation
        const entryType = (firstEntry.type || "").toLowerCase().trim();
        // Segue o prequel a menos que seja de um tipo claramente não-temporada
        return !NON_SEASON_TYPES.includes(entryType);
      });

      if (!prequel) break;

      // Extrair mal_id do primeiro entry do prequel
      const prequelEntries = Array.isArray(prequel.entry) ? prequel.entry : [prequel.entry];
      currentId = prequelEntries[0]?.mal_id;
      await delay(400); // Jikan rate limit ~3 req/s
    } catch {
      break;
    }
  }

  // Root is the LAST entry in the Prequel chain (smallest mal_id, no further prequel)
  const root = chain[chain.length - 1];
  return {
    franchise_id: root?.mal_id || malId,
    chain,
    rootTitle: root?.title || "",
    rootType: root?.type || "",
  };
}

/**
 * Checks whether a given mal_id exists as a DynamicWork in the database.
 * Used to signal "raiz real não importada" in the FranchiseMerger.
 */
export async function checkWorkExistsInDb(malId, dynamicWorks = null) {
  if (!malId) return false;
  // If a preloaded list is available, use it (avoids extra API calls)
  if (dynamicWorks && Array.isArray(dynamicWorks)) {
    return dynamicWorks.some((w) => w.mal_id === malId);
  }
  // Otherwise, query the database
  try {
    const results = await base44.entities.DynamicWork.filter({ mal_id: malId });
    return results.length > 0;
  } catch {
    return false;
  }
}

/**
 * Builds the seasons[] array from a group of works.
 * Each item preserves: mal_id, season_number, season_title, sort_order, episodes, year, poster_url, synopsis, score.
 * sort_order is determined by mal_id (smallest = 1).
 * season_number is parsed from the title when possible; null for unparseable (e.g. "Final Season").
 * season_title is the ORIGINAL title (preserving "Season 2", "Final Season Part 2", etc.).
 *
 * @param {Array} allItems — sorted by mal_id (smallest first)
 * @returns {Array} seasons array
 */
export function buildSeasonsArray(allItems) {
  return allItems.map((w, idx) => ({
    mal_id: w.mal_id,
    season_number: idx === 0 ? 1 : parseSeasonNumber(w.title),
    season_title: w.title,
    sort_order: idx + 1,
    episodes: w.episodes || null,
    year: w.year || null,
    poster_url: w.image_url || null,
    synopsis: w.synopsis || null,
    score: w.score || null,
  }));
}

/**
 * Parses seasons from a DynamicWork record's seasons field (JSON string or array).
 */
export function parseSeasons(seasonsField) {
  if (!seasonsField) return [];
  if (Array.isArray(seasonsField)) return seasonsField;
  try {
    return JSON.parse(seasonsField);
  } catch {
    return [];
  }
}