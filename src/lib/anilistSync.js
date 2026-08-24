/**
 * anilistSync.js — Camada de matching AniList ↔ catálogo interno (dry-run).
 *
 * Fase 3A: APENAS leitura e simulação. Nenhuma escrita no banco.
 *
 * ────────────────────────────────────────────────────────────────────
 * PONTO 13 — Categorias de Match (4 níveis claros)
 * ────────────────────────────────────────────────────────────────────
 * O resultado de dryRunMatch() classifica cada obra em EXATAMENTE uma
 * das 4 categorias abaixo (result.simulation.match_category):
 *
 *   1. "match_anilist"  — Match SEGURO por ExternalMapping provider=anilist
 *                         (anilist_id já mapeado). Upsert direto.
 *
 *   2. "match_mal"      — Match SEGURO por ExternalMapping provider=mal
 *                         usando idMal do AniList. Upsert + criar mapping anilist.
 *
 *   3. "suggestion"     — SEM match por ExternalMapping, mas AniList encontrou
 *                         a obra E ela tem idMal. Pode sugerir link_existing
 *                         (criar ExternalMapping manualmente). NÃO upsertar
 *                         automaticamente.
 *
 *   4. "no_match"       — SEM match nenhum. AniList não encontrou, ou encontrou
 *                         mas não tem idMal, ou DynamicWork não existe.
 *
 * ────────────────────────────────────────────────────────────────────
 * PONTO 14 — SyncConflict APENAS simulado (nunca real)
 * ────────────────────────────────────────────────────────────────────
 * Este módulo NUNCA cria SyncConflict real no banco. Apenas simula qual
 * SyncConflict seria criado (result.simulation.would_create_sync_conflict).
 * A criação real de SyncConflict fica para a Fase 3B (backend-side).
 *
 * Regras da Fase 3A (NÃO fazer):
 * - Não criar WorkRelease automaticamente
 * - Não criar ExternalMapping (nem anilist nem mal)
 * - Não criar SyncConflict real
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
 * @returns {object} resultado do dry-run com match_category (4 níveis)
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
      // PONTO 13: 4 categorias claras
      match_category: null,   // "match_anilist" | "match_mal" | "suggestion" | "no_match"
      action: null,           // "upsert_by_anilist" | "upsert_by_mal" | "link_existing" | "create_new_release" | "ignore"
      would_create_mapping: false,
      would_update_fields: [],
      // PONTO 14: SyncConflict APENAS simulado (nunca criado real)
      would_create_sync_conflict: null,  // { provider, provider_id, conflict_type, suggested_action } ou null
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
      // PONTO 13: categoria 4 — no_match (AniList não encontrou)
      result.simulation.match_category = "no_match";
      result.simulation.action = "ignore";
      result.simulation.conflict_type = "no_match";
      result.simulation.conflict_reason = "AniList não encontrou a obra por idMal nem por busca de texto";
      // PONTO 14: simular SyncConflict
      result.simulation.would_create_sync_conflict = {
        provider: "anilist",
        provider_id: null,
        provider_type: type.toLowerCase(),
        external_title: searchTitle || `mal:${malId}`,
        conflict_type: "no_match",
        suggested_action: "ignore",
        confidence_score: 0,
      };
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

    // 5. Classificar em uma das 4 categorias (PONTO 13)
    if (anilistMapping) {
      // ── Categoria 1: match_anilist (SEGURO) ──
      result.simulation.match_category = "match_anilist";
      result.simulation.action = "upsert_by_anilist";
      result.simulation.would_create_mapping = false;
      result.simulation.would_update_fields = computeUpsertFields(dynamicWork, anilistData);
      result.match.target_work_release = anilistMapping.work_release_id || null;
      result.match.target_dynamic_work = anilistMapping.work_group_id || dynamicWork?.id || null;
    } else if (malMapping) {
      // ── Categoria 2: match_mal (SEGURO) ──
      result.simulation.match_category = "match_mal";
      result.simulation.action = "upsert_by_mal";
      result.simulation.would_create_mapping = true;
      result.simulation.would_update_fields = computeUpsertFields(dynamicWork, anilistData);
      result.match.target_work_release = malMapping.work_release_id || null;
      result.match.target_dynamic_work = malMapping.work_group_id || dynamicWork?.id || null;
    } else if (anilistData.idMal && dynamicWork) {
      // ── Categoria 3: suggestion (sem match, mas sugestão possível) ──
      // AniList encontrou a obra com idMal, e DynamicWork existe, mas não há
      // ExternalMapping. Pode sugerir link_existing (criar mapping manualmente).
      result.simulation.match_category = "suggestion";
      result.simulation.action = "link_existing";
      result.simulation.would_create_mapping = false; // não criar automaticamente
      result.simulation.would_update_fields = [];
      result.match.target_work_release = null;
      result.match.target_dynamic_work = dynamicWork.id;
      result.simulation.conflict_type = "no_match";
      result.simulation.conflict_reason = `DynamicWork existe (mal_id=${dynamicWork.mal_id}) mas sem ExternalMapping. AniList encontrou idMal=${anilistData.idMal}. Sugerir link_existing manual.`;
      // PONTO 14: simular SyncConflict (não criar real)
      result.simulation.would_create_sync_conflict = {
        provider: "anilist",
        provider_id: String(anilistData.anilist_id),
        provider_type: type.toLowerCase(),
        external_title: anilistData.title_english || anilistData.title_romaji || searchTitle,
        external_payload_summary: `idMal=${anilistData.idMal}, format=${anilistData.format}, episodes=${anilistData.episodes}`,
        possible_work_group_id: dynamicWork.id,
        conflict_type: "no_match",
        suggested_action: "link_existing",
        confidence_score: 80, // alta confiança porque idMal confere com mal_id do DynamicWork
      };
    } else if (anilistData.idMal && !dynamicWork) {
      // ── Categoria 3: suggestion (sem DynamicWork, mas AniList tem idMal) ──
      // Obra existe no AniList mas não no catálogo interno. Sugerir create_new_release.
      result.simulation.match_category = "suggestion";
      result.simulation.action = "create_new_release";
      result.simulation.would_create_mapping = false;
      result.simulation.would_update_fields = [];
      result.simulation.conflict_type = "no_match";
      result.simulation.conflict_reason = "Obra não existe no catálogo interno. AniList encontrou com idMal. Sugerir create_new_release manual.";
      result.simulation.would_create_sync_conflict = {
        provider: "anilist",
        provider_id: String(anilistData.anilist_id),
        provider_type: type.toLowerCase(),
        external_title: anilistData.title_english || anilistData.title_romaji || searchTitle,
        external_payload_summary: `idMal=${anilistData.idMal}, format=${anilistData.format}, episodes=${anilistData.episodes}`,
        conflict_type: "no_match",
        suggested_action: "create_new_release",
        confidence_score: 60,
      };
    } else {
      // ── Categoria 4: no_match (sem idMal, não pode sugerir link) ──
      result.simulation.match_category = "no_match";
      result.simulation.action = "ignore";
      result.simulation.conflict_type = "no_match";
      result.simulation.conflict_reason = "AniList encontrou a obra mas não tem idMal — não é possível sugerir link por MAL ID";
      result.simulation.would_create_sync_conflict = {
        provider: "anilist",
        provider_id: String(anilistData.anilist_id),
        provider_type: type.toLowerCase(),
        external_title: anilistData.title_english || anilistData.title_romaji || searchTitle,
        conflict_type: "no_match",
        suggested_action: "ignore",
        confidence_score: 0,
      };
    }

    // 6. Verificar ambiguidade de título (se busca por texto retornou múltiplos)
    if (!malId && searchTitle) {
      const results = await searchAnilistByText(searchTitle, type, 3);
      if (results.length > 1) {
        const titles = results.map(r => r.title?.romaji || r.title?.english);
        result.simulation.conflict_type = "ambiguous_title";
        result.simulation.conflict_reason = `Busca por texto retornou múltiplos: ${titles.slice(0, 3).join(" | ")}`;
        if (result.simulation.would_create_sync_conflict) {
          result.simulation.would_create_sync_conflict.conflict_type = "ambiguous_title";
          result.simulation.would_create_sync_conflict.suggested_action = "ignore";
          result.simulation.would_create_sync_conflict.confidence_score = 30;
        }
      }
    }
  } catch (err) {
    result.errors.push(err.message);
    result.simulation.match_category = "no_match";
    result.simulation.action = "ignore";
    result.simulation.conflict_type = "no_match";
    result.simulation.conflict_reason = `Erro na consulta AniList: ${err.message}`;
    result.simulation.would_create_sync_conflict = {
      provider: "anilist",
      provider_id: null,
      provider_type: type.toLowerCase(),
      external_title: searchTitle || `mal:${malId}`,
      conflict_type: "no_match",
      suggested_action: "ignore",
      confidence_score: 0,
    };
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