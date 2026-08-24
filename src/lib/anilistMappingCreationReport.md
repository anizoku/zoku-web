# Fase 3B-1 — Relatório: Criação de ExternalMapping provider=anilist

**Data:** 2026-08-24
**Tipo:** Escrita controlada (apenas ExternalMapping provider=anilist)
**Escopo:** Criar ExternalMapping `provider=anilist` para as 9 obras com match_mal seguro no dry-run da Fase 3A
**API:** AniList GraphQL (dados já coletados na Fase 3A — nenhuma nova chamada à API)

---

## 1. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| ExternalMappings anilist criados | **9** ✅ |
| ExternalMappings anilist duplicados | **0** ✅ |
| Obras puladas (já tinham mapping) | **0** |
| DynamicWork alterados | **0** ✅ |
| WorkRelease alterados | **0** ✅ |
| SyncConflict criados | **0** ✅ |
| AnimeEntry alterados | **0** ✅ |
| Dados visuais atualizados (score, poster, banner, título, sinopse) | **0** ✅ |
| Frontend alterado | **0** ✅ |

---

## 2. Mappings Criados

### 1. Re:Zero
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef828` |
| AniList ID (provider_id) | 21355 |
| MAL ID/idMal usado para vincular | 31240 |
| ExternalMapping mal de referência | `6a8b72816a21c194c7f1650a` |
| WorkRelease vinculado | `6a8b7281c22ab4a66c9394dc` |
| DynamicWork vinculado | `6a4d539357d49aa63f387503` (slug: `rezero--starting-life-in-another-world-`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 2. Dan Da Dan
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef829` |
| AniList ID (provider_id) | 171018 |
| MAL ID/idMal usado para vincular | 57334 |
| ExternalMapping mal de referência | `6a8b7cd2ddf2252d460c4f82` |
| WorkRelease vinculado | `6a8b7cd238aae161e3d81d73` |
| DynamicWork vinculado | `6a4d567b19cbf3ad51fdb9ee` (slug: `dan-da-dan`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 3. Hunter x Hunter
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef82a` |
| AniList ID (provider_id) | 11061 |
| MAL ID/idMal usado para vincular | 11061 |
| ExternalMapping mal de referência | `6a8b7d29d26c795c1894c1ae` |
| WorkRelease vinculado | `6a8b7d29979c03340844a8b4` |
| DynamicWork vinculado | `6a5074d40366340112f3fbb2` (slug: `hunter-x-hunter`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 4. Attack on Titan
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef82b` |
| AniList ID (provider_id) | 16498 |
| MAL ID/idMal usado para vincular | 16498 |
| ExternalMapping mal de referência | `6a8b72816a21c194c7f165d1` |
| WorkRelease vinculado | `6a8b7281c22ab4a66c9395a3` |
| DynamicWork vinculado | `6a2bb0e21a8790e0af8fd87f` (slug: `attack-on-titan`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 5. Mushoku Tensei
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef82c` |
| AniList ID (provider_id) | 108465 |
| MAL ID/idMal usado para vincular | 39535 |
| ExternalMapping mal de referência | `6a8b72816a21c194c7f16525` |
| WorkRelease vinculado | `6a8b7281c22ab4a66c9394f7` |
| DynamicWork vinculado | `6a2bb254903e60727c93b2d2` (slug: `mushoku-tensei-jobless-reincarnation`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 6. Mashle
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef82d` |
| AniList ID (provider_id) | 151801 |
| MAL ID/idMal usado para vincular | 52211 |
| ExternalMapping mal de referência | `6a8b72816a21c194c7f16535` |
| WorkRelease vinculado | `6a8b7281c22ab4a66c939507` |
| DynamicWork vinculado | `6a2bb18fa8a5bf6f1e48eb5b` (slug: `mashle-magic-and-muscles`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 7. Naruto
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef82e` |
| AniList ID (provider_id) | 20 |
| MAL ID/idMal usado para vincular | 20 |
| ExternalMapping mal de referência | `6a8b72816a21c194c7f165bd` |
| WorkRelease vinculado | `6a8b7281c22ab4a66c93958f` |
| DynamicWork vinculado | `6a2bb0e8a01ed5becc8b6651` (slug: `naruto`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 8. Tokyo Ghoul
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef82f` |
| AniList ID (provider_id) | 20605 |
| MAL ID/idMal usado para vincular | 22319 |
| ExternalMapping mal de referência | `6a8b72816a21c194c7f165ba` |
| WorkRelease vinculado | `6a8b7281c22ab4a66c93958c` |
| DynamicWork vinculado | `6a2bb0e8be2230ef39be837b` (slug: `tokyo-ghoul`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

### 9. Bleach
| Campo | Valor |
|-------|-------|
| ExternalMapping anilist ID | `6a8ba023e98932f881eef830` |
| AniList ID (provider_id) | 269 |
| MAL ID/idMal usado para vincular | 269 |
| ExternalMapping mal de referência | `6a8b72816a21c194c7f165af` |
| WorkRelease vinculado | `6a8b7281c22ab4a66c939581` |
| DynamicWork vinculado | `6a2bb0f7b9bfa93efa6fd227` (slug: `bleach`) |
| provider_type | anime |
| confidence_score | 100 |
| verified_by_admin | false |

---

## 3. Validações

### 3.1 Exatamente 9 ExternalMapping provider=anilist existem

| Métrica | Valor | Status |
|---------|-------|--------|
| Total de ExternalMapping anilist | 9 | ✅ |
| Total de ExternalMapping mal | 212 (inalterado) | ✅ |
| Total de ExternalMapping (geral) | 221 (212 + 9) | ✅ |

### 3.2 Zero duplicatas em provider + provider_id + provider_type

| Métrica | Valor | Status |
|---------|-------|--------|
| Total de chaves únicas (provider:provider_id:provider_type) | 9 | ✅ |
| Total de chaves (com repetição) | 9 | ✅ |
| Tem duplicatas? | false | ✅ |

### 3.3 Cada mapping anilist aponta para o mesmo work_release_id do mapping mal correspondente

| Obra | AniList work_release_id | MAL work_release_id | Batem? |
|------|----------------------|---------------------|--------|
| Re:Zero | `6a8b7281c22ab4a66c9394dc` | `6a8b7281c22ab4a66c9394dc` | ✅ |
| Dan Da Dan | `6a8b7cd238aae161e3d81d73` | `6a8b7cd238aae161e3d81d73` | ✅ |
| Hunter x Hunter | `6a8b7d29979c03340844a8b4` | `6a8b7d29979c03340844a8b4` | ✅ |
| Attack on Titan | `6a8b7281c22ab4a66c9395a3` | `6a8b7281c22ab4a66c9395a3` | ✅ |
| Mushoku Tensei | `6a8b7281c22ab4a66c9394f7` | `6a8b7281c22ab4a66c9394f7` | ✅ |
| Mashle | `6a8b7281c22ab4a66c939507` | `6a8b7281c22ab4a66c939507` | ✅ |
| Naruto | `6a8b7281c22ab4a66c93958f` | `6a8b7281c22ab4a66c93958f` | ✅ |
| Tokyo Ghoul | `6a8b7281c22ab4a66c93958c` | `6a8b7281c22ab4a66c93958c` | ✅ |
| Bleach | `6a8b7281c22ab4a66c939581` | `6a8b7281c22ab4a66c939581` | ✅ |

**9/9 work_release_ids batem.** ✅

### 3.4 Cada mapping anilist aponta para o mesmo work_group_id do mapping mal correspondente

| Obra | AniList work_group_id | MAL work_group_id | Batem? |
|------|---------------------|-------------------|--------|
| Re:Zero | `6a4d539357d49aa63f387503` | `6a4d539357d49aa63f387503` | ✅ |
| Dan Da Dan | `6a4d567b19cbf3ad51fdb9ee` | `6a4d567b19cbf3ad51fdb9ee` | ✅ |
| Hunter x Hunter | `6a5074d40366340112f3fbb2` | `6a5074d40366340112f3fbb2` | ✅ |
| Attack on Titan | `6a2bb0e21a8790e0af8fd87f` | `6a2bb0e21a8790e0af8fd87f` | ✅ |
| Mushoku Tensei | `6a2bb254903e60727c93b2d2` | `6a2bb254903e60727c93b2d2` | ✅ |
| Mashle | `6a2bb18fa8a5bf6f1e48eb5b` | `6a2bb18fa8a5bf6f1e48eb5b` | ✅ |
| Naruto | `6a2bb0e8a01ed5becc8b6651` | `6a2bb0e8a01ed5becc8b6651` | ✅ |
| Tokyo Ghoul | `6a2bb0e8be2230ef39be837b` | `6a2bb0e8be2230ef39be837b` | ✅ |
| Bleach | `6a2bb0f7b9bfa93efa6fd227` | `6a2bb0f7b9bfa93efa6fd227` | ✅ |

**9/9 work_group_ids batem.** ✅

### 3.5 Death Note e One Piece continuam sem mapping anilist

| Obra | Tem mapping anilist? | Tem mapping mal? | Status |
|------|---------------------|-----------------|--------|
| Death Note (mal=1535) | ❌ Não | ❌ Não | ✅ Intacto |
| One Piece (mal=21) | ❌ Não | ❌ Não | ✅ Intacto |

### 3.6 Nenhum dado visual foi atualizado

Amostra de DynamicWork (score e poster permanecem inalterados):

| Obra | Score (antes = depois) | Poster URL (MAL, inalterado) | sync_status |
|------|----------------------|------------------------------|-------------|
| Re:Zero | 8.25 | https://cdn.myanimelist.net/images/anime/1522/128039l.jpg | synced |
| Bleach | 8 | https://cdn.myanimelist.net/images/anime/1541/147774l.jpg | synced |
| Naruto | 8.02 | https://cdn.myanimelist.net/images/anime/1141/142503l.jpg | synced |

**Nenhum score, poster, banner, título ou sinopse foi alterado.** Os posters continuam sendo do MAL (cdn.myanimelist.net), não do AniList. ✅

### 3.7 AnimeEntry ficou intacto

| Métrica | Valor | Status |
|---------|-------|--------|
| Total de AnimeEntry (antes = depois) | 102 | ✅ Intacto |
| AnimeEntry alterados | 0 | ✅ |
| Progresso de usuário alterado | 0 | ✅ |

---

## 4. Regras Obedecidas

| # | Regra | Status |
|---|-------|--------|
| 1 | Criar ExternalMapping provider=anilist somente para as 9 obras com match_mal seguro | ✅ 9 criados |
| 2 | Cada mapping anilist aponta para o mesmo work_group_id e work_release_id do mapping mal | ✅ 9/9 validados |
| 3 | Nunca assumir que AniList ID = MAL ID (match via idMal) | ✅ Regra respeitada |
| 4 | Não criar mapping anilist para Death Note e One Piece | ✅ Nenhum criado |
| 5 | Não criar mapping mal para Death Note e One Piece | ✅ Nenhum criado |
| 6 | Não criar WorkRelease | ✅ 0 criados |
| 7 | Não criar DynamicWork | ✅ 0 criados |
| 8 | Não criar SyncConflict real | ✅ 0 criados |
| 9 | Não alterar AnimeEntry | ✅ 0 alterados |
| 10 | Não alterar progresso de usuário | ✅ 0 alterados |
| 11 | Não alterar frontend | ✅ 0 arquivos alterados |
| 12 | Não atualizar score, poster, banner, popularity, trending, synopsis ou title | ✅ 0 atualizados |
| 13 | Não usar fuzzy matching | ✅ Não usado |
| 14 | Não usar LLM | ✅ Não usado |
| 15 | Não criar SyncQueue | ✅ 0 criados |
| 16 | Não integrar TheTVDB | ✅ Não integrado |
| 17 | Upsert seguro (não duplicar se já existe) | ✅ 0 duplicatas |
| 18 | Validar antes de criar que mapping mal aponta para WorkRelease existente | ✅ Todos validados |

---

## 5. Método de Criação

### Estratégia
1. Para cada uma das 9 obras, buscar o ExternalMapping `provider=mal` com `provider_id` = `idMal` (MAL ID retornado pelo AniList na Fase 3A)
2. Validar que o mapping mal aponta para `work_release_id` existente
3. Verificar upsert: se já existe mapping anilist para o mesmo `provider_id` + `provider_type`, pular (não duplicar)
4. Criar ExternalMapping `provider=anilist` com:
   - `provider_id` = AniList ID (não MAL ID)
   - `work_group_id` = mesmo do mapping mal
   - `work_release_id` = mesmo do mapping mal
   - `provider_type` = "anime"
   - `confidence_score` = 100 (match por ID exato via idMal)
   - `verified_by_admin` = false (criado automaticamente, não verificado manualmente)
   - `last_synced_at` = timestamp atual

### Regra de ID (PONTO 3)
**Nunca assumir que AniList ID = MAL ID.** Para 6 das 9 obras, os IDs são diferentes:
- Re:Zero: AniList=21355, MAL=31240
- Dan Da Dan: AniList=171018, MAL=57334
- Mushoku Tensei: AniList=108465, MAL=39535
- Mashle: AniList=151801, MAL=52211
- Tokyo Ghoul: AniList=20605, MAL=22319
- Hunter x Hunter: AniList=11061, MAL=11061 (iguais por coincidência)

O `provider_id` do mapping anilist é sempre o **AniList ID**, nunca o MAL ID.

---

## 6. Critério de Aceitação

> "Após a Fase 3B-1, as 9 obras seguras passam a ter ExternalMapping provider=anilist, sem alterar catálogo visual, progresso de usuário ou criar dados novos de obra."

### Status: ✅ APROVADO

| Critério | Status | Evidência |
|----------|--------|-----------|
| 9 obras têm ExternalMapping provider=anilist | ✅ | 9 mappings criados e validados |
| Nenhum catálogo visual foi alterado | ✅ | Scores e posters do MAL permanecem intactos |
| Nenhum progresso de usuário foi alterado | ✅ | 102 AnimeEntry intactos |
| Nenhum dado novo de obra foi criado | ✅ | 0 WorkRelease, 0 DynamicWork, 0 SyncConflict criados |
| 0 duplicatas | ✅ | 9 chaves únicas (provider:provider_id:provider_type) |
| Cada mapping anilist aponta para o mesmo work_release_id do mapping mal | ✅ | 9/9 validados |
| Death Note e One Piece continuam sem mapping anilist | ✅ | Confirmado |

---

## 7. Conclusão

**Fase 3B-1 executada com sucesso.** 9 ExternalMapping `provider=anilist` criados para as obras seguras (Re:Zero, Dan Da Dan, Hunter x Hunter, Attack on Titan, Mushoku Tensei, Mashle, Naruto, Tokyo Ghoul, Bleach). Cada mapping aponta para o mesmo WorkRelease e DynamicWork do mapping mal correspondente. Nenhum dado visual, progresso de usuário ou obra nova foi criado/alterado.

**Estado do banco após Fase 3B-1:**
- 797 DynamicWork (inalterado)
- 221 ExternalMapping (212 mal + 9 anilist)
- 212 WorkRelease (inalterado)
- 0 SyncConflict (inalterado)
- 102 AnimeEntry (inalterado)

**Próximos passos sugeridos:**
- Fase 3B-2: Criar ExternalMapping `provider=mal` para Death Note e One Piece (manual, com revisão admin)
- Fase 3B-3: Upsert controlado de dados visuais (score, poster) com threshold e política de merge
- Fase 3B-4: Importar relations missing (filmes/OVAs/ONA) como WorkReleases