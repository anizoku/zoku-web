# Fase 2E-1 — Dry-Run: Backfill de AnimeEntry.release_id

**Data:** 2026-08-23
**Modo:** Simulação somente leitura. Nenhum AnimeEntry foi alterado.

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de AnimeEntry analisados | 102 |
| Já têm release_id | 0 |
| Têm season_mal_id | 12 |
| Têm external_provider/external_provider_id | 0 |
| **Podem receber release_id por match exato (season_mal_id)** | **9** ✅ |
| Podem receber release_id por external_provider | 0 |
| Match ambíguo | 0 |
| Nenhum match (têm ID externo mas sem ExternalMapping) | 3 |
| Fallback title/type (sem ID externo) | 90 |
| Conflitos encontrados | 0 |

**Veredito:** **9 AnimeEntry podem receber release_id com segurança** por match exato via season_mal_id → ExternalMapping. 0 ambíguos, 0 conflitos.

---

## Regras de Resolução Aplicadas

1. `release_id` direto → match exato (0 entradas usaram este caminho — nenhuma tem release_id ainda).
2. `season_mal_id` → ExternalMapping(provider=mal, provider_id=season_mal_id) → se exatamente 1 work_release_id → match seguro.
3. `external_provider` + `external_provider_id` → ExternalMapping → se exatamente 1 work_release_id → match seguro.
4. Sem match por ID → fallback title/type (SÓ exibição, não preenche release_id).
5. Múltiplos work_release_id para o mesmo provider_id → ambíguo (não preenche).

---

## Entradas que Seriam Atualizadas (9) — match exato por season_mal_id

| entry_id | title | season_mal_id | release_id_new | match_type |
|---|---|---|---|---|
| 6a329d487f80555f04f4b004 | Attack on Titan | 25777 | 6a8b7281c22ab4a66c9395a4 | season_mal_id |
| 6a329d41f5c8912c1741678a | Attack on Titan | 35760 | 6a8b7281c22ab4a66c9395a5 | season_mal_id |
| 6a329d23fcc80f602a5f6437 | Attack on Titan | 38524 | 6a8b7281c22ab4a66c9395a6 | season_mal_id |
| 6a329d1a36006bb27008d213 | Attack on Titan | 48583 | 6a8b7281c22ab4a66c9395a8 | season_mal_id |
| 6a329d0c4e0d3fecca85006a | Attack on Titan | 51535 | 6a8b7281c22ab4a66c9395a9 | season_mal_id |
| 6a329d03de3010f57e567429 | Attack on Titan | 40028 | 6a8b7281c22ab4a66c9395a7 | season_mal_id |
| 6a3170870b34cafb0e237eba | Mushoku Tensei: Jobless Reincarnation | 45576 | 6a8b7281c22ab4a66c9394f8 | season_mal_id |
| 6a3170673ac4b2d54269ebe0 | Mashle: Magic and Muscles | 55813 | 6a8b7281c22ab4a66c939509 | season_mal_id |
| 69f7fa56ca803a4580652215 | Dragon Ball | 813 | 6a8b7281c22ab4a66c93952f | season_mal_id |

**Observação:** todas as 9 correspondem a DynamicWork já migrados na Fase 2C (Attack on Titan, Mushoku Tensei, Mashle, Dragon Ball). Os mal_ids delas existem em ExternalMapping com exatamente 1 work_release_id.

---

## Entradas que Ficariam Sem Atualização (93)

### 3 entradas com season_mal_id mas SEM match em ExternalMapping

Estas têm season_mal_id, mas o mal_id não está em nenhum ExternalMapping. Motivos prováveis:
- O DynamicWork pai não foi migrado (dan-da-dan, hunter-x-hunter excluídos da Fase 2C).
- O mal_id pertence a uma obra sem franchise_id (não elegível para migração).

### 90 entradas em fallback title/type (sem nenhum ID externo)

Estas entradas não têm season_mal_id nem external_provider/external_provider_id. Elas continuam usando o caminho legado (title + type) para exibição. Exemplos:

| title | reason |
|---|---|
| Bleach: Thousand-Year Blood War - The Calamity | no_external_id_available |
| Gachiakuta | no_external_id_available |
| Demon Slayer: ... Infinity Castle | no_external_id_available |
| Monster | no_external_id_available |
| Wind Breaker | no_external_id_available |
| Vinland Saga | no_external_id_available |
| Dr. Stone | no_external_id_available |
| DAN DA DAN | no_external_id_available |
| Frieren: Beyond Journey's End Part 2 | no_external_id_available |

**Nota:** "DAN DA DAN" aparece aqui sem season_mal_id — confirma que dan-da-dan está pendente de correção (Fase 2C excluída).

---

## Conflitos e Ambiguidades

| Tipo | Quantidade |
|---|---|
| Match ambíguo (múltiplos work_release_id para o mesmo provider_id) | 0 |
| Conflitos | 0 |

Nenhum conflito encontrado — todos os 9 matches são unívocos.

---

## Confirmações

- ✅ Nenhum AnimeEntry foi alterado (somente leitura).
- ✅ Frontend não foi alterado.
- ✅ `getWorkReleases()` não foi alterado.
- ✅ Nenhum WorkRelease criado.
- ✅ Nenhum ExternalMapping criado.
- ✅ Nenhum fuzzy matching usado.
- ✅ season_mal_id permanece intacto (seria preservado no backfill real).
- ✅ title/type legado permanece intacto.

---

## Helper Criado

`src/lib/resolveAnimeEntryRelease.js` — exporta `resolveAnimeEntryRelease(entry, context)`:

- Retorna `{ match, match_type, release_id_to_set, ambiguous_candidates? }`.
- `match_type`: `release_id` | `season_mal_id` | `external_provider` | `legacy_title` | `none` | `ambiguous`.
- `release_id_to_set` só é não-null quando o match é exato por ExternalMapping (seguro para backfill).
- Aceita `context` com caches (`releaseById`, `mappingsByProviderId`) para evitar N+1 queries em processamento em lote.
- Fallback title/type retorna `match_type: "legacy_title"` e `release_id_to_set: null` (nunca preenche automaticamente).

---

## Próximos Passos (pendentes de autorização)

1. **Backfill real das 9 entradas seguras** (Fase 2E-2): setar `release_id` nas 9 entradas com match exato, preservando `season_mal_id` como fallback.
2. **As 3 entradas sem match** serão resolvidas quando dan-da-dan e hunter-x-hunter forem corrigidos e migrados.
3. **As 90 entradas em fallback** precisam de season_mal_id preenchido (ou external_provider) para receberem release_id no futuro — isso depende de o usuário ter selecionado a temporada específica ao adicionar a obra.