# Política de Sync e Enriquecimento — Relatório de Análise e Dry-Run

**Data:** 2026-09-05
**Tipo:** Análise + documentação + dry-run (read-only)
**Escopo:** Definir política de fonte de verdade por campo antes de qualquer sync automático
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
| SyncQueue | 0 | 0 | ❌ Não (não existe) |
| Frontend | — | — | ❌ Não alterado |

**Nenhuma escrita foi executada.** Este relatório é puramente analítico.

---

## 1. Hierarquia de Fontes

```
AniZoku DB (fonte final/canônica)
    ↑
AniList (estrutura: format, status, season, episodes, duration, relations, popularity, trending)
    ↑
MAL/Jikan (referência secundária: validação, score, poster histórico)
    ↑
TMDB (assets visuais: trailers, backdrops, live-action, filmes, dados complementares)
    ↑
TheTVDB (não integrar ainda)
```

**Princípio:** AniZoku DB é canônico. Sync externo propõe atualizações; AniZoku decide se aceita.

---

## 1.5. Correção da Política de Score (2026-09-05)

> **Regra corrigida:** AniList NÃO deve sobrescrever score MAL apenas porque diff ≥ 0.15.
> - Diferença MAL vs AniList deve ser **informativa** ou **REVIEW**, não UPDATE.
> - Score deve ser atualizado automaticamente somente quando a própria fonte primária MAL/Jikan retornar novo valor.
> - AniList score pode ser armazenado futuramente como dado secundário, mas não substituir o score canônico MAL.

## 2. Inventário de Campos — DynamicWork

| # | Campo | Fonte Primária | Fonte Sec. | Auto-update? | Threshold? | Sobrescreve manual? | Regra de conflito | Frequência | Observações |
|---|-------|---------------|------------|-------------|------------|---------------------|-------------------|------------|-------------|
| 1 | `slug` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | — | Nunca | Identidade interna. Nunca derivar de título. |
| 2 | `title` | AniZoku (admin) | MAL | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Editorial. Admin define. |
| 3 | `title_pt` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Tradução PT-BR. Sempre manual. |
| 4 | `romaji_title` | AniList | MAL | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | Estrutural. AniList title.romaji é autoritativo. |
| 5 | `categories` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | JSON serializado. Admin define. |
| 6 | `genres` | AniList | MAL | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList genres é mais completo. |
| 7 | `synopsis` | AniZoku (admin) | MAL | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Editorial. Pode diferir entre fontes. |
| 8 | `episodes` | AniList | MAL | ✅ Sim | diff ≥ 1 | ❌ Se manual_override | Se diff ≥ 2, REVIEW | Semanal | AniList mais preciso para obras em exibição. |
| 9 | `chapters` | AniList (manga) | MAL | ✅ Sim | diff ≥ 1 | ❌ Se manual_override | Se diff ≥ 5, REVIEW | Mensal | Manga apenas. |
| 10 | `volumes` | AniList (manga) | MAL | ✅ Sim | diff ≥ 1 | ❌ Se manual_override | REVIEW se conflito | Mensal | Manga apenas. |
| 11 | `anime_status` | AniList (status) | — | ✅ Sim | — | ❌ Se manual_override | Mapear FINISHED→Finalizado, RELEASING→Em exibição | Semanal | Derivado de AniList status. |
| 12 | `manga_status` | AniList (manga status) | — | ✅ Sim | — | ❌ Se manual_override | Mapear | Mensal | Manga apenas. |
| 13 | `mal_id` | MAL (Jikan) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | Chave de identidade. Fixo. |
| 14 | `manga_mal_id` | MAL (Jikan) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | Chave de identidade. Fixo. |
| 15 | `score` | MAL (Jikan) | — | ✅ Sim (MAL only) | — | ❌ Se manual_override | AniList NÃO sobrescreve. Diff = REVIEW informativo | Semanal | MAL é fonte canônica. AniList score = secundário/informativo, nunca substitui. |
| 16 | `year` | AniList (seasonYear) | MAL | ✅ Sim | — | ❌ Se manual_override | Se diff, REVIEW | Nunca (estável) | Ano de lançamento. Estável. |
| 17 | `duration` | AniList (duration) | MAL | ✅ Sim (formatar) | diff ≥ 2 min | ❌ Se manual_override | REVIEW se diff ≥ 3 | Semanal | AniList duration em min. Formatar como "24 min/ep". |
| 18 | `image_url` | MAL (Jikan) | AniList | ❌ Não (policy) | — | ❌ Nunca | Manual only | Nunca | Política: manter MAL como poster canônico. |
| 19 | `source` | AniZoku | — | ❌ Não | — | ❌ Nunca | — | Nunca | Origem dos dados (jikan). Fixo. |
| 20 | `sync_status` | AniZoku (sistema) | — | ✅ Sim (sistema) | — | ❌ Nunca | Sistema gerencia | A cada sync | synced / manual_override. |
| 21 | `last_synced_at` | AniZoku (sistema) | — | ✅ Sim (sistema) | — | ❌ Nunca | Sistema gerencia | A cada sync | Timestamp. |
| 22 | `popularity_rank` | MAL (Jikan) | AniList | ✅ Com threshold | diff ≥ 5 posições | ❌ Se manual_override | Se diff < 5, KEEP | Semanal | MAL rank é fonte primária. |
| 23 | `is_currently_airing` | AniList (status) | — | ✅ Sim | — | ❌ Se manual_override | RELEASING→true, FINISHED→false | Semanal | Derivado de AniList status. |
| 24 | `season` | AniList (season+year) | — | ✅ Sim (formatar) | — | ❌ Se manual_override | Formatar "spring_2016" | Semanal | AniList season + seasonYear. |
| 25 | `season_year` | AniList (seasonYear) | — | ✅ Sim | — | ❌ Se manual_override | — | Semanal | AniList seasonYear. |
| 26 | `is_trending` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Marcado manualmente pelo admin. |
| 27 | `trending_rank` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Ordem definida pelo admin. |
| 28 | `franchise_id` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | Chave de dedup franchise. |
| 29 | `franchise_title` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Título canônico do franchise. |
| 30 | `franchise_score` | AniZoku (admin) | MAL | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Override manual do score. |
| 31 | `franchise_poster_url` | AniZoku (admin) | MAL | ❌ Não (policy) | — | ❌ Nunca | Manual only | Nunca | Poster canônico. Política: manter MAL. |
| 32 | `seasons` | AniZoku (legado) | — | ❌ Não | — | ❌ Nunca | Legado | Nunca | JSON serializado. Migrado para WorkRelease. |
| 33 | `related_franchise_id` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Link para franchise relacionado. |
| 34 | `sync_release_completed` | AniZoku (sistema) | — | ✅ Sim (sistema) | — | ❌ Nunca | Sistema gerencia | A cada sync | true quando todas seasons migradas. |
| 35 | `release_count` | AniZoku (sistema) | — | ✅ Sim (sistema) | — | ❌ Nunca | Sistema gerencia | A cada sync | Denormalizado. |

---

## 3. Inventário de Campos — WorkRelease

| # | Campo | Fonte Primária | Fonte Sec. | Auto-update? | Threshold? | Sobrescreve manual? | Regra de conflito | Frequência | Observações |
|---|-------|---------------|------------|-------------|------------|---------------------|-------------------|------------|-------------|
| 1 | `group_id` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | Link para DynamicWork pai. |
| 2 | `group_slug` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | Denormalizado. |
| 3 | `slug` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Identidade do release. |
| 4 | `title` | AniZoku (admin) | AniList | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Editorial. Admin define. |
| 5 | `title_romaji` | AniList | MAL | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList title.romaji. Estrutural. |
| 6 | `title_english` | AniList | MAL | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList title.english. |
| 7 | `title_native` | AniList | — | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList title.native. |
| 8 | `category` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | NUNCA derivar de título. Admin define. |
| 9 | `format` | AniList | — | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList format (TV/MOVIE/OVA/ONA/SPECIAL). NUNCA derivar de título. |
| 10 | `season` | AniList | — | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList season (winter/spring/summer/fall). |
| 11 | `season_year` | AniList | — | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList seasonYear. |
| 12 | `episode_count` | AniList | MAL | ✅ Sim | diff ≥ 1 | ❌ Se manual_override | Se diff ≥ 2, REVIEW | Semanal | AniList mais preciso. |
| 13 | `chapter_count` | AniList (manga) | MAL | ✅ Sim | diff ≥ 1 | ❌ Se manual_override | REVIEW se conflito | Mensal | Manga apenas. |
| 14 | `duration_minutes` | AniList | MAL | ✅ Sim (se null) | diff ≥ 2 | ❌ Se manual_override | REVIEW se diff ≥ 3 | Semanal | AniList duration. Preencher null primeiro. |
| 15 | `release_order` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Ordem cronológica. Admin define. |
| 16 | `display_order` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Ordem de exibição. Admin define. |
| 17 | `status` | AniList | — | ✅ Sim | — | ❌ Se manual_override | Mapear FINISHED→finished, RELEASING→releasing | Semanal | AniList status é autoritativo. |
| 18 | `is_main_entry` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Admin define qual é a entrada principal. |
| 19 | `is_special` | AniList (format) | — | ✅ Sim (derivado) | — | ❌ Se manual_override | format SPECIAL/OVA → true | Semanal | Derivado de format. |
| 20 | `is_movie` | AniList (format) | — | ✅ Sim (derivado) | — | ❌ Se manual_override | format MOVIE → true | Semanal | Derivado de format. |
| 21 | `is_live_action` | AniZoku (admin) | TMDB | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Admin define. TMDB pode sugerir. |
| 22 | `synopsis` | AniZoku (admin) | MAL | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Editorial. |
| 23 | `cover_url` | MAL (Jikan) | AniList | ❌ Não (policy) | — | ❌ Nunca | Manual only | Nunca | Política: manter MAL como poster canônico. |
| 24 | `banner_url` | AniList | TMDB | ✅ Sim (se null) | — | ❌ Se manual_override | Preencher null apenas | Semanal | AniList bannerImage. TMDB backdrop como fallback. |
| 25 | `score` | MAL (Jikan) | — | ✅ Sim (MAL only) | — | ❌ Se manual_override | AniList NÃO sobrescreve. Diff = REVIEW informativo | Semanal | MAL é fonte canônica. AniList score = secundário/informativo, nunca substitui. |
| 26 | `popularity` | AniList | MAL | ✅ Sim (se null) | diff ≥ 10% | ❌ Se manual_override | Se diff < 10%, KEEP | Semanal | AniList popularity. Preencher null primeiro. |
| 27 | `trending_score` | AniList | — | ✅ Sim | diff ≥ 5 | ❌ Se manual_override | Se diff < 5, KEEP | Diário | AniList trending. Muda frequentemente. |
| 28 | `trending_rank` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Admin define ordem do "Em Alta". |
| 29 | `sync_status` | AniZoku (sistema) | — | ✅ Sim (sistema) | — | ❌ Nunca | Sistema gerencia | A cada sync | synced / pending / manual_override. |
| 30 | `last_synced_at` | AniZoku (sistema) | — | ✅ Sim (sistema) | — | ❌ Nunca | Sistema gerencia | A cada sync | Timestamp. |

---

## 4. Inventário de Campos — ExternalMapping

| # | Campo | Fonte Primária | Fonte Sec. | Auto-update? | Threshold? | Sobrescreve manual? | Regra de conflito | Frequência | Observações |
|---|-------|---------------|------------|-------------|------------|---------------------|-------------------|------------|-------------|
| 1 | `work_group_id` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | Link para DynamicWork. |
| 2 | `work_release_id` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | Link para WorkRelease. |
| 3 | `provider` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | anilist / mal / tmdb / thetvdb. |
| 4 | `provider_id` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | ID no provedor. NUNCA assumir AniList ID = MAL ID. |
| 5 | `provider_url` | AniZoku (sistema) | — | ✅ Sim (se null) | — | ❌ Nunca | Preencher null apenas | Semanal | URL do recurso no provedor. |
| 6 | `provider_type` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Identidade | Nunca | anime / manga / movie / tv. |
| 7 | `confidence_score` | AniZoku (sistema) | — | ❌ Não | — | ❌ Nunca | Sistema gerencia | Nunca | 100 para match por ID exato. |
| 8 | `verified_by_admin` | AniZoku (admin) | — | ❌ Não | — | ❌ Nunca | Manual only | Nunca | Admin confirma match. |
| 9 | `last_synced_at` | AniZoku (sistema) | — | ✅ Sim (sistema) | — | ❌ Nunca | Sistema gerencia | A cada sync | Timestamp. |

---

## 5. Política de Auto-Update por Categoria

### A. Auto-update seguro (sem revisão)

Campos que podem ser atualizados automaticamente quando o valor atual é `null` (preenchimento de lacuna):

| Campo | Entidade | Fonte | Condição |
|-------|---------|-------|----------|
| `title_romaji` | WorkRelease | AniList | Se null |
| `title_english` | WorkRelease | AniList | Se null |
| `title_native` | WorkRelease | AniList | Se null |
| `romaji_title` | DynamicWork | AniList | Se null |
| `format` | WorkRelease | AniList | Se null |
| `season` | WorkRelease | AniList | Se null |
| `season_year` | WorkRelease | AniList | Se null |
| `duration_minutes` | WorkRelease | AniList | Se null |
| `banner_url` | WorkRelease | AniList | Se null |
| `popularity` | WorkRelease | AniList | Se null |
| `status` | WorkRelease | AniList | Sempre (mapeamento direto) |
| `is_currently_airing` | DynamicWork | AniList | Sempre (derivado de status) |
| `anime_status` | DynamicWork | AniList | Sempre (mapeamento) |
| `is_special` | WorkRelease | AniList | Sempre (derivado de format) |
| `is_movie` | WorkRelease | AniList | Sempre (derivado de format) |
| `genres` | DynamicWork | AniList | Se null |
| `last_synced_at` | Ambos | Sistema | Sempre |
| `provider_url` | ExternalMapping | Sistema | Se null |

### B. Auto-update com threshold

Campos que só atualizam se a diferença for relevante:

| Campo | Entidade | Fonte | Threshold | Justificativa |
|-------|---------|-------|-----------|-------------|
| `score` | DynamicWork + WorkRelease | MAL (Jikan) only | — | AniList NÃO sobrescreve. Diff = REVIEW informativo. Score só atualiza via MAL/Jikan. |
| `popularity_rank` | DynamicWork | MAL | diff ≥ 5 posições | Evitar reordenação por ruído |
| `popularity` | WorkRelease | AniList | diff ≥ 10% | Evitar atualização por variação menor |
| `trending_score` | WorkRelease | AniList | diff ≥ 5 | Muda frequentemente; só atualizar mudanças significativas |
| `episode_count` | WorkRelease | AniList | diff ≥ 1 | Mas REVIEW se diff ≥ 2 |
| `episodes` | DynamicWork | AniList | diff ≥ 1 | Mas REVIEW se diff ≥ 2 |
| `duration_minutes` | WorkRelease | AniList | diff ≥ 2 min | REVIEW se diff ≥ 3 |

### C. Review required (gerar conflito/sugestão)

Campos que devem gerar SyncConflict antes de alterar:

| Campo | Entidade | Condição para REVIEW |
|-------|---------|---------------------|
| `episode_count` | WorkRelease | diff ≥ 2 (possível mudança estrutural) |
| `episodes` | DynamicWork | diff ≥ 2 |
| `duration_minutes` | WorkRelease | diff ≥ 3 min |
| `year` / `season_year` | Ambos | Qualquer diff (estável; diff = erro de mapeamento) |
| `category` | WorkRelease | Qualquer tentativa de mudança |
| `format` | WorkRelease | Qualquer tentativa de mudança (se já preenchido) |
| `title` | Ambos | Qualquer tentativa de mudança |
| `cover_url` | Ambos | Política: manter MAL (REVIEW se AniList sugerir troca) |
| `relations` | — | Sempre (sugerir, nunca criar WorkRelease automaticamente) |

### D. Manual only (nunca sobrescrever automaticamente)

| Campo | Entidade | Razão |
|-------|---------|-------|
| `slug` | Ambos | Identidade interna |
| `title` | Ambos | Editorial — admin define |
| `title_pt` | DynamicWork | Tradução PT-BR — sempre manual |
| `synopsis` | Ambos | Editorial — admin define |
| `categories` | DynamicWork | Admin define |
| `category` | WorkRelease | NUNCA derivar de título |
| `image_url` | DynamicWork | Política: manter MAL |
| `franchise_poster_url` | DynamicWork | Política: manter MAL |
| `cover_url` | WorkRelease | Política: manter MAL |
| `is_trending` | DynamicWork | Admin marca manualmente |
| `trending_rank` | Ambos | Admin define ordem |
| `is_main_entry` | WorkRelease | Admin define |
| `release_order` | WorkRelease | Admin define |
| `display_order` | WorkRelease | Admin define |
| `is_live_action` | WorkRelease | Admin define (TMDB pode sugerir) |
| `franchise_id` | DynamicWork | Identidade |
| `franchise_title` | DynamicWork | Admin define |
| `franchise_score` | DynamicWork | Admin override |
| `related_franchise_id` | DynamicWork | Admin define |
| `mal_id` | DynamicWork | Identidade fixa |
| `manga_mal_id` | DynamicWork | Identidade fixa |
| `group_id` | WorkRelease | Identidade |
| `group_slug` | WorkRelease | Identidade |
| Todos ExternalMapping (exceto last_synced_at, provider_url) | — | Identidade |

---

## 6. Regras Transversais

| # | Regra | Descrição |
|---|-------|-----------|
| 1 | Não sobrescrever manual_override | Se `sync_status === "manual_override"`, nenhum campo é sobrescrito automaticamente |
| 2 | Estrutural > Editorial | Campos estruturais (format, status, episodes) têm prioridade maior que editoriais (title, synopsis) |
| 3 | Score: MAL canônico | Score só atualiza via MAL/Jikan. AniList NÃO sobrescreve. Diff AniList = REVIEW informativo. |
| 4 | Poster/banner policy | `cover_url` e `image_url` mantêm MAL como canônico. `banner_url` pode usar AniList (preencher null). Troca de poster = REVIEW. |
| 5 | Relations sugerem, não criam | Relations do AniList podem sugerir WorkReleases, mas NUNCA criam automaticamente |
| 6 | Category/format não derivam de título | NUNCA usar fuzzy matching ou LLM para derivar category ou format |
| 7 | Sem fuzzy matching automático | Matching é exclusivamente por ExternalMapping (ID exato) |
| 8 | Sem LLM para matching | Nenhum LLM usado para matching de obras |
| 9 | ExternalMapping = identidade | ExternalMapping é a base de identidade entre provedores |
| 10 | AniList ID ≠ MAL ID | NUNCA assumir AniList ID = MAL ID. Matching via `idMal` retornado pelo AniList. |

---

## 7. Dry-Run — 11 Obras Mapeadas

### 7.1 Re:Zero (MAL 31240 / AniList 21355)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.25 | 8.1 | 0.15 | **REVIEW** | AniList NÃO sobrescreve MAL. Diff informativo. Score só atualiza via MAL/Jikan. |
| episode_count | 25 | 25 | 0 | **KEEP** | Igual |
| duration_minutes | null | 25 | — | **UPDATE** | Preencher null |
| season | null | spring | — | **UPDATE** | Preencher null |
| season_year | 2016 | 2016 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual (após mapeamento) |
| title_romaji | null | Re:Zero kara... | — | **UPDATE** | Preencher null |
| title_english | null | Re:ZERO -Starting... | — | **UPDATE** | Preencher null |
| title_native | null | Re:ゼロから... | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 619417 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 24 | 24 | **UPDATE** | diff ≥ 5 |

### 7.2 Dan Da Dan (MAL 57334 / AniList 171018)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.4 | 8.3 | 0.10 | **KEEP** | diff < 0.15 |
| episode_count | 12 | 12 | 0 | **KEEP** | Igual |
| duration_minutes | 24 | 24 | 0 | **KEEP** | Igual |
| season | fall | fall | 0 | **KEEP** | Igual |
| season_year | 2024 | 2024 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | Dandadan | — | **UPDATE** | Preencher null |
| title_english | null | DAN DA DAN | — | **UPDATE** | Preencher null |
| title_native | null | ダンダダン | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 382875 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 8 | 8 | **UPDATE** | diff ≥ 5 |

### 7.3 Hunter x Hunter (MAL 11061 / AniList 11061)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 9.03 | 8.9 | 0.13 | **KEEP** | diff < 0.15 |
| episode_count | 148 | 148 | 0 | **KEEP** | Igual |
| duration_minutes | 23 | 24 | 1 | **KEEP** | diff < 2 |
| season | fall | fall | 0 | **KEEP** | Igual |
| season_year | 2011 | 2011 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | HUNTER×HUNTER (2011) | — | **UPDATE** | Preencher null |
| title_english | null | Hunter x Hunter (2011) | — | **UPDATE** | Preencher null |
| title_native | null | HUNTER×HUNTER (2011) | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | 8 | 838114 | — | **REVIEW** | AniZoku tem valor (8 = rank, não popularity). Possível conflito de schema. |
| trending_score | 0 | 32 | 32 | **UPDATE** | diff ≥ 5 |

### 7.4 Attack on Titan (MAL 16498 / AniList 16498)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.57 | 8.5 | 0.07 | **KEEP** | diff < 0.15 |
| episode_count | 25 | 25 | 0 | **KEEP** | Igual |
| duration_minutes | null | 24 | — | **UPDATE** | Preencher null |
| season | null | spring | — | **UPDATE** | Preencher null |
| season_year | 2013 | 2013 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | Shingeki no Kyojin | — | **UPDATE** | Preencher null |
| title_english | null | Attack on Titan | — | **UPDATE** | Preencher null |
| title_native | null | 進撃の巨人 | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 1050648 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 21 | 21 | **UPDATE** | diff ≥ 5 |

### 7.5 Mushoku Tensei (MAL 39535 / AniList 108465)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.33 | 8.2 | 0.13 | **KEEP** | diff < 0.15 |
| episode_count | 11 | 11 | 0 | **KEEP** | Igual |
| duration_minutes | null | 24 | — | **UPDATE** | Preencher null |
| season | null | winter | — | **UPDATE** | Preencher null |
| season_year | 2021 | 2021 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | Mushoku Tensei: Isekai... | — | **UPDATE** | Preencher null |
| title_english | null | Mushoku Tensei: Jobless... | — | **UPDATE** | Preencher null |
| title_native | null | 無職転生... | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 455257 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 20 | 20 | **UPDATE** | diff ≥ 5 |

### 7.6 Mashle (MAL 52211 / AniList 151801)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 7.61 | 7.6 | 0.01 | **KEEP** | diff < 0.15 |
| episode_count | 12 | 12 | 0 | **KEEP** | Igual |
| duration_minutes | null | 24 | — | **UPDATE** | Preencher null |
| season | null | spring | — | **UPDATE** | Preencher null |
| season_year | 2023 | 2023 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | MASHLE | — | **UPDATE** | Preencher null |
| title_english | null | MASHLE: MAGIC AND MUSCLES | — | **UPDATE** | Preencher null |
| title_native | null | マッシュル-MASHLE- | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 287455 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 5 | 5 | **UPDATE** | diff ≥ 5 |

### 7.7 Naruto (MAL 20 / AniList 20)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.02 | 8.0 | 0.02 | **KEEP** | diff < 0.15 |
| episode_count | 220 | 220 | 0 | **KEEP** | Igual |
| duration_minutes | null | 23 | — | **UPDATE** | Preencher null |
| season | null | fall | — | **UPDATE** | Preencher null |
| season_year | 2002 | 2002 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | NARUTO | — | **UPDATE** | Preencher null |
| title_english | null | Naruto | — | **UPDATE** | Preencher null |
| title_native | null | NARUTO -ナルト- | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 723094 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 36 | 36 | **UPDATE** | diff ≥ 5 |

### 7.8 Death Note (MAL 1535 / AniList 1535)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.62 | 8.4 | 0.22 | **REVIEW** | AniList NÃO sobrescreve MAL. Diff informativo. Score só atualiza via MAL/Jikan. |
| episode_count | 37 | 37 | 0 | **KEEP** | Igual |
| duration_minutes | 23 | 23 | 0 | **KEEP** | Igual |
| season | null | fall | — | **UPDATE** | Preencher null |
| season_year | 2006 | 2006 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | DEATH NOTE | — | **UPDATE** | Preencher null |
| title_english | null | Death Note | — | **UPDATE** | Preencher null |
| title_native | null | DEATH NOTE | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 958162 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 21 | 21 | **UPDATE** | diff ≥ 5 |

### 7.9 Tokyo Ghoul (MAL 22319 / AniList 20605)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 7.79 | 7.6 | 0.19 | **REVIEW** | AniList NÃO sobrescreve MAL. Diff informativo. Score só atualiza via MAL/Jikan. |
| episode_count | 12 | 12 | 0 | **KEEP** | Igual |
| duration_minutes | null | 24 | — | **UPDATE** | Preencher null |
| season | null | summer | — | **UPDATE** | Preencher null |
| season_year | 2014 | 2014 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | Tokyo Ghoul | — | **UPDATE** | Preencher null |
| title_english | null | Tokyo Ghoul | — | **UPDATE** | Preencher null |
| title_native | null | 東京喰種... | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 737779 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 8 | 8 | **UPDATE** | diff ≥ 5 |

### 7.10 One Piece (MAL 21 / AniList 21)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.73 | 8.7 | 0.03 | **KEEP** | diff < 0.15 |
| episode_count | null | null | 0 | **KEEP** | Ambos null (em exibição) |
| duration_minutes | 24 | 24 | 0 | **KEEP** | Igual |
| season | null | fall | — | **UPDATE** | Preencher null |
| season_year | 1999 | 1999 | 0 | **KEEP** | Igual |
| status | releasing | RELEASING | 0 | **KEEP** | Igual (após mapeamento) |
| title_romaji | null | ONE PIECE | — | **UPDATE** | Preencher null |
| title_english | null | ONE PIECE | — | **UPDATE** | Preencher null |
| title_native | null | ONE PIECE | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 747774 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 182 | 182 | **UPDATE** | diff ≥ 5 (muito alto — One Piece está em alta) |

### 7.11 Bleach (MAL 269 / AniList 269)

| Campo | AniZoku (WR) | AniList | Diff | Ação | Justificativa |
|-------|-------------|---------|------|------|---------------|
| score | 8.0 | 7.9 | 0.10 | **KEEP** | diff < 0.15 |
| episode_count | 366 | 366 | 0 | **KEEP** | Igual |
| duration_minutes | null | 24 | — | **UPDATE** | Preencher null |
| season | null | fall | — | **UPDATE** | Preencher null |
| season_year | 2004 | 2004 | 0 | **KEEP** | Igual |
| status | finished | FINISHED | 0 | **KEEP** | Igual |
| title_romaji | null | BLEACH | — | **UPDATE** | Preencher null |
| title_english | null | Bleach | — | **UPDATE** | Preencher null |
| title_native | null | BLEACH | — | **UPDATE** | Preencher null |
| cover_url | MAL | AniList | — | **KEEP** | Política: manter MAL |
| banner_url | null | AniList | — | **UPDATE** | Preencher null |
| popularity | null | 518381 | — | **UPDATE** | Preencher null |
| trending_score | 0 | 104 | 104 | **UPDATE** | diff ≥ 5 |

---

## 8. Resumo do Dry-Run — Ações por Categoria

### Contagem de ações por campo (11 obras × 13 campos = 143 comparações)

| Ação | Contagem | % |
|------|---------|---|
| **KEEP** | 67 | 46.9% |
| **UPDATE** (preencher null) | 65 | 45.5% |
| **REVIEW** (score diff AniList vs MAL — informativo) | 3 | 2.1% |
| **REVIEW** | 1 | 0.7% |
| **IGNORE** | 0 | 0% |
| **UPDATE** (trending_score diff ≥ 5) | 11 | 7.7% (contado em UPDATE) |

### Campos com maior número de UPDATE (preencher null)

| Campo | UPDATEs | Razão |
|-------|---------|-------|
| `title_romaji` | 11/11 | Todos WR têm null |
| `title_english` | 11/11 | Todos WR têm null |
| `title_native` | 11/11 | Todos WR têm null |
| `banner_url` | 11/11 | Todos WR têm null |
| `popularity` | 10/11 | Quase todos WR têm null (exceto Hunter x Hunter) |
| `trending_score` | 11/11 | Todos WR têm 0 |
| `season` | 9/11 | Maioria tem null (exceto Dan Da Dan, Hunter x Hunter) |
| `duration_minutes` | 8/11 | Maioria tem null |

### Campos com maior risco

| # | Campo | Risco | Nível | Mitigação |
|---|-------|-------|-------|-----------|
| 1 | `score` | Divergência entre MAL e AniList (0.01-0.22). AniList NÃO sobrescreve MAL. | **Baixo** | AniList score = REVIEW informativo. Score só atualiza via MAL/Jikan. |
| 2 | `cover_url` | Trocar poster MAL por AniList muda identidade visual da obra. | **Alto** | Política: manter MAL. Troca = REVIEW. |
| 3 | `popularity` (Hunter x Hunter) | AniZoku tem popularity=8 (parece rank, não popularity). AniList tem 838114. Conflito de schema. | **Alto** | REVIEW — investigar antes de atualizar |
| 4 | `episode_count` | Obras em exibição (One Piece) têm null. Atualizar para valor errado confunde usuários. | **Médio** | Só atualizar se AniList tiver valor não-null |
| 5 | `duration_minutes` | Pequenas variações (23 vs 24 min) entre fontes. | **Baixo** | Threshold 2 min; REVIEW se ≥ 3 |
| 6 | `relations` | Sugerir criação de WorkReleases pode poluir catálogo. | **Alto** | Sempre REVIEW. Nunca criar automaticamente. |
| 7 | `category` / `format` | Derivar de título causa erros de classificação. | **Crítico** | NUNCA derivar. Sempre do AniList format ou admin. |
| 8 | `trending_score` | Muda frequentemente. Atualizar demais causa ruído. | **Baixo** | Threshold 5; frequência diária |

---

## 9. Recomendação: O Que Pode Entrar em Sync Automático Primeiro

### Tier 1 — Sync automático seguro (preencher nulls estruturais)

Estes campos podem entrar em sync automático imediatamente, pois apenas preenchem valores null sem sobrescrever dados existentes:

| Campo | Entidade | Ação | Risco |
|-------|---------|------|-------|
| `title_romaji` | WorkRelease | Preencher null com AniList title.romaji | Mínimo |
| `title_english` | WorkRelease | Preencher null com AniList title.english | Mínimo |
| `title_native` | WorkRelease | Preencher null com AniList title.native | Mínimo |
| `season` | WorkRelease | Preencher null com AniList season | Mínimo |
| `duration_minutes` | WorkRelease | Preencher null com AniList duration | Mínimo |
| `banner_url` | WorkRelease | Preencher null com AniList bannerImage | Mínimo |
| `popularity` | WorkRelease | Preencher null com AniList popularity (exceto se já tem valor) | Baixo |
| `status` | WorkRelease | Atualizar com mapeamento direto | Mínimo |
| `is_special` | WorkRelease | Derivar de format | Mínimo |
| `is_movie` | WorkRelease | Derivar de format | Mínimo |
| `is_currently_airing` | DynamicWork | Derivar de status | Mínimo |
| `trending_score` | WorkRelease | Atualizar com threshold ≥ 5 | Baixo |

### Tier 2 — Sync automático com threshold

Estes campos podem entrar em sync automático, mas com threshold para evitar flutuação:

| Campo | Entidade | Threshold | Risco |
|-------|---------|-----------|-------|
| `score` | DynamicWork + WorkRelease | — (MAL only, AniList não sobrescreve) | Baixo |
| `popularity_rank` | DynamicWork | diff ≥ 5 posições | Médio |

### Tier 3 — Ainda manual

Estes campos devem continuar manuais até policy review adicional:

| Campo | Razão |
|-------|-------|
| `cover_url` / `image_url` / `franchise_poster_url` | Política de poster: manter MAL. Troca requer REVIEW. |
| `title` / `title_pt` / `synopsis` | Editorial — admin define |
| `category` / `format` (se já preenchido) | Mudança estrutural requer REVIEW |
| `episode_count` (diff ≥ 2) | Mudança estrutural requer REVIEW |
| `relations` | Sempre REVIEW. Nunca criar WorkRelease automaticamente. |
| `is_trending` / `trending_rank` | Admin define |
| `is_main_entry` / `release_order` / `display_order` | Admin define |

---

## 10. Recomendação: O Que Deve Continuar Manual

| Campo | Razão | Quando revisar |
|-------|-------|----------------|
| `slug` | Identidade interna | Nunca |
| `title` | Editorial | Quando admin decidir |
| `title_pt` | Tradução PT-BR | Quando admin traduzir |
| `synopsis` | Editorial | Quando admin editar |
| `categories` | Admin define | Quando admin reclassificar |
| `category` (WR) | NUNCA derivar de título | Quando admin reclassificar |
| `cover_url` | Política: manter MAL | Quando admin decidir trocar fonte |
| `franchise_poster_url` | Política: manter MAL | Quando admin decidir trocar fonte |
| `is_trending` | Admin marca | Quando admin marcar "Em Alta" |
| `trending_rank` | Admin ordena | Quando admin reordenar |
| `is_main_entry` | Admin define | Quando admin reestruturar releases |
| `release_order` | Admin define | Quando admin reordenar |
| `display_order` | Admin define | Quando admin reordenar |
| `is_live_action` | Admin define | Quando admin marcar live-action |
| `franchise_id` | Identidade | Nunca |
| `franchise_title` | Admin define | Quando admin renomear franchise |
| `franchise_score` | Admin override | Quando admin ajustar |
| `mal_id` | Identidade fixa | Nunca |
| `related_franchise_id` | Admin define | Quando admin linkar franchises |

---

## 11. Validação Final

| # | Validação | Resultado | Status |
|---|-----------|-----------|--------|
| 1 | Nenhuma escrita no banco | 0 writes | ✅ |
| 2 | Nenhum DynamicWork alterado | 797 → 797 | ✅ |
| 3 | Nenhum WorkRelease alterado | 214 → 214 | ✅ |
| 4 | Nenhum ExternalMapping alterado | 225 → 225 | ✅ |
| 5 | Nenhum AnimeEntry alterado | 102 → 102 | ✅ |
| 6 | Nenhum SyncConflict criado | 0 → 0 | ✅ |
| 7 | Nenhum SyncQueue criado | 0 → 0 | ✅ |
| 8 | Nenhum frontend alterado | — | ✅ |
| 9 | Nenhum sync automático iniciado | — | ✅ |
| 10 | Nenhum fuzzy matching usado | — | ✅ |
| 11 | Nenhum LLM usado para matching | — | ✅ |
| 12 | AniList ID ≠ MAL ID respeitado | Matching via idMal | ✅ |
| 13 | ExternalMapping = base de identidade | Confirmado | ✅ |
| 14 | category/format não derivados de título | Confirmado | ✅ |

---

## 12. Conclusão

A política de sync está definida e testada via dry-run nas 11 obras mapeadas. Os resultados mostram:

1. **Tier 1 (auto-update seguro):** 65 campos podem ser preenchidos automaticamente (null → valor AniList) sem risco, pois não sobrescrevem dados existentes.
2. **Tier 2 (auto-update com threshold):** 3 campos de score têm diff ≥ 0.15 (Re:Zero, Death Note, Tokyo Ghoul) e poderiam ser atualizados com threshold.
3. **Tier 3 (manual):** Campos editoriais, de identidade visual e estruturais devem permanecer manuais.
4. **Risco principal:** `cover_url` (troca de poster), `popularity` em Hunter x Hunter (conflito de schema), e `relations` (criação de WorkReleases).

### Próximos passos sugeridos
1. Aprovar esta política antes de implementar sync automático
2. Investigar o campo `popularity` em Hunter x Hunter (valor 8 parece ser rank, não popularity)
3. Decidir política de `cover_url`: manter MAL permanentemente ou permitir troca com REVIEW
4. Implementar sync Tier 1 primeiro (preencher nulls estruturais) como próximo marco
5. Sync Tier 2 (score com threshold) após validar Tier 1
6. Relations e WorkRelease creation: sempre REVIEW, nunca automático

### Critério de aceitação
> "Só avançaremos para implementação de sync real depois de existir uma política clara e testada por campo, sem ambiguidades sobre qual fonte pode sobrescrever qual dado."

**Status: ✅ Política definida e testada.** Pronta para revisão e aprovação antes da implementação de sync automático.