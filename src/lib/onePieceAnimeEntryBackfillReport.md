# Fase 3B-5 — Relatório de Backfill Controlado: AnimeEntry de One Piece (anime only)

**Data:** 2026-09-05
**Tipo:** Escrita controlada (backfill de release_id)
**Escopo:** Atribuir WorkRelease `one-piece-main` aos 5 AnimeEntry de One Piece com type=anime

---

## 1. Resumo Executivo

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| AnimeEntry total | 102 | 102 | ✅ Inalterado |
| Com release_id != null | 12 | **17** | ✅ +5 |
| Com release_id = null | 90 | **85** | ✅ -5 |
| Entries atualizados | — | 5 | ✅ Exatamente 5 |
| Manga de One Piece afetados | — | 0 | ✅ |
| Liveaction de One Piece afetados | — | 0 | ✅ |
| Outras obras afetadas | — | 0 | ✅ |
| Status/progresso alterados | — | 0 | ✅ |
| WorkRelease alterados | — | 0 | ✅ |
| ExternalMapping alterados | — | 0 | ✅ |
| DynamicWork alterados | — | 0 | ✅ |
| SyncConflict criados | — | 0 | ✅ |

---

## 2. WorkRelease Alvo

| Campo | Valor |
|-------|-------|
| slug | `one-piece-main` |
| id | `6a9bbdcb6e1c8e3f18eb7211` |
| category | anime |
| format | TV |
| group_id | `6a2bb0ec71e0d6c6dbac6e88` |

---

## 3. Validação Pré-Backfill (5 alvos)

Cada um dos 5 AnimeEntry alvo foi validado antes da atualização:

| # | ID | Title | Type | release_id antes | title=One Piece? | type=anime? | release_id=null? | Pode atualizar? |
|---|-----|-------|------|------------------|------------------|-------------|-------------------|-----------------|
| 1 | `6a2c0aa45825ba62ab9ac4bb` | One Piece | anime | null | ✅ | ✅ | ✅ | ✅ Sim |
| 2 | `6a2c0a9c85382b2b2fbb6d11` | One Piece | anime | null | ✅ | ✅ | ✅ | ✅ Sim |
| 3 | `69f89f820ba669af6d16ffe9` | One Piece | anime | null | ✅ | ✅ | ✅ | ✅ Sim |
| 4 | `69f7d8e3957023659d3bbe68` | One Piece | anime | null | ✅ | ✅ | ✅ | ✅ Sim |
| 5 | `69f6a5d124acab3fc62d7de4` | One Piece | anime | null | ✅ | ✅ | ✅ | ✅ Sim |

**5/5 alvos passaram na validação.** Todos confirmados como One Piece, type=anime, release_id=null.

---

## 4. Atualizações Executadas (before/after)

### Entry 1: `6a2c0aa45825ba62ab9ac4bb`
| Campo | Before | After | Alterado? |
|-------|--------|-------|-----------|
| release_id | null | `6a9bbdcb6e1c8e3f18eb7211` | ✅ (único alterado) |
| status | completed | completed | ❌ Não |
| current_episode | 1 | 1 | ❌ Não |
| current_chapter | 0 | 0 | ❌ Não |
| rating | null | null | ❌ Não |
| notes | null | null | ❌ Não |
| season_mal_id | null | null | ❌ Não |
| external_provider | null | null | ❌ Não |
| external_provider_id | null | null | ❌ Não |

### Entry 2: `6a2c0a9c85382b2b2fbb6d11`
| Campo | Before | After | Alterado? |
|-------|--------|-------|-----------|
| release_id | null | `6a9bbdcb6e1c8e3f18eb7211` | ✅ (único alterado) |
| status | completed | completed | ❌ Não |
| current_episode | 1 | 1 | ❌ Não |
| current_chapter | 0 | 0 | ❌ Não |
| rating | null | null | ❌ Não |
| notes | null | null | ❌ Não |
| season_mal_id | null | null | ❌ Não |
| external_provider | null | null | ❌ Não |
| external_provider_id | null | null | ❌ Não |

### Entry 3: `69f89f820ba669af6d16ffe9`
| Campo | Before | After | Alterado? |
|-------|--------|-------|-----------|
| release_id | null | `6a9bbdcb6e1c8e3f18eb7211` | ✅ (único alterado) |
| status | watching | watching | ❌ Não |
| current_episode | 90 | 90 | ❌ Não |
| current_chapter | 0 | 0 | ❌ Não |
| rating | null | null | ❌ Não |
| notes | null | null | ❌ Não |
| season_mal_id | null | null | ❌ Não |
| external_provider | null | null | ❌ Não |
| external_provider_id | null | null | ❌ Não |

### Entry 4: `69f7d8e3957023659d3bbe68`
| Campo | Before | After | Alterado? |
|-------|--------|-------|-----------|
| release_id | null | `6a9bbdcb6e1c8e3f18eb7211` | ✅ (único alterado) |
| status | completed | completed | ❌ Não |
| current_episode | 1122 | 1122 | ❌ Não |
| current_chapter | 0 | 0 | ❌ Não |
| rating | null | null | ❌ Não |
| notes | null | null | ❌ Não |
| season_mal_id | null | null | ❌ Não |
| external_provider | null | null | ❌ Não |
| external_provider_id | null | null | ❌ Não |

### Entry 5: `69f6a5d124acab3fc62d7de4`
| Campo | Before | After | Alterado? |
|-------|--------|-------|-----------|
| release_id | null | `6a9bbdcb6e1c8e3f18eb7211` | ✅ (único alterado) |
| status | completed | completed | ❌ Não |
| current_episode | 1122 | 1122 | ❌ Não |
| current_chapter | 0 | 0 | ❌ Não |
| rating | null | null | ❌ Não |
| notes | null | null | ❌ Não |
| season_mal_id | null | null | ❌ Não |
| external_provider | null | null | ❌ Não |
| external_provider_id | null | null | ❌ Não |

---

## 5. Confirmação: Progresso Intacto

| Entry ID | Status | current_episode | current_chapter | Antes = Depois? |
|---------|--------|-----------------|-----------------|-----------------|
| `6a2c0aa45825ba62ab9ac4bb` | completed | 1 | 0 | ✅ Sim |
| `6a2c0a9c85382b2b2fbb6d11` | completed | 1 | 0 | ✅ Sim |
| `69f89f820ba669af6d16ffe9` | watching | 90 | 0 | ✅ Sim |
| `69f7d8e3957023659d3bbe68` | completed | 1122 | 0 | ✅ Sim |
| `69f6a5d124acab3fc62d7de4` | completed | 1122 | 0 | ✅ Sim |

**5/5 entries têm status e progresso idênticos antes e depois.** Apenas release_id foi alterado. ✅

---

## 6. Confirmação: Manga e Liveaction Não Afetados

Os 4 entries que NÃO deveriam ser alterados permanecem com release_id=null:

### Liveaction (2 entries)
| ID | Type | release_id | Permanece null? |
|-----|------|------------|----------------|
| `6a2c0aa74cc373431d83c30f` | liveaction | null | ✅ Sim |
| `69fa04366acca087d4f00a10` | liveaction | null | ✅ Sim |

### Manga (2 entries)
| ID | Type | release_id | Permanece null? |
|-----|------|------------|----------------|
| `69f7d8ea7b91b9c7023a99b1` | manga | null | ✅ Sim |
| `69f6a5c43f51af209774105b` | manga | null | ✅ Sim |

**4/4 entries não-alvo permanecem intactos.** ✅

---

## 7. Confirmação: 12 Entries Previamente Backfilled Intactos

| ID | Title | release_id | Permanece? |
|-----|-------|------------|-----------|
| `6a329d487f80555f04f4b004` | Attack on Titan | `6a8b7281c22ab4a66c9395a4` | ✅ Sim |
| `6a329d41f5c8912c1741678a` | Attack on Titan | `6a8b7281c22ab4a66c9395a5` | ✅ Sim |
| `6a329d23fcc80f602a5f6437` | Attack on Titan | `6a8b7281c22ab4a66c9395a6` | ✅ Sim |
| `6a329d1a36006bb27008d213` | Attack on Titan | `6a8b7281c22ab4a66c9395a8` | ✅ Sim |
| `6a329d0c4e0d3fecca85006a` | Attack on Titan | `6a8b7281c22ab4a66c9395a9` | ✅ Sim |
| `6a329d03de3010f57e567429` | Attack on Titan | `6a8b7281c22ab4a66c9395a7` | ✅ Sim |
| `6a3170870b34cafb0e237eba` | Mushoku Tensei | `6a8b7281c22ab4a66c9394f8` | ✅ Sim |
| `6a3170673ac4b2d54269ebe0` | Mashle | `6a8b7281c22ab4a66c939509` | ✅ Sim |
| `6a2ba9c408af1541baf29032` | Hunter x Hunter | `6a8b7d29979c03340844a8b4` | ✅ Sim |
| `6a2b86e77db607fb06b40813` | Hunter x Hunter | `6a8b7d29979c03340844a8b4` | ✅ Sim |
| `6a2b85e39033c5656dda2d7e` | Hunter x Hunter | `6a8b7d29979c03340844a8b4` | ✅ Sim |
| `69f7fa56ca803a4580652215` | Dragon Ball | `6a8b7281c22ab4a66c93952f` | ✅ Sim |

**12/12 entries previamente backfilled permanecem intactos.** ✅

---

## 8. Estado Final — One Piece (9 entries)

| # | ID | Type | Status | release_id | current_episode | current_chapter |
|---|-----|------|--------|------------|-----------------|-----------------|
| 1 | `6a2c0aa74cc373431d83c30f` | liveaction | completed | **null** | 2 | 0 |
| 2 | `6a2c0aa45825ba62ab9ac4bb` | anime | completed | `6a9bbdcb6e1c8e3f18eb7211` | 1 | 0 |
| 3 | `6a2c0a9c85382b2b2fbb6d11` | anime | completed | `6a9bbdcb6e1c8e3f18eb7211` | 1 | 0 |
| 4 | `69fa04366acca087d4f00a10` | liveaction | watching | **null** | 0 | 0 |
| 5 | `69f89f820ba669af6d16ffe9` | anime | watching | `6a9bbdcb6e1c8e3f18eb7211` | 90 | 0 |
| 6 | `69f7d8ea7b91b9c7023a99b1` | manga | reading | **null** | 0 | 1122 |
| 7 | `69f7d8e3957023659d3bbe68` | anime | completed | `6a9bbdcb6e1c8e3f18eb7211` | 1122 | 0 |
| 8 | `69f6a5d124acab3fc62d7de4` | anime | completed | `6a9bbdcb6e1c8e3f18eb7211` | 1122 | 0 |
| 9 | `69f6a5c43f51af209774105b` | manga | reading | **null** | 0 | 1181 |

- **5 anime:** todos com release_id = `6a9bbdcb6e1c8e3f18eb7211` ✅
- **2 manga:** todos com release_id = null ✅
- **2 liveaction:** todos com release_id = null ✅

---

## 9. Contagens Finais de AnimeEntry

| Métrica | Valor | Esperado | Status |
|---------|-------|----------|--------|
| Total | 102 | 102 | ✅ |
| Com release_id != null | 17 | 17 | ✅ |
| Com release_id = null | 85 | 85 | ✅ |

**Matemática:** 12 (previamente backfilled) + 5 (One Piece anime) = 17 com release_id. ✅

---

## 10. Validações Pós-Backfill (checklist)

| # | Validação | Resultado | Status |
|---|-----------|-----------|--------|
| 1 | Exatamente 5 AnimeEntry foram atualizados | 5 | ✅ |
| 2 | Todos os 5 são type=anime | 5/5 | ✅ |
| 3 | Todos os 5 têm release_id = `6a9bbdcb6e1c8e3f18eb7211` | 5/5 | ✅ |
| 4 | Os 2 manga de One Piece continuam release_id=null | 2/2 | ✅ |
| 5 | Os 2 liveaction de One Piece continuam release_id=null | 2/2 | ✅ |
| 6 | Os 12 AnimeEntry previamente backfilled continuam intactos | 12/12 | ✅ |
| 7 | Total: 102 entries, 17 com release_id, 85 sem | Confirmado | ✅ |
| 8 | Nenhum status ou progresso foi alterado | 0 alterações | ✅ |
| 9 | Nenhum WorkRelease foi alterado | 0 alterações | ✅ |
| 10 | Nenhum ExternalMapping foi alterado | 0 alterações | ✅ |
| 11 | Nenhum DynamicWork foi alterado | 0 alterações | ✅ |
| 12 | Nenhum frontend foi alterado | 0 alterações | ✅ |
| 13 | SyncConflict continua 0 | 0 | ✅ |

---

## 11. Critério de Aceitação

> "Somente os 5 AnimeEntry type=anime de One Piece recebem o release_id `one-piece-main`, sem qualquer outra alteração."

### Status: ✅ APROVADO

- ✅ Exatamente 5 AnimeEntry atualizados (não mais, não menos)
- ✅ Todos os 5 são type=anime (manga e liveaction excluídos)
- ✅ Todos os 5 receberam release_id = `6a9bbdcb6e1c8e3f18eb7211` (one-piece-main)
- ✅ Apenas release_id foi alterado — nenhum outro campo tocado
- ✅ Status, current_episode, current_chapter, rating, notes, season_mal_id, external_provider, external_provider_id — todos intactos
- ✅ 12 entries previamente backfilled permanecem intactos
- ✅ Nenhuma outra entidade foi alterada

---

## 12. Conclusão

**Fase 3B-5 executada com sucesso.** O backfill controlado atribuiu o WorkRelease `one-piece-main` exclusivamente aos 5 AnimeEntry de One Piece com type=anime, respeitando a separação entre anime, manga e liveaction identificada na auditoria.

### Próximos passos sugeridos
- Os 2 entries manga de One Piece permanecem sem release_id até que um WorkRelease manga seja criado para One Piece
- Os 2 entries liveaction de One Piece permanecem sem release_id até que um WorkRelease liveaction seja criado para One Piece
- Death Note não possui AnimeEntry entries — nenhum backfill necessário