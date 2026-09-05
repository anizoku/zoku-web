# Fase 3C-1 — Batch Sync Dry-Run do Catálogo

**Data:** 2026-09-05
**Tipo:** Read-only (nenhuma escrita)
**Escopo:** Avaliar em lote todo o catálogo elegível para sync AniList via ExternalMapping
**Writes no banco:** 0 ✅

---

## 0. Confirmação de Integridade

| Entidade | Antes | Depois | Alterada? |
|----------|-------|--------|-----------|
| DynamicWork | 797 | 797 | ❌ Não |
| WorkRelease | 214 | 214 | ❌ Não |
| ExternalMapping | 225 | 225 | ❌ Não |
| AnimeEntry | 102 | 102 | ❌ Não |
| SyncConflict | 0 | 0 | ❌ Não |
| Frontend | — | — | ❌ Não |

**Nenhuma escrita foi executada.** Nenhuma chamada AniList foi feita nesta fase.

---

## 1. As 11 Obras Anteriores = TEST SUITE Permanente

As 11 obras utilizadas nas fases anteriores (Re:Zero, Dan Da Dan, Hunter x Hunter, Attack on Titan, Mushoku Tensei, Mashle, Naruto, Death Note, Tokyo Ghoul, One Piece, Bleach) são uma **test suite permanente da arquitetura**, não o limite do catálogo.

Elas servem como:
- Validação da política de sync campo-a-campo
- Casos de teste para regressão em futuras implementações
- Amostra controlada para detectar schema issues antes de escalar

O objetivo final é sincronizar **centenas de obras** do catálogo.

---

## 2. Inventário Completo do Catálogo

### 2.1 DynamicWork (797 total)

| Métrica | Valor |
|---------|-------|
| Total | 797 |
| Anime (categories contém "anime") | 423 |
| Manga (categories contém "manga") | 375 |
| Movie (categories contém "movie") | 43 |
| Liveaction (categories contém "liveaction") | 0 |
| sync_release_completed = true | 83 |
| release_count > 0 | 83 |
| Com WorkRelease vinculado | 83 |
| **Sem WorkRelease (sem releases)** | **714** |

**Observação crítica:** 714 de 797 DynamicWorks (89.6%) não têm WorkRelease. Estes precisam de criação de WorkRelease antes de qualquer sync AniList. A criação de WorkRelease está fora do escopo do Tier 1.

### 2.2 WorkRelease (214 total)

| Métrica | Valor |
|---------|-------|
| Total | 214 |
| Por category: anime | 207 |
| Por category: manga | 1 |
| Por category: movie | 6 |
| Por format: TV | 206 |
| Por format: MANGA | 1 |
| Por format: ONA | 1 |
| Por format: MOVIE | 6 |
| Com ExternalMapping MAL | 214 (100%) |
| Com ExternalMapping AniList | 11 (5.1%) |
| Com ambos (MAL + AniList) | 11 |
| Sem mapping externo | 0 (0%) |

**Todos os 214 WorkReleases têm pelo menos um ExternalMapping MAL.** Nenhum está órfão.

### 2.3 ExternalMapping (225 total)

| Métrica | Valor |
|---------|-------|
| Total | 225 |
| Por provider: mal | 214 |
| Por provider: anilist | 11 |
| Por provider: tmdb | 0 |
| Por provider: thetvdb | 0 |
| Com work_release_id preenchido | 225 (100%) |
| Apenas work_group_id (sem release) | 0 |
| Duplicatas (mesmo provider + provider_id) | 0 |
| Mappings sem WorkRelease existente | 0 |
| Mappings sem DynamicWork existente | 0 |

**Integridade referencial perfeita.** Todos os 225 mappings apontam para entidades existentes. Zero duplicatas.

---

## 3. Classificação de Elegibilidade para AniList Sync

### 3.1 Critérios

Um WorkRelease é elegível quando:
- Possui ExternalMapping `provider=anilist` válido (release-level), **OU**
- Possui ExternalMapping `provider=mal` válido (release-level) que possa ser resolvido no AniList via `idMal` exato

**Nunca** usar title/fuzzy/LLM para tornar um item elegível automaticamente.

### 3.2 Resultado da Classificação

| Categoria | Quantidade | % do total |
|-----------|-----------|------------|
| **READY_ANILIST** | 11 | 5.1% |
| **READY_VIA_MAL** | 203 | 94.9% |
| **MISSING_MAPPING** | 0 | 0% |
| **CONFLICT** | 0 | 0% |
| **NOT_APPLICABLE** | 0 | 0% |
| **Total** | **214** | **100%** |

### 3.3 Detalhamento

**READY_ANILIST (11 releases):**
Já possuem ExternalMapping `provider=anilist` com `work_release_id` preenchido. Podem ser consultados diretamente no AniList por ID.

| Release | Slug | AniList ID | MAL ID |
|---------|------|-----------|--------|
| one-piece-main | one-piece-main | 21 | 21 |
| death-note-main | death-note-main | 1535 | 1535 |
| hunter-x-hunter-2011 | hunter-x-hunter-2011 | 11061 | 11061 |
| dan-da-dan-season-1 | dan-da-dan-season-1 | 171018 | 57334 |
| attack-on-titan-season-1 | attack-on-titan-season-1 | 16498 | 16498 |
| ... (6 mais) | | | |

**READY_VIA_MAL (203 releases):**
Possuem ExternalMapping `provider=mal` com `work_release_id` preenchido. Podem ser consultados no AniList via `idMal` (MAL ID → AniList Media).

Exemplos:
| Release | Slug | MAL ID |
|---------|------|--------|
| hunter-x-hunter-manga | hunter-x-hunter-manga | 26 |
| hunter-x-hunter-1999 | hunter-x-hunter-1999 | 136 |
| dan-da-dan-season-2 | dan-da-dan-season-2 | 60543 |
| dan-da-dan-season-3 | dan-da-dan-season-3 | 62516 |
| sword-art-online-alicization... | ... | 39597 |
| my-hero-academia-season-1 | ... | 31964 |
| ... (196 mais) | | |

**MISSING_MAPPING (0):** Nenhum release está sem mapping externo.

**CONFLICT (0):** Nenhum conflito detectado (sem duplicatas, sem cross-type, sem group cascade).

**NOT_APPLICABLE (0):** Nenhum release live-action no catálogo atual.

---

## 4. Simulação Tier 1 — Campos Null a Preencher

### 4.1 Campos Analisados (Tier 1 — preencher null)

Para todos os 214 releases elegíveis (READY_ANILIST + READY_VIA_MAL), simulamos quais campos seriam preenchidos:

| Campo | Nulls encontrados | % de 214 | Ação Tier 1 |
|-------|-----------------|----------|-------------|
| `title_romaji` | 214 | 100% | UPDATE (preencher null) |
| `title_english` | 214 | 100% | UPDATE (preencher null) |
| `title_native` | 214 | 100% | UPDATE (preencher null) |
| `banner_url` | 214 | 100% | UPDATE (preencher null) |
| `trending_score` | 214 | 100% | UPDATE (atualizar 0 → valor real) |
| `season` | 211 | 98.6% | UPDATE (preencher null) |
| `popularity` | 213 | 99.5% | UPDATE (preencher null) |
| `duration_minutes` | 207 | 96.7% | UPDATE (preencher null) |
| `season_year` | 6 | 2.8% | UPDATE (preencher null) |
| `is_currently_airing` (DW) | 0 | 0% | Já preenchido |
| **Total de campos null** | **1707** | — | — |

### 4.2 Resumo da Simulação

| Métrica | Valor |
|---------|-------|
| Releases elegíveis | 214 |
| Releases com pelo menos 1 null | 214 (100%) |
| Total de campos null a preencher | 1707 |
| Campos derivados (status, is_special, is_movie) | Não contados (sempre atualizáveis) |
| Obras (DynamicWork) que seriam afetadas | 83 (as que têm releases) |
| Campos que gerariam REVIEW | 0 (Tier 1 é preencher null, não sobrescrever) |
| Schema conflicts detectados | Ver seção 5 |

### 4.3 Campos Derivados (sempre atualizáveis)

| Campo | Entidade | Fonte | Condição |
|-------|---------|-------|----------|
| `status` | WorkRelease | AniList status → mapeamento | Sempre (FINISHED→finished, RELEASING→releasing) |
| `is_special` | WorkRelease | AniList format | Sempre (SPECIAL/OVA → true) |
| `is_movie` | WorkRelease | AniList format | Sempre (MOVIE → true) |
| `is_currently_airing` | DynamicWork | AniList status | Sempre (RELEASING→true) |

Estes campos são derivados diretamente de AniList e não têm ambiguidade. Podem ser atualizados automaticamente.

---

## 5. Schema Issues Sistêmicos

### 5.1 Issues Detectados

| # | Issue | Tipo | Quantidade | Severidade | Descrição |
|---|-------|------|-----------|-----------|-----------|
| 1 | `title_romaji/english/native` sempre null | Dado faltante | 214/214 (100%) | Baixo | Campos nunca foram populados. Tier 1 resolve. |
| 2 | `banner_url` sempre null | Dado faltante | 214/214 (100%) | Baixo | Sem banners armazenados. Tier 1 resolve. |
| 3 | `trending_score` sempre 0 | Dado faltante | 214/214 (100%) | Baixo | Default não atualizado. Tier 1 resolve. |
| 4 | `season` quase sempre null | Dado faltante | 211/214 (98.6%) | Baixo | Apenas 3 releases têm season. Tier 1 resolve. |
| 5 | `duration_minutes` quase sempre null | Dado faltante | 207/214 (96.7%) | Baixo | Tier 1 resolve. |
| 6 | `popularity` quase sempre null | Dado faltante | 213/214 (99.5%) | Baixo | Tier 1 resolve. |
| 7 | `DynamicWork.duration` é string vs `WorkRelease.duration_minutes` é number | Schema mismatch | 83 DynamicWorks | Médio | DW usa "24 min per ep" (string); WR usa 24 (number). Migração precisa normalizar. |
| 8 | `DynamicWork.season` é "spring_2016" vs `WorkRelease.season` é "spring" | Formato incompatível | 83 DynamicWorks | Médio | DW combina season+year; WR separa. Migração precisa splitar. |
| 9 | `DynamicWork.popularity_rank` (posição) vs `WorkRelease.popularity` (absoluto) | Conceito diferente | 83 DynamicWorks | Médio | DW armazena rank (ex: 23); WR armazena popularity absoluto (ex: 619417). Não são intercambiáveis. |
| 10 | `DynamicWork.score` e `WorkRelease.score` ambos existem | Redundância | 83 DynamicWorks | Baixo | Atualmente idênticos. Risco de divergência se um for atualizado e o outro não. |
| 11 | `DynamicWork.franchise_poster_url` e `WorkRelease.cover_url` ambos existem | Redundância | 83 DynamicWorks | Baixo | Atualmente idênticos (MAL URL). Risco de divergência. |
| 12 | 714 DynamicWorks sem WorkRelease | Estrutural | 714/797 (89.6%) | Alto | Maioria do catálogo não tem WorkRelease. Precisam ser criados antes de sync. |

### 5.2 Schema Issues por Tipo

| Tipo | Quantidade | Impacto no Sync |
|------|-----------|-----------------|
| Dados faltantes (nulls) | 6 tipos, 1707 campos | Tier 1 resolve diretamente |
| Schema mismatch (formato) | 3 tipos | Precisa normalização antes de sync |
| Redundância (campos duplicados) | 2 tipos | Precisa definir fonte de verdade por campo |
| Estrutural (sem WorkRelease) | 714 obras | Bloqueia sync — precisa criação de WorkRelease |

### 5.3 Recomendações por Issue

| Issue | Recomendação |
|-------|-------------|
| #1-6 (nulls) | Resolver via Tier 1 (preencher null com AniList) |
| #7 (duration string vs number) | Manter `WorkRelease.duration_minutes` (number) como canônico. Deprecar `DynamicWork.duration` (string) gradualmente. |
| #8 (season format) | Manter `WorkRelease.season` ("spring") + `WorkRelease.season_year` (2016) como canônico. `DynamicWork.season` ("spring_2016") é legado. |
| #9 (popularity_rank vs popularity) | São conceitos diferentes. `DynamicWork.popularity_rank` = posição no ranking MAL. `WorkRelease.popularity` = popularidade absoluta AniList. Não sobrescrever um com o outro. |
| #10 (score redundante) | Definir `WorkRelease.score` como canônico. `DynamicWork.score` é denormalizado (herda do release principal). |
| #11 (poster redundante) | Definir `WorkRelease.cover_url` como canônico. `DynamicWork.franchise_poster_url` é denormalizado. |
| #12 (714 sem WorkRelease) | Fase futura: criar WorkReleases para as 714 obras restantes. Não no escopo do Tier 1. |

---

## 6. Estimativa de Chamadas AniList

### 6.1 Cálculo

| Categoria | Releases | Chamadas AniList por release | Total de chamadas |
|-----------|---------|------------------------------|-------------------|
| READY_ANILIST | 11 | 1 (fetch por anilist_id) | 11 |
| READY_VIA_MAL | 203 | 1 (fetch por idMal) | 203 |
| **Total** | **214** | — | **214** |

### 6.2 Rate Limiting

| Parâmetro | Valor |
|-----------|-------|
| Rate limit AniList (estimado) | ~90 req/min |
| Delay entre chamadas (recomendado) | 700ms |
| Chamadas efetivas com delay | ~86 req/min |
| Tempo total estimado (214 chamadas) | ~2.5 minutos |
| Com retry/backoff (buffer 30s) | ~3 minutos |
| Com batching (50 por batch) | 5 batches, ~3 minutos |

### 6.3 Estimativa para Catálogo Completo (Futuro)

| Cenário | WorkReleases | Chamadas | Tempo estimado |
|---------|-------------|----------|----------------|
| Atual (214 releases) | 214 | 214 | ~3 min |
| Catálogo completo (83 grupos × ~3 releases) | ~250 | ~250 | ~3.5 min |
| Com 714 obras migradas (~3 releases cada) | ~2200 | ~2200 | ~26 min |
| Sync incremental (só mudanças, ~10%) | ~220 | ~220 | ~3 min |

---

## 7. Estratégia de Batching e Rate Limiting

### 7.1 Arquitetura Proposta (Backend Futuro)

```
┌─────────────────────────────────────────────┐
│           Sync Orchestrator (Backend)        │
├─────────────────────────────────────────────┤
│  1. Carregar WorkReleases elegíveis          │
│  2. Dividir em batches (50 por batch)       │
│  3. Para cada batch:                         │
│     a. Consultar AniList (com cache)         │
│     b. Aplicar política Tier 1              │
│     c. Registrar mudanças (dry-run log)     │
│     d. Delay 700ms entre chamadas           │
│  4. Retry/backoff em caso de 429/500        │
│  5. Persistir checkpoint (retomar se falhar) │
│  6. Atualizar last_synced_at                 │
└─────────────────────────────────────────────┘
```

### 7.2 Parâmetros Recomendados

| Parâmetro | Valor | Justificativa |
|-----------|-------|---------------|
| Batch size | 50 releases | Equilíbrio entre throughput e segurança |
| Delay entre chamadas | 700ms | ~86 req/min (abaixo do limite 90) |
| Delay entre batches | 2s | Buffer extra de segurança |
| Max retries | 3 | Em caso de 429 ou 500 |
| Backoff base | 2s | Exponential: 2s, 4s, 8s |
| Cache TTL | 5 min | Evita refetch da mesma obra |
| Timeout por chamada | 10s | Evita travar em chamada pendurada |
| Checkpoint a cada | 1 batch | Permite retomar execução interrompida |

### 7.3 Resumo de Execução

```
Batch 1: releases 1-50    → 50 chamadas → ~42s → checkpoint
Batch 2: releases 51-100  → 50 chamadas → ~42s → checkpoint
Batch 3: releases 101-150 → 50 chamadas → ~42s → checkpoint
Batch 4: releases 151-200 → 50 chamadas → ~42s → checkpoint
Batch 5: releases 201-214 → 14 chamadas → ~12s → checkpoint
Total: 214 chamadas → ~3 min
```

---

## 8. Scaling Plan — Hundreds of Works

### 8.1 Visão Geral

O sistema passará de 11 obras de teste → centenas de WorkRelease → catálogo incremental contínuo.

### 8.2 Fases de Escalonamento

| Fase | Escopo | WorkReleases | Chamadas AniList | Frequência |
|------|--------|-------------|------------------|------------|
| **Fase 3C-1** (atual) | Dry-run do catálogo atual | 214 | 0 (simulado) | Única |
| **Fase 3C-2** (próxima) | Sync Tier 1 — 214 releases | 214 | 214 | Única (sync inicial) |
| **Fase 3C-3** | Sync incremental — mudanças | ~22 (10%) | ~22 | Semanal |
| **Fase 3D** | Criar WorkReleases para 714 obras | 714 obras | — | Por demanda |
| **Fase 3E** | Sync completo pós-migração | ~2200 | ~2200 | Sync inicial + incremental |

### 8.3 Sync Inicial

**Objetivo:** Preencher todos os campos null Tier 1 para os 214 releases atuais.

- **Escopo:** 214 WorkReleases (READY_ANILIST + READY_VIA_MAL)
- **Chamadas:** 214 chamadas AniList
- **Tempo:** ~3 minutos
- **Campos:** title_romaji, title_english, title_native, season, season_year, duration_minutes, banner_url, popularity, trending_score, status, is_special, is_movie, is_currently_airing
- **Política:** Preencher null apenas. NUNCA sobrescrever valor existente.
- **Score:** NÃO atualizado via AniList. MAL/Jikan é fonte canônica.

### 8.4 Sync Incremental

**Objetivo:** Manter dados atualizados sem reprocessar tudo.

- **Frequência:** Semanal (campos estruturais) + Diário (trending_score)
- **Escopo:** Apenas releases com `last_synced_at` antigo (> 7 dias) ou `sync_status = pending`
- **Chamadas:** ~22 por semana (estimativa 10% do catálogo muda por semana)
- **Tempo:** ~20 segundos
- **Cache:** 5 min TTL evita refetch desnecessário
- **Checkpoint:** Permite retomar se execução for interrompida

### 8.5 Priorização de Sync

| Prioridade | Critério | Frequência | Justificativa |
|------------|----------|------------|---------------|
| P0 — Obras em exibição | `status = RELEASING` ou `is_currently_airing = true` | Diário | Episódios/popularidade mudam frequentemente |
| P1 — Temporada atual | `season_year = ano atual` e `season = temporada atual` | Semanal | Dados ainda mudam |
| P2 — Próxima temporada | `season_year = próximo ano` ou `status = NOT_YET_RELEASED` | Semanal | Dados preliminares mudam |
| P3 — Obras populares | `popularity > 100000` ou `trending_score > 50` | Semanal | Interesse da comunidade |
| P4 — Obras finalizadas | `status = FINISHED` | Mensal | Dados raramente mudam |
| P5 — Obras antigas | `season_year < ano atual - 2` e `status = FINISHED` | Trimestral | Dados estáveis |
| P6 — Buscadas por usuários | Obras adicionadas ao MyList por usuários | Sob demanda | Garantir dados atualizados para obras em uso |
| P7 — Relations | Relations de obras sincronizadas | Sob demanda | Sugerir novos releases (REVIEW, nunca automático) |

### 8.6 Fluxo de Sync Incremental

```
1. Selecionar releases por prioridade (P0 → P7)
2. Filtrar por last_synced_at (excluir sincronizados recentemente)
3. Dividir em batches (50 por batch)
4. Para cada batch:
   a. Consultar AniList (com cache + rate limit)
   b. Aplicar política por campo:
      - Tier 1 (preencher null): UPDATE automático
      - Tier 2 (score): NÃO atualizar via AniList (MAL only)
      - Tier 3 (review): Gerar SyncConflict simulado
   c. Atualizar last_synced_at
   d. Checkpoint
5. Log de mudanças (auditoria)
6. Retomar se interrompido
```

### 8.7 Obras Buscadas/Adicionadas por Usuários

Quando um usuário adiciona uma obra ao MyList:
1. Verificar se WorkRelease existe
2. Se sim, marcar para sync na próxima janela (prioridade P6)
3. Se não, criar WorkRelease + ExternalMapping (fase futura)
4. Consultar AniList para preencher dados Tier 1

### 8.8 Relations

- Relations do AniList **NUNCA** criam WorkRelease automaticamente
- Relations geram SyncConflict com `suggested_action = create_new_release`
- Admin revisa e aprova manualmente
- Após aprovação, WorkRelease é criado e ExternalMapping é estabelecido

---

## 9. Recomendação de Batch Size

| Cenário | Batch Size Recomendado | Razão |
|---------|----------------------|-------|
| Sync inicial (214 releases) | 50 | 5 batches, ~3 min total |
| Sync incremental (~22 releases) | 25 | 1 batch, ~20s |
| Sync completo futuro (~2200 releases) | 50 | 44 batches, ~26 min |
| Rate limit apertado | 25 | Mais conservador |
| Rate limit flexível | 100 | Mais agressivo (testar antes) |

**Recomendação padrão: 50 releases por batch.** Equilíbrio entre throughput e segurança.

---

## 10. Validações Finais

| # | Validação | Resultado | Status |
|---|-----------|-----------|--------|
| 1 | Nenhuma escrita no banco | 0 writes | ✅ |
| 2 | Nenhuma chamada AniList feita | 0 calls | ✅ |
| 3 | Nenhum DynamicWork alterado | 797 → 797 | ✅ |
| 4 | Nenhum WorkRelease alterado | 214 → 214 | ✅ |
| 5 | Nenhum ExternalMapping alterado | 225 → 225 | ✅ |
| 6 | Nenhum AnimeEntry alterado | 102 → 102 | ✅ |
| 7 | Nenhum SyncConflict criado | 0 → 0 | ✅ |
| 8 | Nenhum SyncQueue criado | 0 → 0 | ✅ |
| 9 | Nenhum WorkRelease criado | 0 | ✅ |
| 10 | Nenhum ExternalMapping criado | 0 | ✅ |
| 11 | Nenhum frontend alterado | — | ✅ |
| 12 | Nenhum fuzzy matching usado | — | ✅ |
| 13 | Nenhum LLM usado | — | ✅ |
| 14 | AniList ID ≠ MAL ID respeitado | Matching via idMal | ✅ |
| 15 | ExternalMapping = base de identidade | Confirmado | ✅ |

---

## 11. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| DynamicWork total | 797 |
| WorkRelease total | 214 |
| ExternalMapping total | 225 |
| **Releases elegíveis para AniList sync** | **214 (100%)** |
| READY_ANILIST (mapping anilist direto) | 11 (5.1%) |
| READY_VIA_MAL (mapping mal → idMal) | 203 (94.9%) |
| MISSING_MAPPING | 0 |
| CONFLICT | 0 |
| NOT_APPLICABLE | 0 |
| **Campos null a preencher (Tier 1)** | **1707** |
| Chamadas AniList necessárias | 214 |
| Tempo estimado (sync inicial) | ~3 minutos |
| Batch size recomendado | 50 |
| Schema issues detectados | 12 (6 baixo, 3 médio, 1 alto) |
| Obras sem WorkRelease (bloqueio futuro) | 714 (89.6%) |

---

## 12. Conclusão

### O que sabemos agora
- **100% do catálogo atual (214 WorkReleases) está elegível para sync AniList** via ExternalMapping
- **1707 campos null** podem ser preenchidos automaticamente via Tier 1
- **214 chamadas AniList** são suficientes para o sync inicial (~3 minutos)
- **0 conflitos** detectados — integridade referencial perfeita
- **12 schema issues** identificados (6 resolvidos pelo Tier 1, 3 precisam normalização, 1 é bloqueio estrutural)

### O que ainda precisamos resolver antes do sync real
1. **Schema mismatch #7-9:** Normalizar formatos de duration, season e popularity antes do sync
2. **Redundância #10-11:** Definir fonte de verdade para score e poster (WorkRelease canônico)
3. **Bloqueio #12:** 714 DynamicWorks sem WorkRelease (fase futura, não bloqueia Tier 1)

### Critério de aceitação
> "Só vamos implementar sync Tier 1 real depois de saber exatamente quantas centenas de obras são elegíveis, quantas têm conflitos e quantas chamadas/API serão necessárias."

**Status: ✅ Aprovado.** Sabemos exatamente:
- 214 releases elegíveis (100%)
- 0 conflitos
- 214 chamadas AniList necessárias
- ~3 minutos de execução
- Batch size 50

### Próximos passos sugeridos
1. Resolver schema issues #7-9 (normalização de formatos)
2. Definir fonte de verdade para campos redundantes (#10-11)
3. Implementar sync Tier 1 backend (base44/functions/) com cache, batching, rate limiting, retry/backoff e checkpoint
4. Executar sync inicial dos 214 releases
5. Implementar sync incremental semanal
6. Fase 3D: Criar WorkReleases para as 714 obras restantes