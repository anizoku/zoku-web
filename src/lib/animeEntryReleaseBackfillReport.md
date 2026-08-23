# Fase 2E-2 — Backfill Real de AnimeEntry.release_id

**Data:** 2026-08-23
**Modo:** Escrita autorizada — somente release_id nas 9 entradas seguras.

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de AnimeEntry analisados | 102 |
| Total atualizado | 9 ✅ |
| Outros AnimeEntry alterados | 0 ✅ |
| Conflitos criados | 0 ✅ |
| Entradas restantes sem release_id | 93 |
| — com season_mal_id sem ExternalMapping | 3 |
| — em fallback title/type (sem ID externo) | 90 |

**Veredito:** Backfill concluído com sucesso. Exatamente 9 entradas receberam release_id, todas apontando para WorkRelease existente, season_mal_id intacto, progresso do usuário intacto.

---

## Validações Aprovadas

- ✅ Exatamente 9 AnimeEntry receberam release_id.
- ✅ Nenhum outro AnimeEntry foi alterado (0 entradas fora da lista segura receberam release_id).
- ✅ release_id aponta para WorkRelease existente em todos os 9 casos.
- ✅ season_mal_id permanece intacto em todos os 9 casos.
- ✅ Nenhum campo de progresso alterado (status, current_episode, total_episodes, rating, notes, genre, title, type).
- ✅ 0 conflitos criados.

---

## Lista dos 9 AnimeEntry Atualizados

| entry_id | title | season_mal_id | release_id aplicado | WorkRelease correspondente | group_id |
|---|---|---|---|---|---|
| 6a329d487f80555f04f4b004 | Attack on Titan | 25777 | 6a8b7281c22ab4a66c9395a4 | Attack on Titan Season 2 | 6a2bb0e21a8790e0af8fd87f |
| 6a329d41f5c8912c1741678a | Attack on Titan | 35760 | 6a8b7281c22ab4a66c9395a5 | Attack on Titan Season 3 | 6a2bb0e21a8790e0af8fd87f |
| 6a329d23fcc80f602a5f6437 | Attack on Titan | 38524 | 6a8b7281c22ab4a66c9395a6 | Attack on Titan Season 3 Part 2 | 6a2bb0e21a8790e0af8fd87f |
| 6a329d1a36006bb27008d213 | Attack on Titan | 48583 | 6a8b7281c22ab4a66c9395a8 | Attack on Titan: Final Season Part 2 | 6a2bb0e21a8790e0af8fd87f |
| 6a329d0c4e0d3fecca85006a | Attack on Titan | 51535 | 6a8b7281c22ab4a66c9395a9 | Attack on Titan: Final Season - The Final Chapters | 6a2bb0e21a8790e0af8fd87f |
| 6a329d03de3010f57e567429 | Attack on Titan | 40028 | 6a8b7281c22ab4a66c9395a7 | Attack on Titan: Final Season | 6a2bb0e21a8790e0af8fd87f |
| 6a3170870b34cafb0e237eba | Mushoku Tensei: Jobless Reincarnation | 45576 | 6a8b7281c22ab4a66c9394f8 | Mushoku Tensei: Jobless Reincarnation Part 2 | 6a2bb254903e60727c93b2d2 |
| 6a3170673ac4b2d54269ebe0 | Mashle: Magic and Muscles | 55813 | 6a8b7281c22ab4a66c939509 | Mashle: Magic and Muscles - The Divine Visionary Candidate Exam Arc | 6a2bb18fa8a5bf6f1e48eb5b |
| 69f7fa56ca803a4580652215 | Dragon Ball | 813 | 6a8b7281c22ab4a66c93952f | Dragon Ball Z | 6a2bb141403b647ca4e77051 |

---

## Confirmação de Imutabilidade dos Campos de Progresso

Cada um dos 9 AnimeEntry manteve intactos os seguintes campos (validado via snapshot pré/pós-update):

- title ✅
- type ✅
- status ✅
- current_episode ✅
- total_episodes ✅
- current_chapter ✅
- total_chapters ✅
- rating ✅
- notes ✅
- genre ✅
- season_mal_id ✅ (preservado como fallback legado)
- external_provider ✅
- external_provider_id ✅

Único campo alterado: `release_id` (de null → ID da WorkRelease).

---

## Confirmação do Resolver

`resolveAnimeEntryRelease(entry)` agora retorna `match_type: "release_id"` (match direto) para essas 9 entradas, pois release_id está populado e a WorkRelease existe.

---

## Entradas Restantes (93)

### 3 entradas com season_mal_id sem ExternalMapping

Têm season_mal_id, mas o mal_id não está em nenhum ExternalMapping. Serão resolvidas quando dan-da-dan e hunter-x-hunter forem corrigidos/migrados, ou quando as obras correspondentes forem migradas para WorkRelease.

### 90 entradas em fallback title/type

Não têm season_mal_id nem external_provider. Continuam usando o caminho legado (title + type) para exibição. Para receberem release_id no futuro, precisam que o usuário tenha selecionado a temporada específica ao adicionar a obra (preenchendo season_mal_id).

---

## Confirmações Finais

- ✅ Somente as 9 entradas seguras receberam release_id.
- ✅ Nenhum progresso do usuário foi alterado.
- ✅ Nenhum fuzzy matching usado.
- ✅ Nenhuma entrada ambígua atualizada.
- ✅ Nenhuma entrada sem ExternalMapping atualizada.
- ✅ season_mal_id preservado em todos os casos.
- ✅ Nenhum WorkRelease criado.
- ✅ Nenhum ExternalMapping criado.
- ✅ Nenhuma integração AniList.
- ✅ dan-da-dan e hunter-x-hunter não foram tocados.
- ✅ Frontend não foi alterado — app visualmente idêntico.

---

## Próximos Passos

1. **Fase 3:** Refatorar consumidores legados (CatalogContext, useGlobalSearch) para usar `getWorkReleases` e `resolveAnimeEntryRelease` onde aplicável.
2. **Correção de dan-da-dan e hunter-x-hunter** (pendente) — desbloqueará mais 3 entradas para backfill futuro.
3. **Preenchimento de season_mal_id** em entradas legacy — depende de UX no fluxo de adicionar obra (seleção de temporada específica).