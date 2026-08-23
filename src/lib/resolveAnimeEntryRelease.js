/**
 * resolveAnimeEntryRelease.js — Resolver central de progresso do usuário.
 *
 * Determina a qual WorkRelease um AnimeEntry pertence, usando prioridade:
 *   1. release_id direto (match exato)
 *   2. season_mal_id → ExternalMapping(provider=mal, provider_id=season_mal_id)
 *   3. external_provider + external_provider_id → ExternalMapping
 *   4. fallback legado por title/type (SÓ para exibição — nunca preenche release_id)
 *
 * Regras estritas:
 * - Nunca fuzzy matching.
 * - Nunca preenche release_id por title/type.
 * - Só considera backfill automático quando há match exato por ExternalMapping (1 único work_release_id).
 * - Match ambíguo (múltiplos work_release_id) NÃO é seguro — retorna ambiguous.
 */

import { base44 } from "@/api/base44Client";

/**
 * Resolve a WorkRelease para um AnimeEntry.
 *
 * @param {Object} entry — registro AnimeEntry
 * @param {Object} [context] — cache opcional para evitar queries repetidas
 * @param {Map<string, Object>} [context.releaseById] — Map<release_id, WorkRelease>
 * @param {Map<string, Object[]>} [context.mappingsByProviderId] — Map<"provider:provider_id", ExternalMapping[]>
 * @returns {Promise<{
 *   match: Object|null,        // WorkRelease resolvida, ou null
 *   match_type: "release_id"|"season_mal_id"|"external_provider"|"legacy_title"|"none"|"ambiguous",
 *   ambiguous_candidates?: Object[],  // quando ambíguo
 *   release_id_to_set: string|null,   // ID seguro para backfill (só match exato), ou null
 * }>}
 */
export async function resolveAnimeEntryRelease(entry, context = {}) {
  if (!entry) {
    return { match: null, match_type: "none", release_id_to_set: null };
  }

  // 1. release_id direto
  if (entry.release_id) {
    let release = null;
    if (context.releaseById?.has(entry.release_id)) {
      release = context.releaseById.get(entry.release_id);
    } else {
      try {
        release = await base44.entities.WorkRelease.get(entry.release_id);
      } catch {
        release = null;
      }
    }
    if (release) {
      return { match: release, match_type: "release_id", release_id_to_set: null };
    }
    // release_id existe mas WorkRelease não encontrada — continua para fallbacks
  }

  // 2. season_mal_id → ExternalMapping(provider=mal)
  if (entry.season_mal_id != null) {
    const key = `mal:${entry.season_mal_id}`;
    let mappings = context.mappingsByProviderId?.get(key);
    if (mappings === undefined) {
      try {
        mappings = await base44.entities.ExternalMapping.filter({
          provider: "mal",
          provider_id: String(entry.season_mal_id),
        });
      } catch {
        mappings = [];
      }
    }

    const releaseIds = uniqueReleaseIds(mappings);
    if (releaseIds.length === 1) {
      const release = await fetchRelease(releaseIds[0], context);
      if (release) {
        return { match: release, match_type: "season_mal_id", release_id_to_set: release.id };
      }
    } else if (releaseIds.length > 1) {
      return {
        match: null,
        match_type: "ambiguous",
        ambiguous_candidates: releaseIds,
        release_id_to_set: null,
      };
    }
  }

  // 3. external_provider + external_provider_id → ExternalMapping
  if (entry.external_provider && entry.external_provider_id) {
    const key = `${entry.external_provider}:${entry.external_provider_id}`;
    let mappings = context.mappingsByProviderId?.get(key);
    if (mappings === undefined) {
      try {
        mappings = await base44.entities.ExternalMapping.filter({
          provider: entry.external_provider,
          provider_id: String(entry.external_provider_id),
        });
      } catch {
        mappings = [];
      }
    }

    const releaseIds = uniqueReleaseIds(mappings);
    if (releaseIds.length === 1) {
      const release = await fetchRelease(releaseIds[0], context);
      if (release) {
        return { match: release, match_type: "external_provider", release_id_to_set: release.id };
      }
    } else if (releaseIds.length > 1) {
      return {
        match: null,
        match_type: "ambiguous",
        ambiguous_candidates: releaseIds,
        release_id_to_set: null,
      };
    }
  }

  // 4. Fallback legado por title/type — SÓ exibição, nunca preenche release_id
  return { match: null, match_type: "legacy_title", release_id_to_set: null };
}

/**
 * Extrai work_release_id únicos e não-null de uma lista de ExternalMapping.
 */
function uniqueReleaseIds(mappings) {
  if (!mappings || !mappings.length) return [];
  const set = new Set();
  for (const m of mappings) {
    if (m.work_release_id) set.add(m.work_release_id);
  }
  return [...set];
}

/**
 * Busca uma WorkRelease por id, usando cache quando disponível.
 */
async function fetchRelease(releaseId, context) {
  if (context.releaseById?.has(releaseId)) {
    return context.releaseById.get(releaseId);
  }
  try {
    return await base44.entities.WorkRelease.get(releaseId);
  } catch {
    return null;
  }
}