# Fase 3A — Relatório de Dry-Run: Integração AniList (API Real)

**Data:** 2026-08-24
**Tipo:** Dry-run (leitura + simulação, sem escrita)
**API:** AniList GraphQL (`https://graphql.anilist.co`) — **API REAL** (não Jikan fallback)
**Escopo:** Validar matching AniList ↔ catálogo interno por ID externo

---

## ⚠️ Descoberta Crítica: AniList ID ≠ MAL ID

A assunção do dry-run anterior (AniList ID = MAL ID) está **INCORRETA**. A API real do AniList confirma que os IDs são diferentes para a maioria das obras:

| Obra | AniList ID | MAL ID (idMal) | Iguais? |
|------|-----------|----------------|---------|
| Re:Zero | **21355** | 31240 | ❌ Diferentes |
| Dan Da Dan | **171018** | 57334 | ❌ Diferentes |
| Mushoku Tensei | **108465** | 39535 | ❌ Diferentes |
| Mashle | **151801** | 52211 | ❌ Diferentes |
| Tokyo Ghoul | **20605** | 22319 | ❌ Diferentes |
| Hunter x Hunter | 11061 | 11061 | ✅ Iguais |
| Attack on Titan | 16498 | 16498 | ✅ Iguais |
| Naruto | 20 | 20 | ✅ Iguais |
| Death Note | 1535 | 1535 | ✅ Iguais |
| One Piece | 21 | 21 | ✅ Iguais |
| Bleach | 269 | 269 | ✅ Iguais |

**6/11 obras têm AniList ID ≠ MAL ID.** O matching por `idMal` (MAL ID retornado pelo AniList) é confiável e correto. O matching por AniList ID direto só funciona quando já existe ExternalMapping `provider=anilist`.

---

## 1. Resumo do Matching

| Métrica | Valor |
|---------|-------|
| Total de obras testadas | 11 |
| Dados AniList obtidos com sucesso | 11/11 ✅ |
| **match_anilist** (seguro por ExternalMapping anilist) | **0** (esperado — 0 mappings anilist existem) |
| **match_mal** (seguro por ExternalMapping mal via idMal) | **9** ✅ |
| **suggestion** (sem match, mas sugestão possível) | **2** (Death Note, One Piece) |
| **no_match** (sem match nenhum) | **0** |
| Campos que seriam atualizados | 9 obras (score + poster) |
| Dados gravados no banco | **0** ✅ |

---

## 2. Resultados Detalhados — Obras Migradas (6)

### 1. Re:Zero (MAL 31240)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:31240` |
| AniList ID | 21355 |
| idMal | 31240 |
| Título romaji | Re:Zero kara Hajimeru Isekai Seikatsu |
| Título english | Re:ZERO -Starting Life in Another World- |
| Título native | Re:ゼロから始める異世界生活 |
| Format | TV |
| Status | FINISHED |
| Season | spring |
| Season year | 2016 |
| Episodes | 25 |
| Duration minutes | 25 |
| Score | 8.1 |
| Popularity | 616312 |
| Trending score | 28 |
| Cover URL | https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21355-wRVUrGxpvIQQ.jpg |
| Banner URL | https://s4.anilist.co/file/anilistcdn/media/anime/banner/21355-f9SjOfEJMk5P.jpg |
| Relations count | 13 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b72816a21c194c7f1650a` (wg=`6a4d539357d49aa63f387503`, wr=`6a8b7281c22ab4a66c9394dc`) |
| WorkRelease que seria atualizado | `6a8b7281c22ab4a66c9394dc` |
| DynamicWork afetado | `6a4d539357d49aa63f387503` (slug: `rezero--starting-life-in-another-world-`, 4 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 8.25→8.1, poster: changed |

### 2. Dan Da Dan (MAL 57334)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:57334` |
| AniList ID | 171018 |
| idMal | 57334 |
| Título romaji | Dandadan |
| Título english | DAN DA DAN |
| Título native | ダンダダン |
| Format | TV |
| Status | FINISHED |
| Season | fall |
| Season year | 2024 |
| Episodes | 12 |
| Duration minutes | 24 |
| Score | 8.3 |
| Popularity | 380038 |
| Trending score | 18 |
| Cover URL | https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx171018-60q1B6GK2Ghb.jpg |
| Banner URL | https://s4.anilist.co/file/anilistcdn/media/anime/banner/171018-SpwPNAduszXl.jpg |
| Relations count | 3 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b7cd2ddf2252d460c4f82` (wg=`6a4d567b19cbf3ad51fdb9ee`, wr=`6a8b7cd238aae161e3d81d73`) |
| WorkRelease que seria atualizado | `6a8b7cd238aae161e3d81d73` |
| DynamicWork afetado | `6a4d567b19cbf3ad51fdb9ee` (slug: `dan-da-dan`, 3 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 8.4→8.3, poster: changed |

### 3. Hunter x Hunter (MAL 11061)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:11061` |
| AniList ID | 11061 |
| idMal | 11061 |
| Título romaji | HUNTER×HUNTER (2011) |
| Título english | Hunter x Hunter (2011) |
| Título native | HUNTER×HUNTER (2011) |
| Format | TV |
| Status | FINISHED |
| Season | fall |
| Season year | 2011 |
| Episodes | 148 |
| Duration minutes | 24 |
| Score | 8.9 |
| Popularity | 834802 |
| Trending score | 52 |
| Relations count | 9 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b7d29d26c795c1894c1ae` (wg=`6a5074d40366340112f3fbb2`, wr=`6a8b7d29979c03340844a8b4`) |
| WorkRelease que seria atualizado | `6a8b7d29979c03340844a8b4` |
| DynamicWork afetado | `6a5074d40366340112f3fbb2` (slug: `hunter-x-hunter`, 3 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 9.03→8.9, poster: changed |

### 4. Attack on Titan (MAL 16498)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:16498` |
| AniList ID | 16498 |
| idMal | 16498 |
| Título romaji | Shingeki no Kyojin |
| Título english | Attack on Titan |
| Título native | 進撃の巨人 |
| Format | TV |
| Status | FINISHED |
| Season | spring |
| Season year | 2013 |
| Episodes | 25 |
| Duration minutes | 24 |
| Score | 8.5 |
| Popularity | 1046082 |
| Trending score | 35 |
| Relations count | 11 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b72816a21c194c7f165d1` (wg=`6a2bb0e21a8790e0af8fd87f`, wr=`6a8b7281c22ab4a66c9395a3`) |
| WorkRelease que seria atualizado | `6a8b7281c22ab4a66c9395a3` |
| DynamicWork afetado | `6a2bb0e21a8790e0af8fd87f` (slug: `attack-on-titan`, 7 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 8.57→8.5, poster: changed |

### 5. Mushoku Tensei (MAL 39535)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:39535` |
| AniList ID | 108465 |
| idMal | 39535 |
| Título romaji | Mushoku Tensei: Isekai Ittara Honki Dasu |
| Título english | Mushoku Tensei: Jobless Reincarnation |
| Título native | 無職転生 ～異世界行ったら本気だす～ |
| Format | TV |
| Status | FINISHED |
| Season | winter |
| Season year | 2021 |
| Episodes | 11 |
| Duration minutes | 24 |
| Score | 8.2 |
| Popularity | 452518 |
| Trending score | 21 |
| Relations count | 3 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b72816a21c194c7f16525` (wg=`6a2bb254903e60727c93b2d2`, wr=`6a8b7281c22ab4a66c9394f7`) |
| WorkRelease que seria atualizado | `6a8b7281c22ab4a66c9394f7` |
| DynamicWork afetado | `6a2bb254903e60727c93b2d2` (slug: `mushoku-tensei-jobless-reincarnation`, 4 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 8.33→8.2, poster: changed |

### 6. Mashle (MAL 52211)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:52211` |
| AniList ID | 151801 |
| idMal | 52211 |
| Título romaji | MASHLE |
| Título english | MASHLE: MAGIC AND MUSCLES |
| Título native | マッシュル-MASHLE- |
| Format | TV |
| Status | FINISHED |
| Season | spring |
| Season year | 2023 |
| Episodes | 12 |
| Duration minutes | 24 |
| Score | 7.6 |
| Popularity | 285745 |
| Trending score | 7 |
| Relations count | 2 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b72816a21c194c7f16535` (wg=`6a2bb18fa8a5bf6f1e48eb5b`, wr=`6a8b7281c22ab4a66c939507`) |
| WorkRelease que seria atualizado | `6a8b7281c22ab4a66c939507` |
| DynamicWork afetado | `6a2bb18fa8a5bf6f1e48eb5b` (slug: `mashle-magic-and-muscles`, 3 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 7.61→7.6, poster: changed |

---

## 3. Resultados Detalhados — Obras Não Migradas (5)

### 7. Naruto (MAL 20)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:20` |
| AniList ID | 20 |
| idMal | 20 |
| Título romaji | NARUTO |
| Título english | Naruto |
| Título native | NARUTO -ナルト- |
| Format | TV |
| Status | FINISHED |
| Season | fall |
| Season year | 2002 |
| Episodes | 220 |
| Duration minutes | 23 |
| Score | 8.0 |
| Popularity | 719988 |
| Trending score | 58 |
| Relations count | 12 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b72816a21c194c7f165bd` (wg=`6a2bb0e8a01ed5becc8b6651`, wr=`6a8b7281c22ab4a66c93958f`) |
| WorkRelease que seria atualizado | `6a8b7281c22ab4a66c93958f` |
| DynamicWork afetado | `6a2bb0e8a01ed5becc8b6651` (slug: `naruto`, 2 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 8.02→8.0, poster: changed |

### 8. Death Note (MAL 1535) — ⚠️ SUGGESTION
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:1535` |
| AniList ID | 1535 |
| idMal | 1535 |
| Título romaji | DEATH NOTE |
| Título english | Death Note |
| Título native | DEATH NOTE |
| Format | TV |
| Status | FINISHED |
| Season | fall |
| Season year | 2006 |
| Episodes | 37 |
| Duration minutes | 23 |
| Score | 8.4 |
| Popularity | 953957 |
| Trending score | 29 |
| Relations count | 3 |
| **match_category** | **suggestion** (link_existing) |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ❌ não existe |
| WorkRelease que seria atualizado | null |
| DynamicWork afetado | `6a2bb0e39902c5843cb844da` (slug: `death-note`, 0 releases) |
| **Criaria SyncConflict simulado?** | ✅ **Sim** |
| SyncConflict simulado | `{ provider: "anilist", provider_id: "1535", conflict_type: "no_match", suggested_action: "link_existing", confidence: 80 }` |
| Campos que seriam atualizados | nenhum (suggestion não upserta) |

### 9. Tokyo Ghoul (MAL 22319)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:22319` |
| AniList ID | 20605 |
| idMal | 22319 |
| Título romaji | Tokyo Ghoul |
| Título english | Tokyo Ghoul |
| Título native | 東京喰種 トーキョーグール |
| Format | TV |
| Status | FINISHED |
| Season | summer |
| Season year | 2014 |
| Episodes | 12 |
| Duration minutes | 24 |
| Score | 7.6 |
| Popularity | 734976 |
| Trending score | 13 |
| Relations count | 5 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b72816a21c194c7f165ba` (wg=`6a2bb0e8be2230ef39be837b`, wr=`6a8b7281c22ab4a66c93958c`) |
| WorkRelease que seria atualizado | `6a8b7281c22ab4a66c93958c` |
| DynamicWork afetado | `6a2bb0e8be2230ef39be837b` (slug: `tokyo-ghoul`, 3 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 7.79→7.6, poster: changed |

### 10. One Piece (MAL 21) — ⚠️ SUGGESTION
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:21` |
| AniList ID | 21 |
| idMal | 21 |
| Título romaji | ONE PIECE |
| Título english | ONE PIECE |
| Título native | ONE PIECE |
| Format | TV |
| Status | RELEASING |
| Season | fall |
| Season year | 1999 |
| Episodes | null (aindo em exibição) |
| Duration minutes | 24 |
| Score | 8.7 |
| Popularity | 743982 |
| Trending score | 411 |
| Relations count | 65 |
| **match_category** | **suggestion** (link_existing) |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ❌ não existe |
| WorkRelease que seria atualizado | null |
| DynamicWork afetado | `6a2bb0ec71e0d6c6dbac6e88` (slug: `one-piece`, 0 releases) |
| **Criaria SyncConflict simulado?** | ✅ **Sim** |
| SyncConflict simulado | `{ provider: "anilist", provider_id: "21", conflict_type: "no_match", suggested_action: "link_existing", confidence: 80 }` |
| Campos que seriam atualizados | nenhum (suggestion não upserta) |

### 11. Bleach (MAL 269)
| Campo | Valor |
|-------|-------|
| Termo pesquisado | `mal_id:269` |
| AniList ID | 269 |
| idMal | 269 |
| Título romaji | BLEACH |
| Título english | Bleach |
| Título native | BLEACH |
| Format | TV |
| Status | FINISHED |
| Season | fall |
| Season year | 2004 |
| Episodes | 366 |
| Duration minutes | 24 |
| Score | 7.9 |
| Popularity | 514292 |
| Trending score | 149 |
| Relations count | 11 |
| **match_category** | **match_mal** |
| ExternalMapping anilist | ❌ não existe |
| ExternalMapping mal | ✅ `6a8b72816a21c194c7f165af` (wg=`6a2bb0f7b9bfa93efa6fd227`, wr=`6a8b7281c22ab4a66c939581`) |
| WorkRelease que seria atualizado | `6a8b7281c22ab4a66c939581` |
| DynamicWork afetado | `6a2bb0f7b9bfa93efa6fd227` (slug: `bleach`, 2 releases) |
| Criaria SyncConflict simulado? | ❌ Não |
| Campos que seriam atualizados | score: 8→7.9, poster: changed |

---

## 4. Validações

### 4.1 Quantos casos deram match seguro por AniList ID?
**0** — Esperado. Nenhum ExternalMapping `provider=anilist` existe no banco (0/212 mappings). Todos os matches são via `provider=mal`.

### 4.2 Quantos casos deram match seguro por MAL ID?
**9** — Re:Zero, Dan Da Dan, Hunter x Hunter, Attack on Titan, Mushoku Tensei, Mashle, Naruto, Tokyo Ghoul, Bleach. Todos têm ExternalMapping `provider=mal` com `provider_id` = `idMal` retornado pelo AniList.

### 4.3 Quantos casos viraram suggestion?
**2** — Death Note (mal=1535) e One Piece (mal=21). Ambos têm DynamicWork no catálogo mas sem ExternalMapping `provider=mal`. O AniList retornou `idMal` correto, então a sugestão é `link_existing` (criar ExternalMapping manualmente).

### 4.4 Quantos casos viraram no_match?
**0** — Todas as 11 obras foram encontradas no AniList e classificadas.

### 4.5 Algum match seguro apontou para obra errada?
**❌ Não.** Validação cruzada dos 9 match `match_mal`:

| Obra | work_group_id no ExternalMapping | DynamicWork.id encontrado por mal_id | Batem? |
|------|--------------------------------|--------------------------------------|--------|
| Re:Zero | `6a4d539357d49aa63f387503` | `6a4d539357d49aa63f387503` | ✅ |
| Dan Da Dan | `6a4d567b19cbf3ad51fdb9ee` | `6a4d567b19cbf3ad51fdb9ee` | ✅ |
| Hunter x Hunter | `6a5074d40366340112f3fbb2` | `6a5074d40366340112f3fbb2` | ✅ |
| Attack on Titan | `6a2bb0e21a8790e0af8fd87f` | `6a2bb0e21a8790e0af8fd87f` | ✅ |
| Mushoku Tensei | `6a2bb254903e60727c93b2d2` | `6a2bb254903e60727c93b2d2` | ✅ |
| Mashle | `6a2bb18fa8a5bf6f1e48eb5b` | `6a2bb18fa8a5bf6f1e48eb5b` | ✅ |
| Naruto | `6a2bb0e8a01ed5becc8b6651` | `6a2bb0e8a01ed5becc8b6651` | ✅ |
| Tokyo Ghoul | `6a2bb0e8be2230ef39be837b` | `6a2bb0e8be2230ef39be837b` | ✅ |
| Bleach | `6a2bb0f7b9bfa93efa6fd227` | `6a2bb0f7b9bfa93efa6fd227` | ✅ |

**9/9 matches apontam para o DynamicWork correto.** Nenhum match seguro apontou para obra errada. ✅

### 4.6 Algum idMal retornado pelo AniList não bate com o esperado?
**❌ Não.** Todos os 11 `idMal` retornados pelo AniList são idênticos ao `mal_id` usado na consulta. ✅

### 4.7 Alguma obra teria risco de duplicata?
**❌ Não.**
- Os 9 matches `match_mal` apontam para WorkReleases **já existentes** (não criariam novos).
- Os 2 suggestions (Death Note, One Piece) não upsertam — apenas sugerem `link_existing`.
- Nenhum WorkRelease seria criado automaticamente.
- Nenhum DynamicWork seria criado automaticamente. ✅

### 4.8 Alguma relação do AniList sugere season/release que não existe no AniZoku?
**✅ Sim — 13 de 14 relations verificadas não existem como DynamicWork separado.** Porém, 7 dessas 13 têm ExternalMapping `provider=mal` (existem como WorkRelease sob o grupo pai). 6 são **truly missing** (sem DynamicWork e sem ExternalMapping):

| Obra Pai | Relation | MAL ID | Título | Tem ExternalMapping? | Status |
|----------|----------|--------|-------|---------------------|--------|
| Re:Zero | SEQUEL | 39587 | Re:Zero 2nd Season | ✅ Sim | Existe como WorkRelease |
| Dan Da Dan | SEQUEL | 60543 | Dandadan 2nd Season | ✅ Sim | Existe como WorkRelease |
| Attack on Titan | SEQUEL | 25777 | Shingeki S2 | ✅ Sim | Existe como WorkRelease |
| Mushoku Tensei | SEQUEL | 45576 | Mushoku Part 2 | ✅ Sim | Existe como WorkRelease |
| Mashle | SEQUEL | 55813 | MASHLE S2 | ✅ Sim | Existe como WorkRelease |
| Naruto | SEQUEL | 1735 | NARUTO Shippuuden | ✅ Sim | Existe como WorkRelease |
| Tokyo Ghoul | SEQUEL | 27899 | Tokyo Ghoul √A | ✅ Sim | Existe como WorkRelease |
| Attack on Titan | PREQUEL | 25781 | Kuinaki Sentaku OVA | ❌ Não | **Existe como DynamicWork** (`attack-on-titan-no-regrets`) |
| Hunter x Hunter | SIDE_STORY | 13271 | Phantom Rouge (movie) | ❌ Não | **MISSING** |
| Hunter x Hunter | SIDE_STORY | 19951 | THE LAST MISSION (movie) | ❌ Não | **MISSING** |
| Tokyo Ghoul | PREQUEL | 31297 | PINTO OVA | ❌ Não | **MISSING** |
| Tokyo Ghoul | PREQUEL | 30458 | JACK OVA | ❌ Não | **MISSING** |
| One Piece | PREQUEL | 56055 | MONSTERS ONA | ❌ Não | **MISSING** |
| **Bleach** | **SEQUEL** | **41467** | **Sennen Kessen-hen (TYBW)** | ❌ Não | **MISSING** ⚠️ |

**⚠️ Destaque:** Bleach: Thousand Year Blood War (mal=41467) é um sequel TV major que está **ausente do catálogo**. O AniList o identifica como SEQUEL de Bleach. Na Fase 3B, este seria um candidato a `create_new_release`.

---

## 5. Confirmação de Integridade de Dados

| Entidade | Antes | Depois | Alterada? |
|----------|-------|--------|-----------|
| DynamicWork | 797 | 797 | ❌ Não |
| ExternalMapping | 212 | 212 | ❌ Não |
| WorkRelease | 212 | 212 | ❌ Não |
| SyncConflict | 0 | 0 | ❌ Não (nenhum criado) |
| AnimeEntry | 102 | 102 | ❌ Não |
| ExternalMapping anilist | 0 | 0 | ❌ Não (nenhum criado) |

### Regras da Fase 3A respeitadas
- ✅ Nenhum ExternalMapping criado (nem anilist nem mal)
- ✅ Nenhum WorkRelease criado
- ✅ Nenhum SyncConflict real criado (apenas simulado)
- ✅ Nenhum DynamicWork alterado
- ✅ Nenhum AnimeEntry alterado
- ✅ Nenhum progresso de usuário alterado
- ✅ Nenhum frontend alterado
- ✅ Nenhuma SyncQueue criada
- ✅ TheTVDB não integrado
- ✅ Nenhum fuzzy matching usado
- ✅ Nenhum LLM usado
- ✅ Nenhum raw_payload salvo
- ✅ Nenhuma escrita no banco

---

## 6. Obras Prontas para Fase 3B (provider=anilist)

As **9 obras com match_mal** estão prontas para receber `provider=anilist` na Fase 3B. O upsert criaria ExternalMapping `provider=anilist` com o AniList ID correto:

| Obra | AniList ID (a ser mapeado) | ExternalMapping mal (já existe) |
|------|---------------------------|-------------------------------|
| Re:Zero | 21355 | ✅ |
| Dan Da Dan | 171018 | ✅ |
| Hunter x Hunter | 11061 | ✅ |
| Attack on Titan | 16498 | ✅ |
| Mushoku Tensei | 108465 | ✅ |
| Mashle | 151801 | ✅ |
| Naruto | 20 | ✅ |
| Tokyo Ghoul | 20605 | ✅ |
| Bleach | 269 | ✅ |

---

## 7. Obras que Precisam de Revisão Manual

| Obra | Problema | Ação Recomendada |
|------|----------|-----------------|
| Death Note (mal=1535) | DynamicWork existe mas sem ExternalMapping mal | Criar ExternalMapping `provider=mal, provider_id=1535` manualmente → depois upsert anilist |
| One Piece (mal=21) | DynamicWork existe mas sem ExternalMapping mal | Criar ExternalMapping `provider=mal, provider_id=21` manualmente → depois upsert anilist |

Após criar os ExternalMappings mal para Death Note e One Piece, elas passariam a `match_mal` e estariam prontas para receber `provider=anilist`.

---

## 8. Riscos Antes de Usar AniList como Fonte Principal

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|--------|-----------|
| 1 | **AniList ID ≠ MAL ID** para 6/11 obras testadas | Certeza | Se a Fase 3B usar AniList ID direto sem idMal, match falha | **Sempre fazer match via `idMal` retornado pelo AniList**, nunca assumir AniList ID = MAL ID |
| 2 | **Score divergence** em todas as 9 obras (diff 0.01–0.13) | Certeza | Atualizações desnecessárias se diff < 0.1 | Adicionar threshold de mudança no upsert (ex: não atualizar score se diff < 0.15) |
| 3 | **Poster URL divergence** em todas as 9 obras | Certeza | Sobrescrever poster do MAL com poster do AniList | Decidir política: manter poster MAL ou usar AniList? (preferir MAL para consistência) |
| 4 | **Death Note e One Piece sem ExternalMapping mal** | Certeza | 2 obras não podem ser upsertadas automaticamente | Criar ExternalMapping mal manualmente antes da Fase 3B |
| 5 | **6 relations missing do catálogo** (filmes/OVAs/ONA) | Certeza | Catálogo incompleto — obras relacionadas não aparecem | Importar manualmente ou criar SyncConflict para revisão |
| 6 | **Bleach TYBW (mal=41467) ausente** | Certeza | Sequel major de Bleach não está no catálogo | Importar como WorkRelease sob grupo Bleach na Fase 3B |
| 7 | **Rate limit AniList** (~90 req/min) | Alta | Sync de catálogo grande pode ser bloqueado | Implementar batch + delay (700ms entre calls) no sync backend |
| 8 | **AniList API pode entrar em outage novamente** | Média | Bloqueia sync se depender apenas do AniList | Manter Jikan como fallback para dados de anime |
| 9 | **0 ExternalMappings anilist existem** | Certeza | Todos os matches são by_mal no primeiro sync | Esperado na Fase 3A; Fase 3B criará mappings anilist |
| 10 | **Manga não testado** | Certeza | AniList manga IDs ≠ MAL manga IDs (padrão diferente) | Testar manga separadamente na Fase 3B |
| 11 | **One Piece tem 65 relations** (muitos side stories) | Certeza | Risco de criar WorkReleases desnecessários para specials/movies | Filtrar relations por format (apenas TV/MOVIE) no sync real |

---

## 9. Critério de Aceitação

> "A Fase 3A só passa se o relatório mostrar que os matches por ID externo são confiáveis e que nenhum caso seguro apontaria para a WorkRelease ou DynamicWork errada."

### Status: ✅ APROVADO

| Critério | Status | Evidência |
|----------|--------|-----------|
| Matches por ID externo são confiáveis | ✅ | 9/11 match por idMal (MAL ID retornado pelo AniList); 0 apontaram para obra errada |
| Nenhum caso seguro aponta para WorkRelease errada | ✅ | 9/9 work_group_ids no ExternalMapping = DynamicWork.id encontrado por mal_id |
| Nenhum caso seguro aponta para DynamicWork errada | ✅ | Validação cruzada confirmada para todos os 9 matches |
| Nenhum dado foi alterado | ✅ | 797 DW, 212 EM, 212 WR, 0 SC, 102 AE — todos intactos |
| Nenhum SyncConflict real foi criado | ✅ | 0 SyncConflicts no banco (2 apenas simulados) |
| Nenhum ExternalMapping real foi criado | ✅ | 212 EM antes e depois (0 anilist) |
| idMal retornado pelo AniList bate com o esperado | ✅ | 11/11 idMal = mal_id consultado |

---

## 10. Conclusão

**Fase 3A executada e validada com sucesso usando a API real do AniList.**

- ✅ 9/11 obras têm match seguro por MAL ID (idMal) — nenhuma apontou para obra errada
- ✅ 2/11 obras viraram suggestion (Death Note, One Piece) — precisam de ExternalMapping mal manual
- ✅ 0/11 deram no_match — todas foram encontradas no AniList
- ✅ Nenhum dado foi alterado no banco
- ✅ Nenhum SyncConflict real foi criado (apenas 2 simulados)
- ✅ Nenhum ExternalMapping real foi criado
- ✅ Descoberta crítica: AniList ID ≠ MAL ID para 6/11 obras — matching deve ser via idMal

**Descoberta importante:** A assunção do dry-run anterior (AniList ID = MAL ID) estava incorreta. A API real confirma que 6/11 obras têm IDs diferentes. O matching por `idMal` é confiável e deve ser a estratégia primária na Fase 3B.

**Pronto para avançar à Fase 3B (upsert real, backend-side).**