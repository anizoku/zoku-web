/**
 * catalogAliases.js — Camada central de alias/dedup de catálogo.
 *
 * Resolve slugs fantasma/estático para seus slugs canônicos (DynamicWork migrado).
 * Usado pelo CatalogContext para:
 * 1. Filtrar alias slugs do catálogo (não mostrar como card separado)
 * 2. Resolver alias em getBySlug (rotas antigas continuam funcionando)
 *
 * Regras:
 * - Alias só é ativado quando o canônico tem WorkRelease confirmado.
 * - Slugs preservados (não aliasados) são listados em PRESERVED_SLUGS com motivo.
 * - Anime + manga com mesmo nome NÃO são aliasados — são media types legítimos separados.
 * - Reversível: basta esvaziar CATALOG_ALIASES para reverter.
 */

/**
 * Mapa de alias slug → slug canônico.
 * Adicione apenas slugs confirmados como fantasmas (sem mal_id próprio,
 * sem WorkRelease próprio, e cujo canônico tem WorkRelease migrado).
 */
export const CATALOG_ALIASES = {
  // Re:Zero — estático sem mal_id, canônico tem 4 WorkReleases
  "rezero": "rezero--starting-life-in-another-world-",
  // Dan Da Dan Season 2 — mal_id 60543 existe como WorkRelease canônico (Season 2);
  // o mal_id do estático (59485) difere, mas o canônico já cobre Season 2
  "dandadan-s2": "dan-da-dan",
};

/**
 * Slugs investigados mas PRESERVADOS (não aliasados) com motivo.
 */
export const PRESERVED_SLUGS = {
  "rezero-s3": {
    reason: "mal_id 54857 não existe em ExternalMapping do canônico Re:Zero (31240, 39587, 42203, 61316). Preservar até mapeamento futuro.",
    canonical_mal_ids: [31240, 39587, 42203, 61316],
    static_mal_id: 54857,
  },
  "dandadan-s2": {
    reason: "ALIASADO — mal_id 60543 existe como ExternalMapping do WorkRelease Season 2 canônico. O mal_id estático (59485) difere do canônico (60543), mas o canônico já cobre Season 2.",
    canonical_mal_ids: [57334, 60543, 62516],
    static_mal_id: 59485,
  },
  "dandadan": {
    reason: "DynamicWork manga (slug dandadan) é media type legítimo separado do anime (dan-da-dan). Não aliasar — não fazer merge manga→anime nesta fase.",
  },
  "dandadan-manga-standalone": {
    reason: "Tem CardOverride ativa (override_image_url). Preservar para não perder override do admin.",
  },
};

/**
 * Resolve um slug alias para seu slug canônico.
 * Se não é alias, retorna o slug original.
 */
export function resolveAlias(slug) {
  if (!slug) return slug;
  return CATALOG_ALIASES[slug] || slug;
}

/**
 * Verifica se um slug é um alias (deve ser ocultado do catálogo).
 */
export function isAliasSlug(slug) {
  if (!slug) return false;
  return slug in CATALOG_ALIASES;
}