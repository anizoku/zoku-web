/**
 * anilistSync.js — Camada de matching AniList ↔ catálogo interno (dry-run).
 *
 * Fase 3A: APENAS leitura e simulação. Nenhuma escrita no banco.
 *
 * Fluxo de matching (por obra):
 * 1. Consultar AniList (por idMal ou por texto)
 * 2. Normalizar dados AniList
 * 3. Verificar ExternalMapping:
 *    a. provider=anilist, provider_id=anilist_id → match por AniList ID
 *    b. provider=mal, provider_id=idMal → match por MAL ID
 * 4. Simular resultado:
 *    - Match por AniList ID → upsert (atualizar WorkRelease/DynamicWork existente)
 *    - Match por MAL ID → upsert + criar ExternalMapping(anilist)
 *    - Sem match → SyncConflict (no_match | ambiguous_title)
 *
 * Regras da Fase 3A (NÃO fazer):
 * - Não criar WorkRelease automaticamente
 * - Não alterar AnimeEntry
 * - Não alterar progresso de usuário
 * - Não usar fuzzy matching
 * - Não usar LLM
 * - Não salvar raw_payload
 * - Não sobrescrever manual_override
 */

import {
  getAnilistById,
  getAnilistByMalId,
  searchAnilistByText,
  normalizeAnilistMedia,
} from "@/lib/anilistClient";

/**
 * Resolve uma obra do catálogo interno pelo mal_id.
 * @param {array} dynamicWorks — lista de DynamicWork
 * @param {number} malId — mal_id da obra
 * @returns {object|null} DynamicWork canônico
 */
export function findDynamicWorkByMalId(dynamicWorks, malId) {
  if (!malId) return null;
  return dynamicWorks.find(dw => dw.mal_id === malId) || null;
}

/**
 * Verifica se existe ExternalMapping para um provider+id.
 * @param {array} externalMappings — lista de ExternalMapping
 * @param {string} provider — "anilist" | "mal"
 * @param {string} providerId — ID no provedor
 * @returns {object|null} ExternalMapping encontrada ou null
 */
export function findExternalMapping(externalMappings, provider, providerId) {
  if (!provider || !providerId) return null;
  const pid = String(providerId);
  return externalMappings.find(
    m => m.provider === provider && String(m.provider_id) === pid
  ) || null;
}

/**
 * Executa o dry-run de matching para uma obra.
 *
 * @param {object} params
 * @param {object} params.dynamicWork — DynamicWork canônico (opcional)
 * @param {array} params.externalMappings — lista de ExternalMapping
 * @param {array} params.workReleases — lista de WorkRelease
 * @param {string} params.searchTitle — título para busca por texto (fallback)
 * @param {number} params.malId — MAL ID para busca por idMal (preferido)
 * @param {string} params.type — "ANIME" | "MANGA" (default ANIME)
 * @returns {object} resultado do dry-run
 */
export async function dryRunMatch({
  dynamicWork,
  externalMappings,
  workReleases,
  searchTitle,
  malId,
  type = "ANIME",
}) {
  const result = {
    input: {
      searchTitle,
      malId,
      dynamicWorkId: dynamicWork?.id || null,
      dynamicWorkSlug: dynamicWork?.slug || null,
    },
    anilist: null,
    match: {
      by_anilist_id: null,   // ExternalMapping encontrada por anilist_id
      by_mal_id: null,       // ExternalMapping encontrada por idMal
      target_work_release: null,
      target_dynamic_work: null,
    },
    simulation: {
      action: null,           // "upsert_by_anilist" | "upsert_by_mal" | "conflict_no_match" | "conflict_ambiguous"
      would_create_mapping: false,
      would_update_fields: [],
      conflict_type: null,
      conflict_reason: null,
    },
    errors: [],
  };

  try {
    // 1. Consultar AniList — preferir idMal (match exato), fallback para busca por texto
    let rawMedia = null;
    if (malId) {
      rawMedia = await getAnilistByMalId(malId, type);
    }
    if (!rawMedia && searchTitle) {
      const results = await searchAnilistByText(searchTitle, type, 1);
      rawMedia = results[0] || null;
    }

    if (!rawMedia) {
      result.simulation.action = "conflict_no_match";
      result.simulation.conflict_type = "no_match";
      result.simulation.conflict_reason = "AniList não encontrou a obra por idMal nem por busca de texto";
      return result;
    }

    // 2. Normalizar
    const anilistData = normalizeAnilistMedia(rawMedia);
    result.anilist = {
      anilist_id: anilistData.anilist_id,
      idMal: anilistData.idMal,
      title_romaji: anilistData.title_romaji,
      title_english: anilistData.title_english,
      title_native: anilistData.title_native,
      format: anilistData.format,
      status: anilistData.status,
      season: anilistData.season,
      season_year: anilistData.season_year,
      episodes: anilistData.episodes,
      duration_minutes: anilistData.duration_minutes,
      score: anilistData.score,
      popularity: anilistData.popularity,
      trending_score: anilistData.trending_score,
      cover_url: anilistData.cover_url,
      banner_url: anilistData.banner_url,
      relations_count: anilistData.relations.length,
    };

    // 3. Verificar ExternalMapping por AniList ID
    const anilistMapping = findExternalMapping(
      externalMappings,
      "anilist",
      anilistData.anilist_id
    );
    result.match.by_anilist_id = anilistMapping
      ? { mapping_id: anilistMapping.id, work_group_id: anilistMapping.work_group_id, work_release_id: anilistMapping.work_release_id }
      : null;

    // 4. Verificar ExternalMapping por MAL ID
    const malMapping = anilistData.idMal
      ? findExternalMapping(externalMappings, "mal", anilistData.idMal)
      : null;
    result.match.by_mal_id = malMapping
      ? { mapping_id: malMapping.id, work_group_id: malMapping.work_group_id, work_release_id: malMapping.work_release_id }
      : null;

    // 5. Simular resultado
    if (anilistMapping) {
      // Match por AniList ID — já mapeado, simular upsert
      result.simulation.action = "upsert_by_anilist";
      result.simulation.would_create_mapping = false;
      result.simulation.would_update_fields = computeUpsertFields(dynamicWork, anilistData);
      result.match.target_work_release = anilistMapping.work_release_id || null;
      result.match.target_dynamic_work = anilistMapping.work_group_id || dynamicWork?.id || null;
    } else if (malMapping) {
      // Match por MAL ID — mapeado via MAL, simular upsert + criar ExternalMapping(anilist)
      result.simulation.action = "upsert_by_mal";
      result.simulation.would_create_mapping = true;
      result.simulation.would_update_fields = computeUpsertFields(dynamicWork, anilistData);
      result.match.target_work_release = malMapping.work_release_id || null;
      result.match.target_dynamic_work = malMapping.work_group_id || dynamicWork?.id || null;
    } else if (dynamicWork) {
      // DynamicWork existe mas sem ExternalMapping — conflito (não criar automaticamente)
      result.simulation.action = "conflict_no_match";
      result.simulation.conflict_type = "no_match";
      result.simulation.conflict_reason = "DynamicWork existe mas não tem ExternalMapping para anilist nem mal";
    } else {
      // Sem DynamicWork e sem mapping — conflito (obra nova não migrada)
      result.simulation.action = "conflict_no_match";
      result.simulation.conflict_type = "no_match";
      result.simulation.conflict_reason = "Obra não existe no catálogo interno e sem ExternalMapping — requer criação manual";
    }

    // 6. Verificar ambiguidade de título (se busca por texto retornou múltiplos)
    if (!malId && searchTitle) {
      const results = await searchAnilistByText(searchTitle, type, 3);
      if (results.length > 1) {
        const titles = results.map(r => r.title?.romaji || r.title?.english);
        // Se os 2 primeiros têm scores de busca muito próximos, marcar ambíguo
        result.simulation.conflict_type = "ambiguous_title";
        result.simulation.conflict_reason = `Busca por texto retornou múltiplos: ${titles.slice(0, 3).join(" | ")}`;
      }
    }
  } catch (err) {
    result.errors.push(err.message);
    result.simulation.action = "conflict_no_match";
    result.simulation.conflict_type = "no_match";
    result.simulation.conflict_reason = `Erro na consulta AniList: ${err.message}`;
  }

  return result;
}

/**
 * Computa quais campos seriam atualizados no upsert (simulação).
 * Respeita manual_override — não sobrescreve campos com sync_status=manual_override.
 */
function computeUpsertFields(dynamicWork, anilistData) {
  if (!dynamicWork) return [];
  const fields = [];
  const isManualOverride = dynamicWork.sync_status === "manual_override";

  if (!isManualOverride) {
    if (anilistData.episodes != null && anilistData.episodes !== dynamicWork.episodes) {
      fields.push({ field: "episodes", current: dynamicWork.episodes, proposed: anilistData.episodes });
    }
    if (anilistData.score != null && anilistData.score !== dynamicWork.score) {
      fields.push({ field: "score", current: dynamicWork.score, proposed: anilistData.score });
    }
    if (anilistData.season_year != null && anilistData.season_year !== dynamicWork.year) {
      fields.push({ field: "year", current: dynamicWork.year, proposed: anilistData.season_year });
    }
    if (anilistData.cover_url && anilistData.cover_url !== dynamicWork.franchise_poster_url) {
      fields.push({ field: "franchise_poster_url", current: dynamicWork.franchise_poster_url, proposed: anilistData.cover_url });
    }
  } else {
    fields.push({ field: "_skipped", reason: "manual_override ativo — nenhum campo sobrescrito" });
  }

  return fields;
}