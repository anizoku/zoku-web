# Fase 3C-4 — Revisão de Reviews e Plano de Write Controlado

**Data:** 2026-09-05
**Tipo:** Análise + documentação (read-only, ZERO writes)
**Escopo:** Revisar os 8 REVIEW_REQUIRED, investigar padrão season_year, preparar write controlado
**Writes no banco:** 0 ✅

---

## 0. Confirmação de Integridade

| Entidade | Antes | Depois | Alterada? |
|----------|-------|--------|-----------|
| DynamicWork | 797 | 797 | ❌ Não |
| WorkRelease | 214 | 214 | ❌ Não |
| ExternalMapping | 225 | 225 | ❌ Não |
| AnimeEntry | 102 | 102 | ❌ Não |
| Frontend | — | — | ❌ Não |

---

## PARTE A — Revisão dos 8 REVIEW_REQUIRED

### 1. my-hero-academia-more (MAL 63130)

| Campo | Valor |
|-------|-------|
| WorkRelease.id | 6a8b7281c22ab4a66c93959b |
| group_id | 6a2bb0e5daf741c371b72aa3 |
| DW title | My Hero Academia |
| DW year | 2016 |
| DW mal_id | 31964 |
| MAL ID | 63130 |
| AniList ID | 204356 |
| AniList title | Boku no Hero Academia No. 170+1: More |
| AniList format | SPECIAL |
| AniList status | FINISHED |
| AniList seasonYear | 2026 |
| AniList episodes | 1 |
| Current season_year | 2016 (herdado do DW) |
| Current episode_count | 1 |
| release_order | 7 |
| is_main_entry | false |
| Relations | PREQUEL: 60098 (Final Season), SEQUEL: 64107 |

**Classificação: ANIZOKU_WRONG**
- season_year=2016 foi herdado do DynamicWork pai (My Hero Academia, 2016).
- AniList corretamente indica 2026 (special que aired em 2026).
- O release é um SPECIAL não-main, não deveria herdar o ano do franchise.

### 2. attack-on-titan-final-season-the-final-chapters (MAL 51535)

| Campo | Valor |
|-------|-------|
| WorkRelease.id | 6a8b7281c22ab4a66c9395a9 |
| group_id | 6a2bb0e21a8790e0af8fd87f |
| DW title | Attack on Titan |
| DW year | 2013 |
| MAL ID | 51535 |
| AniList ID | 146984 |
| AniList title | Shingeki no Kyojin: The Final Season - Kanketsu-hen Zenpen |
| AniList format | SPECIAL |
| AniList seasonYear | 2023 |
| AniList episodes | 1 |
| Current season_year | 2013 (herdado) |
| Current episode_count | 2 |
| release_order | 7 |
| is_main_entry | false |
| Relations | PREQUEL: 48583 (Final Season Part 2) |

**Classificação: ANIZOKU_WRONG**
- season_year=2013 herdado do DW pai (Attack on Titan S1, 2013).
- AniList corretamente indica 2023 (Final Chapters special aired em 2023).

### 3. jojos-bizarre-adventure-2012-jojo-s-bizarre-adventure-stone-ocean (MAL 48661)

| Campo | Valor |
|-------|-------|
| WorkRelease.id | 6a8b7281c22ab4a66c939567 |
| group_id | 6a2bb107f55d9a431728a780 |
| DW title | JoJo's Bizarre Adventure (2012) |
| DW year | 2012 |
| MAL ID | 48661 |
| AniList ID | 131942 |
| AniList title | JoJo no Kimyou na Bouken: Stone Ocean |
| AniList format | ONA |
| AniList seasonYear | 2021 |
| AniList episodes | 12 |
| Current season_year | 2012 (herdado) |
| Current episode_count | 12 |
| release_order | 6 |
| is_main_entry | false |
| Relations | PREQUEL: 37991 (Ougon no Kaze), SEQUEL: 51367 (Stone Ocean Part 2) |

**Classificação: ANIZOKU_WRONG**
- season_year=2012 herdado do DW pai (JoJo 2012).
- AniList corretamente indica 2021 (Stone Ocean aired em 2021).

### 4. black-clover-season-2 (MAL 61967)

| Campo | Valor |
|-------|-------|
| WorkRelease.id | 6a8b7281c22ab4a66c93956b |
| group_id | 6a2bb105fdca46c6a310da28 |
| DW title | Black Clover |
| DW year | 2017 |
| MAL ID | 61967 |
| AniList ID | 195604 |
| AniList title | Black Clover 2nd Season |
| AniList format | TV |
| AniList status | NOT_YET_RELEASED |
| AniList seasonYear | 2026 |
| AniList episodes | null |
| Current season_year | 2017 (herdado) |
| Current episode_count | null |
| release_order | 2 |
| is_main_entry | false |
| Relations | PREQUEL: 34572 (Black Clover S1) |

**Classificação: AMBIGUOUS**
- AniList indica NOT_YET_RELEASED com seasonYear=2026.
- Black Clover S1 (mal=34572) aired 2017-2021 com 170 episódios.
- MAL ID 61967 pode corresponder a uma nova temporada não anunciada, ou pode ser um entry incorreto.
- **Requer verificação manual** antes de qualquer update.

### 5. the-melancholy-of-haruhi-suzumiya-2009 (MAL 4382)

| Campo | Valor |
|-------|-------|
| WorkRelease.id | 6a8b7281c22ab4a66c93951f |
| group_id | 6a2bb159a6a5c966ae64e480 |
| DW title | The Melancholy of Haruhi Suzumiya |
| DW year | 2006 |
| DW mal_id | 849 |
| MAL ID | 4382 |
| AniList ID | 4382 |
| AniList title | Suzumiya Haruhi no Yuuutsu (2009) |
| AniList format | TV |
| AniList seasonYear | 2009 |
| AniList episodes | 28 |
| Current season_year | 2009 (correto) |
| Current episode_count | 14 (errado) |
| release_order | 2 |
| is_main_entry | false |
| Relations | ALTERNATIVE: 849 (Haruhi 2006), SEQUEL: 7311 (movie) |

**Classificação: ANIZOKU_WRONG**
- episode_count=14 está errado. A retransmissão de 2009 teve 28 episódios (14 originais + 14 novos "Endless Eight" e "Sigh").
- O valor 14 corresponde apenas aos episódios originais de 2006, não à retransmissão completa de 2009.
- AniList corretamente indica 28.
- season_year=2009 está correto (não foi herdado do DW pai que é 2006).

### 6. the-worlds-finest-assassin-...-season-2 (MAL 56732)

| Campo | Valor |
|-------|-------|
| WorkRelease.id | 6a8b7281c22ab4a66c939502 |
| group_id | 6a2bb1ce1b1b02084288877b |
| DW title | The World's Finest Assassin... |
| DW year | 2021 |
| MAL ID | 56732 |
| AniList seasonYear | 2027 |
| Current season_year | 2021 (herdado) |
| is_main_entry | false |

**Classificação: ANIZOKU_WRONG**
- season_year=2021 herdado do DW pai.
- AniList indica 2027 (future, not yet released).
- O release representa uma temporada que ainda não aired.

### 7. dorohedoro-season-2

| Campo | Valor |
|-------|-------|
| DW year | 2020 |
| AniList seasonYear | 2026 |
| Current season_year | 2020 (herdado) |
| is_main_entry | false |

**Classificação: ANIZOKU_WRONG**
- season_year=2020 herdado do DW pai.
- AniList indica 2026 (future/current).

### 8. mashle-magic-and-muscles-season-3

| Campo | Valor |
|-------|-------|
| DW year | 2023 |
| AniList seasonYear | 2027 |
| Current season_year | 2023 (herdado) |
| is_main_entry | false |

**Classificação: ANIZOKU_WRONG**
- season_year=2023 herdado do DW pai.
- AniList indica 2027 (future).

### Resumo da Classificação

| # | Release | Classificação | Problema |
|---|---------|--------------|----------|
| 1 | my-hero-academia-more | **ANIZOKU_WRONG** | season_year herdado (2016→2026) |
| 2 | attack-on-titan-final-season-the-final-chapters | **ANIZOKU_WRONG** | season_year herdado (2013→2023) |
| 3 | jojo-stone-ocean | **ANIZOKU_WRONG** | season_year herdado (2012→2021) |
| 4 | black-clover-season-2 | **AMBIGUOUS** | NOT_YET_RELEASED, possível mapping issue |
| 5 | haruhi-2009 | **ANIZOKU_WRONG** | episode_count errado (14→28) |
| 6 | worlds-finest-assassin-s2 | **ANIZOKU_WRONG** | season_year herdado (2021→2027) |
| 7 | dorohedoro-s2 | **ANIZOKU_WRONG** | season_year herdado (2020→2026) |
| 8 | mashle-s3 | **ANIZOKU_WRONG** | season_year herdado (2023→2027) |

| Classificação | Quantidade |
|---------------|-----------|
| ANIZOKU_WRONG | 7 |
| AMBIGUOUS | 1 |
| ANILIST_WRONG | 0 |
| MAPPING_WRONG | 0 |

---

## PARTE B — Padrão Sistêmico de season_year

### Análise dos 214 WorkReleases

| Categoria | Quantidade |
|-----------|-----------|
| **Total** | **214** |
| Main entry (is_main_entry=true) | 83 |
| Non-main entry (is_main_entry≠true) | 131 |

### Main entry — season_year vs DW year

| Métrica | Quantidade |
|---------|-----------|
| season_year == DW year (esperado) | 79 |
| season_year != DW year | 1 |
| season_year == null | 3 |

**Main entries:** 79/83 (95.2%) têm season_year == DW year. Isso é **esperado** — o release principal herda o ano do franchise.

### Non-main entry — season_year vs DW year

| Métrica | Quantidade |
|---------|-----------|
| season_year == DW year (herdado incorretamente) | **15** |
| season_year != DW year (correto) | 113 |
| season_year == null | 3 |

**Non-main entries:** 15/131 (11.5%) têm season_year == DW year. Isso é um **migration artifact** — releases secundários que herdaram o ano do franchise pai durante a migração para WorkRelease.

### Amostra dos 15 non-main com season_year herdado

| # | Release | WR year | DW year |
|---|---------|---------|---------|
| 1 | my-hero-academia-more | 2016 | 2016 |
| 2 | attack-on-titan-final-season-the-final-chapters | 2013 | 2013 |
| 3 | jojo-stone-ocean | 2012 | 2012 |
| 4 | black-clover-season-2 | 2017 | 2017 |
| 5 | konosuba-gods-blessing-on-this-wonderful-world-4 | 2016 | 2016 |
| 6 | black-lagoon-the-second-barrage | 2006 | 2006 |
| 7 | seraph-of-the-end-vampire-reign-battle-in-nagoya | 2015 | 2015 |
| 8 | bungo-stray-dogs-2 | 2016 | 2016 |
| 9 | 86-eighty-six-part-2 | 2021 | 2021 |
| 10 | mushoku-tensei-jobless-reincarnation-part-2 | 2021 | 2021 |

### Conclusão do Padrão

**Padrão confirmado: Migration Artifact**

- 15 non-main releases herdaram o season_year do DynamicWork pai durante a migração.
- 7 destes 15 foram detectados pelo sync AniList (REVIEW_REQUIRED).
- Os outros 8 não foram detectados porque AniList seasonYear é null ou coincide com o ano herdado.
- **Não é erro do AniList** — é um artifact de migração no AniZoku.
- **Correção proposta:** Usar ExternalMapping exato + AniList seasonYear para corrigir os 15 non-main releases com season_year herdado. **Não executar ainda.**

### Política recomendada para season_year

A política atual `reviewOnDiff: true` está **correta** — ela detecta o diff e separa para REVIEW. Não deve ser alterada. O diff é real (migration artifact), e a correção deve ser manual ou via um script de correção dedicado (não via sync AniList automático).

---

## PARTE C — Haruhi 2009 (episode_count)

### Investigação

| Aspecto | Valor |
|---------|-------|
| MAL ID | 4382 |
| AniList ID | 4382 |
| AniList title | Suzumiya Haruhi no Yuuutsu (2009) |
| AniList format | TV |
| AniList episodes | 28 |
| AniList seasonYear | 2009 |
| Current episode_count | 14 |
| Relations | ALTERNATIVE: 849 (Haruhi 2006, 14 eps) |

### Conclusão

- A retransmissão de 2009 teve **28 episódios** (14 originais de 2006 + 14 novos: "Endless Eight" e "Sigh" arc).
- O AniList corretamente indica 28.
- O valor atual 14 corresponde apenas aos episódios originais de 2006, não à retransmissão completa de 2009.
- O WorkRelease `the-melancholy-of-haruhi-suzumiya-2009` representa a **retransmissão de 2009 completa**, então episode_count deveria ser 28.
- A relação ALTERNATIVE com mal=849 (Haruhi 2006) confirma que são entries distintos.
- **Não alterar episode_count até confirmação manual.** O REVIEW_REQUIRED está correto e protege contra auto-update.

---

## PARTE D — Plano de Write Controlado (11 Test Suite Releases)

### Resumo

| Métrica | Valor |
|---------|-------|
| Releases | 11 |
| Total WR updates | 80 |
| Total DW updates | 5 |
| Match valid | 11/11 ✅ |
| Prohibited fields incluídos | 0 ✅ |

### Validação de Campos Proibidos

| Campo | AniList tem valor diferente? | Incluído no write? |
|-------|------------------------------|-------------------|
| score | 11/11 sim | ❌ Não (0) |
| cover_url | 11/11 sim | ❌ Não (0) |
| title | 0 | ❌ Não (0) |
| synopsis | 0 | ❌ Não (0) |
| category | 0 | ❌ Não (0) |
| slug | 0 | ❌ Não (0) |
| release_order | 0 | ❌ Não (0) |
| display_order | 0 | ❌ Não (0) |
| is_main_entry | 0 | ❌ Não (0) |
| is_live_action | 0 | ❌ Não (0) |

**Nenhum campo proibido está incluído no write plan.** ✅

### Write Plan Detalhado

#### 1. Re:Zero (MAL 31240)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | Re:Zero kara Hajimeru Isekai Seikatsu |
| title_english | Re:ZERO -Starting Life in Another World- |
| title_native | Re:ゼロから始める異世界生活 |
| season | spring |
| banner_url | https://s4.anilist.co/.../banner/21355-f9SjOfEJMk5P.jpg |
| popularity | 619417 |
| duration_minutes | 25 |
| trending_score | 25 |
| **WR updates: 8** | **DW updates: 0** |

#### 2. Dan Da Dan (MAL 57334)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | Dandadan |
| title_english | DAN DA DAN |
| title_native | ダンダダン |
| banner_url | https://s4.anilist.co/.../banner/171018-SpwPNAduszXl.jpg |
| popularity | 382875 |
| trending_score | 8 |
| **WR updates: 6** | **DW updates: 0** |

#### 3. Hunter x Hunter (MAL 11061)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | HUNTER×HUNTER (2011) |
| title_english | Hunter x Hunter (2011) |
| title_native | HUNTER×HUNTER (2011) |
| banner_url | https://s4.anilist.co/.../banner/11061-8WkkTZ6duKpq.jpg |
| trending_score | 26 |
| **WR updates: 5** | **DW updates: 0** |

#### 4. Attack on Titan (MAL 16498)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | Shingeki no Kyojin |
| title_english | Attack on Titan |
| title_native | 進撃の巨人 |
| season | spring |
| banner_url | https://s4.anilist.co/.../banner/16498-8jpFCOcDmneX.jpg |
| popularity | 1050648 |
| duration_minutes | 24 |
| trending_score | 19 |
| **WR updates: 8** | **DW updates: 0** |

#### 5. Mushoku Tensei (MAL 39535)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | Mushoku Tensei: Isekai Ittara Honki Dasu |
| title_english | Mushoku Tensei: Jobless Reincarnation |
| title_native | 無職転生 ～異世界行ったら本気だす～ |
| season | winter |
| banner_url | https://s4.anilist.co/.../banner/108465-RgsRpTMhP9Sv.jpg |
| popularity | 455257 |
| duration_minutes | 24 |
| trending_score | 9 |
| **WR updates: 8** | **DW updates: 0** |

#### 6. Mashle (MAL 52211)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | MASHLE |
| title_english | MASHLE: MAGIC AND MUSCLES |
| title_native | マッシュル-MASHLE- |
| season | spring |
| banner_url | https://s4.anilist.co/.../banner/151801-zBFaJMIJFWfS.jpg |
| popularity | 287455 |
| duration_minutes | 24 |
| **WR updates: 7** | **DW updates: 0** |

#### 7. Naruto (MAL 20)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | NARUTO |
| title_english | Naruto |
| title_native | NARUTO -ナルト- |
| season | fall |
| banner_url | https://s4.anilist.co/.../banner/20-HHxhPj5JD13a.jpg |
| popularity | 723094 |
| duration_minutes | 23 |
| trending_score | 28 |
| **WR updates: 8** | **DW updates: 1** (romaji_title: "NARUTO") |

#### 8. Death Note (MAL 1535)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | DEATH NOTE |
| title_english | Death Note |
| title_native | DEATH NOTE |
| season | fall |
| banner_url | https://s4.anilist.co/.../banner/1535.jpg |
| popularity | 958162 |
| trending_score | 18 |
| **WR updates: 7** | **DW updates: 1** (romaji_title: "DEATH NOTE") |

#### 9. Tokyo Ghoul (MAL 22319)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | Tokyo Ghoul |
| title_english | Tokyo Ghoul |
| title_native | 東京喰種 トーキョーグール |
| season | summer |
| banner_url | https://s4.anilist.co/.../banner/20605-RCJ7M71zLmrh.jpg |
| popularity | 737779 |
| duration_minutes | 24 |
| trending_score | 16 |
| **WR updates: 8** | **DW updates: 1** (romaji_title: "Tokyo Ghoul") |

#### 10. One Piece (MAL 21)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | ONE PIECE |
| title_english | ONE PIECE |
| title_native | ONE PIECE |
| season | fall |
| banner_url | https://s4.anilist.co/.../banner/21-wf37VakJmZqs.jpg |
| popularity | 747774 |
| trending_score | 179 |
| **WR updates: 7** | **DW updates: 1** (romaji_title: "ONE PIECE") |

#### 11. Bleach (MAL 269)
| Campo | Valor a escrever |
|-------|-----------------|
| title_romaji | BLEACH |
| title_english | Bleach |
| title_native | BLEACH |
| season | fall |
| banner_url | https://s4.anilist.co/.../banner/269-08ar2HJOUAuL.jpg |
| popularity | 518381 |
| duration_minutes | 24 |
| trending_score | 93 |
| **WR updates: 8** | **DW updates: 1** (romaji_title: "BLEACH") |

### Resumo dos Updates por Campo

| Campo | Updates | Releases afetados |
|-------|---------|-------------------|
| title_romaji | 11 | todos |
| title_english | 10 | todos exceto Hunter x Hunter |
| title_native | 11 | todos |
| season | 9 | exceto Dan Da Dan, Hunter x Hunter |
| banner_url | 11 | todos |
| popularity | 11 | todos |
| duration_minutes | 8 | exceto Dan Da Dan, Hunter x Hunter, One Piece |
| trending_score | 9 | exceto Mashle, One Piece |
| romaji_title (DW) | 5 | Naruto, Death Note, Tokyo Ghoul, One Piece, Bleach |
| **Total WR** | **80** | |
| **Total DW** | **5** | |

---

## PARTE E — Status do Backend Base44

### Tentativa de Criação

A tentativa de criar os arquivos:
- `base44/functions/anilistCatalogSync/entry.ts`
- `base44/shared/syncFieldPolicy.ts`

Retornou o erro:
> **"Backend functions require a Builder plan or higher."**

### Status Real

| Aspecto | Status |
|---------|--------|
| Plano atual permite criar backend functions | ❌ **NÃO** |
| `base44/functions/anilistCatalogSync` | ❌ Não criado |
| `base44/shared/syncFieldPolicy.ts` | ❌ Não criado |
| Sync executável via sandbox (exec_tool) | ✅ Sim |
| Sync executável via backend deployable | ❌ Não (requer Builder+) |

### O que isto significa

1. **NÃO fingir que a função backend existe.** Ela não foi criada.
2. O código/plano está preparado (documentado nos relatórios), mas **não pode ser deployado** sem Builder+.
3. A limitação que impede execução de produção é: **plano atual não inclui Builder+**.
4. Para executar `dry_run=false` em produção, é necessário:
   - Fazer upgrade para Builder+, **OU**
   - Executar o write controlado via sandbox (exec_tool) como solução intermediária

---

## PARTE F — Recomendação GO / NO-GO

### Critérios de Aceitação

| Critério | Status | Evidência |
|----------|--------|-----------|
| 8 reviews entendidos | ✅ | 7 ANIZOKU_WRONG + 1 AMBIGUOUS classificados |
| Nenhum caso de identidade em dúvida | ✅ | 0 ID_MISMATCH, 0 MAPPING_WRONG, 11/11 match_valid |
| Backend real disponível | ❌ | Requer Builder+ |
| Lista de writes das 11 releases explícita | ✅ | 80 WR updates + 5 DW updates documentados |
| Nenhum campo proibido incluído | ✅ | 0 score, 0 cover_url, 0 title, 0 synopsis, etc. |

### Recomendação: **NO-GO para dry_run=false via backend**

**GO para write controlado via sandbox (exec_tool)** — se aprovado pelo usuário.

### Justificativa

1. **Os 8 reviews estão entendidos:** 7 são migration artifacts (season_year herdado), 1 é episode_count errado (Haruhi), 1 é AMBIGUOUS (Black Clover S2). Nenhum é erro do AniList ou mapping errado.

2. **Identidade 100% validada:** 0 ID_MISMATCH, 11/11 match_valid na test suite.

3. **Backend NÃO disponível:** O plano atual não permite criar `base44/functions/anilistCatalogSync`. A função não existe. Não fingir que existe.

4. **Write plan explícito:** 80 WR updates + 5 DW updates documentados campo-a-campo para as 11 releases.

5. **Nenhum campo proibido:** score (11 diferenças ignoradas), cover_url (11 diferenças ignoradas), e todos os outros campos proibidos têm 0 inclusões.

### Riscos Restantes

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Backend não deployable | Alto | Fazer upgrade para Builder+ ou usar sandbox |
| 15 non-main com season_year herdado | Médio | Correção dedicada (não via sync Tier 1) |
| Haruhi episode_count=14 | Baixo | REVIEW_REQUIRED protege contra auto-update |
| Black Clover S2 AMBIGUOUS | Baixo | REVIEW_REQUIRED protege contra auto-update |
| 8 REVIEW_REQUIRED não incluídos no write | ✅ | Por design — apenas SYNC_SAFE na test suite |

### Próximos Passos

1. **Decidir abordagem de execução:**
   - Opção A: Fazer upgrade para Builder+ e criar backend function
   - Opção B: Executar write controlado via sandbox (exec_tool) nas 11 releases

2. **Após aprovação do usuário:**
   - Executar write de 80 WR updates + 5 DW updates nas 11 releases
   - Validar que os writes foram persistidos corretamente
   - Verificar que nenhum campo proibido foi alterado

3. **Fase futura (não nesta fase):**
   - Corrigir os 15 non-main com season_year herdado (script dedicado)
   - Corrigir Haruhi episode_count (14→28) após confirmação manual
   - Investigar Black Clover S2 (AMBIGUOUS)
   - Estender sync para os 203 releases restantes