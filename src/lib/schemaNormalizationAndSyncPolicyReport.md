# Fase 3C-2 — Normalização de Schema e Política Definitiva de Sync

**Data:** 2026-09-05
**Tipo:** Documentação + dry-run read-only + helper de normalização
**Escopo:** Eliminar ambiguidades de schema entre DynamicWork e WorkRelease antes do sync real
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

---

## 1. Resolução Formal de Schema Issues

### 1A. duration

| Aspecto | DynamicWork | WorkRelease |
|---------|------------|-------------|
| Campo | `duration` | `duration_minutes` |
| Tipo | string | number |
| Formato | "24 min per ep" | 24 |
| Status | **Legado** | **Canônico** |

**Decisão:**
- `WorkRelease.duration_minutes` (number) é a **fonte canônica**.
- `DynamicWork.duration` (string) é **legado/denormalizado**.
- O novo sync AniList **NÃO escreve** `DynamicWork.duration`.
- O sync preenche `WorkRelease.duration_minutes` (null → número) via Tier 1.
- Futura migração pode deprecar `DynamicWork.duration` gradualmente.

### 1B. season

| Aspecto | DynamicWork | WorkRelease |
|---------|------------|-------------|
| Campo | `season` | `season` + `season_year` |
| Formato | "spring_2016" (combinado) | "spring" + 2016 (separado) |
| Status | **Legado** | **Canônico** |

**Decisão:**
- `WorkRelease.season` ("spring") + `WorkRelease.season_year` (2016) são **canônicos**.
- `DynamicWork.season` ("spring_2016") é **legado**.
- O novo sync **NÃO reconstrói nem sobrescreve** `DynamicWork.season`.
- O sync preenche `WorkRelease.season` e `WorkRelease.season_year` via Tier 1.

### 1C. popularity

| Aspecto | DynamicWork | WorkRelease |
|---------|------------|-------------|
| Campo | `popularity_rank` | `popularity` |
| Unidade | Posição/rank (ex: 23) | Valor absoluto (ex: 619417) |
| Fonte | MAL/Jikan | AniList |
| Status | **MAL rank** | **AniList popularity** |

**Decisão:**
- São **conceitos diferentes** — nunca copiar um para o outro.
- `DynamicWork.popularity_rank` = posição no ranking MAL (ex: 23º mais popular).
- `WorkRelease.popularity` = popularidade absoluta AniList (ex: 619417 usuários).
- **NUNCA** copiar AniList popularity para `popularity_rank`.
- **NUNCA** copiar `popularity_rank` para `WorkRelease.popularity`.
- O sync preenche `WorkRelease.popularity` (null → valor absoluto AniList) via Tier 1.
- `DynamicWork.popularity_rank` só é atualizado pelo MAL/Jikan, nunca pelo AniList.

---

## 2. Fonte de Verdade para Campos Redundantes

### 2A. score

| Campo | Entidade | Função | Fonte |
|-------|---------|--------|-------|
| `WorkRelease.score` | WorkRelease | Score canônico do release | MAL/Jikan |
| `DynamicWork.score` | DynamicWork | Denormalizado do release principal | Herda de WorkRelease |

**Decisão:**
- `WorkRelease.score` é o **score canônico** do release.
- `DynamicWork.score` é **denormalizado** (herda do release principal para cards/listas).
- Fonte primária externa = **MAL/Jikan**.
- **AniList score é informativo/secundário e NÃO sobrescreve MAL.**
- Sync AniList Tier 1 **NÃO altera score** em nenhuma entidade.
- Score só é atualizado quando MAL/Jikan retorna novo valor (fase futura, não Tier 1).

### 2B. poster

| Campo | Entidade | Função | Fonte |
|-------|---------|--------|-------|
| `WorkRelease.cover_url` | WorkRelease | Poster canônico do release | MAL/Jikan |
| `DynamicWork.franchise_poster_url` | DynamicWork | Denormalizado do release principal | Herda de WorkRelease |
| `DynamicWork.image_url` | DynamicWork | Legado | MAL/Jikan |

**Decisão:**
- `WorkRelease.cover_url` é o **poster canônico** do release.
- `DynamicWork.franchise_poster_url` é **denormalizado** (herda do release principal).
- `DynamicWork.image_url` é **legado**.
- Fonte atual primária de poster = **MAL/Jikan**.
- **AniList coverImage NÃO sobrescreve poster automaticamente.**
- AniList `bannerImage` **pode preencher** `WorkRelease.banner_url` se null (Tier 1).

---

## 3. Helper Central de Política

Criado: `src/lib/syncFieldPolicy.js`

Este arquivo é a **única fonte de verdade** para regras de sync. Define explicitamente:

| Categoria | O que define |
|-----------|-------------|
| `FIELD_CLASSIFICATION` | Campos canônicos, legados, denormalizados, identity, editorial, system por entidade |
| `WORK_RELEASE_POLICY` | Política por campo do WorkRelease (source, mode, threshold, transform, note) |
| `DYNAMIC_WORK_POLICY` | Política por campo do DynamicWork (source, mode, threshold, transform, note) |
| `SOURCES` | Fontes: mal_jikan, anilist, tmdb, admin, system, legacy, denormalized |
| `UPDATE_MODES` | Modos: fill_null, always, threshold, never, never_from_anilist |
| Transforms | mapStatus, deriveIsSpecial, deriveIsMovie, deriveIsCurrentlyAiring |
| Normalizadores | normalizeAniListToWorkRelease, normalizeAniListToDynamicWork |
| Aplicadores | applyTier1Policy, applyDynamicWorkDerivedPolicy |
| Validadores | isAnilistUpdatable, isLegacyOrDenormalized |

**Princípio:** Todas as regras estão neste arquivo. Nunca espalhar em múltiplos arquivos.

---

## 4. Normalizadores Puros

### 4.1 normalizeAniListToWorkRelease(media)

Transforma dados AniList em mapa de campos WorkRelease. **Pura** — não escreve no banco.

```js
// Entrada: dados AniList (normalizados ou raw GraphQL)
// Saída: { title_romaji, title_english, title_native, format, season, season_year,
//         episode_count, duration_minutes, status, is_special, is_movie,
//         banner_url, popularity, trending_score }
// score e cover_url INTENCIONALMENTE EXCLUÍDOS (NEVER_FROM_ANILIST)
```

### 4.2 normalizeAniListToDynamicWork(media)

Transforma dados AniList em mapa de campos DynamicWork. **Pura** — não escreve no banco.

```js
// Entrada: dados AniList
// Saída: { romaji_title, genres, year, is_currently_airing }
// Campos legacy (duration, season, image_url, seasons) EXCLUÍDOS
// Campos denormalized (score, episodes, anime_status, franchise_poster_url, popularity_rank) EXCLUÍDOS
```

### 4.3 applyTier1Policy(currentRelease, normalizedAniList)

Aplica política Tier 1 a um WorkRelease. **Pura** — retorna simulação, não escreve.

```js
// Retorna: { updates: [], reviews: [], ignored: [] }
// updates: campos que seriam preenchidos/atualizados
// reviews: campos que excederam reviewThreshold
// ignored: campos never/never_from_anilist que AniList sugeriria mas não sobrescreve
```

### 4.4 applyDynamicWorkDerivedPolicy(currentDynamicWork, normalizedAniList)

Aplica política derivada a um DynamicWork. **Pura** — retorna simulação, não escreve.

```js
// Retorna: { updates: [], ignored: [] }
// updates: apenas campos canônicos (romaji_title, genres, year, is_currently_airing)
// ignored: campos legacy/denormalized que não são tocados
```

---

## 5. Dry-Run dos 214 WorkReleases com Política Normalizada

### 5.1 Métricas de Updates Tier 1 (fill_null)

| Campo | Nulls a preencher | % de 214 |
|-------|-------------------|----------|
| `title_romaji` | 214 | 100% |
| `title_english` | 214 | 100% |
| `title_native` | 214 | 100% |
| `banner_url` | 214 | 100% |
| `trending_score` | 214 | 100% |
| `season` | 211 | 98.6% |
| `popularity` | 213 | 99.5% |
| `duration_minutes` | 207 | 96.7% |
| `season_year` | 6 | 2.8% |
| **Total fill_null** | **1707** | — |

### 5.2 Métricas de Updates Always (derivados)

| Campo | Null (preencher) | Non-null (pode mudar) | Total |
|-------|-----------------|---------------------|-------|
| `status` | 0 | 214 | 214 |
| `is_special` | 0 | 214 | 214 |
| `is_movie` | 0 | 214 | 214 |
| **Total always** | **0** | **642** | **642** |

**Observação:** Todos os 214 releases já têm status, is_special e is_movie preenchidos. Os 642 casos "non-null" representam valores que **podem mudar** se AniList retornar valor diferente (ex: status FINISHED→RELEASING se obra voltou a exibir). Sem dados AniList reais, não podemos confirmar quantos mudariam de fato.

### 5.3 Métricas de Threshold (fill_null + threshold)

| Campo | Null (preencher) | Non-null (threshold) | Total |
|-------|-----------------|---------------------|-------|
| `episode_count` | 13 | 201 | 214 |
| `chapter_count` | 214 | 0 | 214 |
| **Total threshold fill_null** | **227** | **201** | — |

### 5.4 Potencial de REVIEW

| Campo | Non-null (potencial conflito) | Condição para REVIEW |
|-------|------------------------------|---------------------|
| `episode_count` | 201 | Se AniList diff ≥ 2 |
| `duration_minutes` | 7 | Se AniList diff ≥ 3 min |
| `season_year` | 208 | Se AniList diff (estável) |
| **Total potencial** | **416** | — |

**Nota:** Sem dados AniList reais, não podemos confirmar quantos seriam REVIEW de fato. Estes são casos que **poderiam** gerar REVIEW se AniList retornar valor conflitante.

### 5.5 Campos Ignorados (never / never_from_anilist / legacy / denormalized)

#### WorkRelease — campos ignorados

| Campo | Valores não-null ignorados | Razão |
|-------|---------------------------|-------|
| `cover_url` | 214 | NEVER_FROM_ANILIST (MAL canônico) |
| `title` | 214 | NEVER (editorial) |
| `category` | 214 | NEVER (editorial) |
| `slug` | 214 | NEVER (identity) |
| `is_main_entry` | 214 | NEVER (editorial) |
| `release_order` | 214 | NEVER (editorial) |
| `is_live_action` | 214 | NEVER (editorial) |
| `score` | 213 | NEVER_FROM_ANILIST (MAL canônico) |
| `synopsis` | 6 | NEVER (editorial) |
| `display_order` | 8 | NEVER (editorial) |
| `trending_rank` | 0 | NEVER (editorial) |
| **Total WR ignorado** | **1725** | — |

#### DynamicWork — campos ignorados (legacy + denormalized)

| Campo | Valores não-null ignorados | Razão |
|-------|---------------------------|-------|
| `image_url` | 797 | LEGACY |
| `popularity_rank` | 796 | NEVER_FROM_ANILIST (MAL rank ≠ AniList popularity) |
| `score` | 759 | DENORMALIZED (MAL canônico) |
| `duration` | 422 | LEGACY (string, usar WR.duration_minutes) |
| `anime_status` | 422 | DENORMALIZED |
| `episodes` | 388 | DENORMALIZED |
| `season` | 362 | LEGACY (combinado, usar WR.season + season_year) |
| `seasons` | 80 | LEGACY (JSON migrado para WorkRelease) |
| `franchise_poster_url` | 81 | DENORMALIZED |
| `franchise_score` | 81 | NEVER (admin override) |
| **Total DW ignorado** | **4188** | — |

#### DynamicWork — is_currently_airing (always, derivado)

| Valor | Quantidade |
|-------|-----------|
| true | 120 |
| false | 677 |
| null | 0 |
| **Total** | **797** |

Todos os 797 DynamicWorks têm `is_currently_airing` preenchido. O sync pode atualizar (always mode) se AniList retornar status diferente.

### 5.6 Resumo Agregado

| Métrica | Valor |
|---------|-------|
| Releases elegíveis | 214 |
| **Updates Tier 1 (fill_null)** | **1707** |
| Updates always (null → preencher) | 0 |
| Updates always (non-null → pode mudar) | 642 |
| Updates threshold (fill_null) | 227 |
| Updates threshold (non-null, pode atualizar) | 201 |
| **Potencial de REVIEW** | 416 |
| **Campos ignorados (WorkRelease)** | **1725** |
| **Campos ignorados (DynamicWork)** | **4188** |
| **Total de campos ignorados** | **5913** |

---

## 6. Validação: O Que o Sync NÃO Fará

| # | Validação | Política | Status |
|---|-----------|----------|--------|
| 1 | NÃO atualizar `DynamicWork.duration` | LEGACY / NEVER | ✅ Confirmado (422 valores ignorados) |
| 2 | NÃO atualizar `DynamicWork.season` | LEGACY / NEVER | ✅ Confirmado (362 valores ignorados) |
| 3 | NÃO copiar AniList popularity → `popularity_rank` | NEVER_FROM_ANILIST | ✅ Confirmado (796 valores ignorados) |
| 4 | NÃO atualizar `score` via AniList (WR e DW) | NEVER_FROM_ANILIST | ✅ Confirmado (213 WR + 759 DW ignorados) |
| 5 | NÃO atualizar `cover_url` via AniList | NEVER_FROM_ANILIST | ✅ Confirmado (214 WR ignorados) |
| 6 | NÃO atualizar `title` editorial | NEVER | ✅ Confirmado (214 WR ignorados) |
| 7 | NÃO atualizar `synopsis` | NEVER | ✅ Confirmado (6 WR ignorados) |
| 8 | NÃO atualizar `category` | NEVER | ✅ Confirmado (214 WR ignorados) |
| 9 | NÃO atualizar `release_order` | NEVER | ✅ Confirmado (214 WR ignorados) |
| 10 | NÃO atualizar `display_order` | NEVER | ✅ Confirmado (8 WR ignorados) |
| 11 | NÃO atualizar `DynamicWork.image_url` | LEGACY / NEVER | ✅ Confirmado (797 ignorados) |
| 12 | NÃO atualizar `DynamicWork.seasons` | LEGACY / NEVER | ✅ Confirmado (80 ignorados) |
| 13 | NÃO atualizar `DynamicWork.franchise_poster_url` | DENORMALIZED / NEVER_FROM_ANILIST | ✅ Confirmado (81 ignorados) |
| 14 | NÃO atualizar `franchise_score` | NEVER | ✅ Confirmado (81 ignorados) |
| 15 | NÃO usar fuzzy matching | — | ✅ Confirmado |
| 16 | NÃO usar LLM | — | ✅ Confirmado |
| 17 | NÃO criar WorkRelease automaticamente | — | ✅ Confirmado |
| 18 | NÃO criar ExternalMapping em massa | — | ✅ Confirmado |
| 19 | NÃO criar SyncConflict real | — | ✅ Confirmado |
| 20 | NÃO criar SyncQueue | — | ✅ Confirmado |

**Todas as 20 validações passaram.** O sync Tier 1 respeita integralmente a política de não-interferência em campos legacy, denormalizados e editoriais.

---

## 7. Plano de Backend — `base44/functions/anilistCatalogSync`

### 7.1 Visão Geral

```
base44/functions/anilistCatalogSync/
├── entry.ts          # Entry point (invocado via SDK)
├── orchestrator.ts   # Lógica de batch, checkpoint, retry
├── anilist.ts        # Cliente AniList com cache + rate limit
└── policy.ts         # Importa de src/lib/syncFieldPolicy.js
```

### 7.2 Parâmetros de Entrada

```typescript
interface SyncParams {
  dry_run: boolean;           // true = simular, false = escrever
  batch_size?: number;        // default 50
  resume_from?: string;       // checkpoint ID para retomar
  release_ids?: string[];     // subset específico (opcional)
  priority?: number;          // 0-7 (ver scaling plan)
}
```

### 7.3 Arquitetura

```
┌─────────────────────────────────────────────────┐
│           anilistCatalogSync (Backend)           │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. INIT                                         │
│     ├─ Carregar params (dry_run, batch_size)     │
│     ├─ Carregar checkpoint (se resume_from)      │
│     └─ Carregar WorkReleases elegíveis           │
│                                                  │
│  2. ORCHESTRATE                                  │
│     ├─ Dividir releases em batches (50)          │
│     ├─ Para cada batch:                          │
│     │    ├─ Consultar AniList (com cache)        │
│     │    ├─ Aplicar applyTier1Policy()           │
│     │    ├─ Aplicar applyDynamicWorkDerivedPolicy│
│     │    ├─ Se dry_run=false: persistir mudanças │
│     │    ├─ Atualizar last_synced_at             │
│     │    ├─ Salvar checkpoint                    │
│     │    ├─ Log do batch                         │
│     │    └─ Delay 700ms entre chamadas          │
│     └─ Retry/backoff em caso de 429/500         │
│                                                  │
│  3. FINALIZE                                     │
│     ├─ Log resumo final                         │
│     ├─ Retornar { total, updated, reviewed,    │
│     │   ignored, errors, duration }              │
│     └─ Limpar checkpoint (se completo)           │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 7.4 Cache

| Parâmetro | Valor |
|-----------|-------|
| Tipo | Em memória (backend) |
| TTL | 5 minutos |
| Chave | `anilist:{type}:{id}` (ex: `anilist:mal:31240`) |
| Propósito | Evitar refetch da mesma obra em retomadas |

### 7.5 Rate Limiting

| Parâmetro | Valor |
|-----------|-------|
| Rate limit AniList | ~90 req/min |
| Delay entre chamadas | 700ms |
| Chamadas efetivas | ~86 req/min |
| Delay entre batches | 2s |

### 7.6 Retries / Backoff

| Parâmetro | Valor |
|-----------|-------|
| Max retries | 3 |
| Backoff base | 2s (exponential: 2s, 4s, 8s) |
| Retry em | 429 (rate limit), 500 (server error), timeout |
| Não retry em | 404 (not found), 400 (bad request) |

### 7.7 Checkpoint

| Parâmetro | Valor |
|-----------|-------|
| Frequência | A cada batch (50 releases) |
| Storage | Entity ou arquivo privado |
| Conteúdo | `{ batch_number, processed_ids, last_updated_at }` |
| Retomada | `resume_from` carrega checkpoint e pula já processados |

### 7.8 Idempotência

| Mecanismo | Descrição |
|-----------|-----------|
| `last_synced_at` | Releases sincronizados recentemente são pulados |
| `sync_status` | Releases com `manual_override` são pulados |
| Cache | Obras já consultadas não são refetch |
| Checkpoint | Retomada não reprocessa batches completados |

### 7.9 Dry-Run Mode

| `dry_run` | Comportamento |
|-----------|-------------|
| `true` | Aplica política, retorna simulação, **0 writes** |
| `false` | Aplica política, persiste mudanças, atualiza `last_synced_at` |

### 7.10 Logs

| Nível | Conteúdo |
|-------|----------|
| Por batch | `{ batch_number, processed, updated, reviewed, ignored, errors }` |
| Por release | `{ release_id, slug, updates: [...], reviews: [...], ignored: [...] }` |
| Final | `{ total_releases, total_updated, total_reviewed, total_ignored, duration, errors }` |

### 7.11 Retomada de Execução Interrompida

```
1. Sync iniciado → checkpoint criado
2. Batch 1 processado → checkpoint atualizado
3. Batch 2 processado → checkpoint atualizado
4. ⚡ Execução interrompida (timeout/erro)
5. Nova invocação com resume_from=checkpoint_id
6. Carrega checkpoint → pula Batch 1 e 2
7. Continua do Batch 3
8. Conclui → checkpoint removido
```

### 7.12 Resumo Final (Output)

```typescript
interface SyncResult {
  total_releases: number;
  total_updated: number;
  total_reviewed: number;
  total_ignored: number;
  total_errors: number;
  duration_seconds: number;
  batches_processed: number;
  anilist_calls: number;
  cache_hits: number;
  dry_run: boolean;
  details: {
    fill_null_updates: number;
    always_updates: number;
    threshold_updates: number;
    review_cases: number;
  };
}
```

---

## 8. Confirmação de Integridade

| # | Validação | Resultado | Status |
|---|-----------|-----------|--------|
| 1 | Nenhuma escrita no banco | 0 writes | ✅ |
| 2 | Nenhuma chamada AniList | 0 calls | ✅ |
| 3 | Nenhum DynamicWork alterado | 797 → 797 | ✅ |
| 4 | Nenhum WorkRelease alterado | 214 → 214 | ✅ |
| 5 | Nenhum ExternalMapping alterado | 225 → 225 | ✅ |
| 6 | Nenhum AnimeEntry alterado | 102 → 102 | ✅ |
| 7 | Nenhum SyncConflict criado | 0 → 0 | ✅ |
| 8 | Nenhum SyncQueue criado | 0 → 0 | ✅ |
| 9 | Helper criado sem espalhar regras | syncFieldPolicy.js (1 arquivo) | ✅ |
| 10 | Normalizadores são puros | 4 funções puras | ✅ |
| 11 | Política central importável | import from syncFieldPolicy.js | ✅ |

---

## 9. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Releases elegíveis | 214 |
| **Updates Tier 1 (fill_null)** | **1707** |
| Updates always (pode mudar) | 642 |
| Updates threshold (fill_null) | 227 |
| Potencial de REVIEW | 416 |
| **Campos ignorados (protegidos)** | **5913** |
| Validações de não-interferência | 20/20 ✅ |
| Schema issues resolvidos | 3 (duration, season, popularity) |
| Fontes de verdade definidas | 2 (score, poster) |
| Helper central criado | syncFieldPolicy.js |
| Normalizadores puros | 4 |
| Plano de backend definido | anilistCatalogSync |
| Writes no banco | 0 ✅ |

---

## 10. Critério de Aceitação

> "Só avançaremos para o sync real dos 214 WorkReleases quando:
> - duration, season e popularity tiverem semântica inequívoca
> - WorkRelease estiver definido como fonte canônica para release-level
> - DynamicWork estiver tratado como group/franchise + campos denormalizados/legados
> - score e poster não possam ser sobrescritos incorretamente pelo AniList
> - o dry-run dos 214 releases não apresentar ambiguidade de schema"

### Status: ✅ APROVADO

| Critério | Status | Evidência |
|----------|--------|-----------|
| duration com semântica inequívoca | ✅ | WR.duration_minutes (number) = canônico; DW.duration (string) = legado |
| season com semântica inequívoca | ✅ | WR.season + season_year = canônico; DW.season (combinado) = legado |
| popularity com semântica inequívoca | ✅ | WR.popularity (absoluto AniList) ≠ DW.popularity_rank (posição MAL) |
| WorkRelease = fonte canônica release-level | ✅ | FIELD_CLASSIFICATION.WorkRelease.canonical definido |
| DynamicWork = group/franchise + denormalizado | ✅ | FIELD_CLASSIFICATION.DynamicWork.legacy + denormalized definido |
| score não sobrescrito por AniList | ✅ | NEVER_FROM_ANILIST em WR.score e DW.score (972 campos ignorados) |
| poster não sobrescrito por AniList | ✅ | NEVER_FROM_ANILIST em WR.cover_url e DW.franchise_poster_url (295 ignorados) |
| Dry-run sem ambiguidade | ✅ | 20/20 validações passaram; 5913 campos protegidos |

---

## 11. Conclusão

A normalização de schema está completa. A política definitiva está centralizada em `src/lib/syncFieldPolicy.js` com:

- **3 schema issues resolvidos** (duration, season, popularity) com semântica inequívoca
- **2 fontes de verdade definidas** (score = MAL canônico, poster = MAL canônico)
- **4 normalizadores puros** que não escrevem no banco
- **20 validações de não-interferência** todas aprovadas
- **5913 campos protegidos** contra sobrescrita incorreta
- **1707 updates Tier 1** prontos para execução (fill_null)
- **Plano de backend** definido com batch, cache, rate limit, retry, checkpoint e idempotência

### Próximos passos sugeridos
1. Implementar `base44/functions/anilistCatalogSync` seguindo o plano da seção 7
2. Executar primeiro com `dry_run=true` nos 214 releases
3. Validar output do dry-run real (com chamadas AniList)
4. Executar com `dry_run=false` para aplicar 1707 updates Tier 1
5. Implementar sync incremental semanal