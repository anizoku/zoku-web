# Legacy / Tech Debt — Consolidado

**Data:** 2026-09-07
**Status:** Documentação de itens pendentes. Nenhuma correção executada nesta fase.

---

## 1. CATÁLOGO

### 1.1 DynamicWork sem WorkRelease

| Métrica | Valor |
|---------|-------|
| Total DynamicWork | 797 |
| Com WorkRelease | 83 |
| **Sem WorkRelease** | **714** |

**Impacto:** 714 obras não têm estrutura canônica de temporadas. Usam `seasons[]` legado (JSON string) ou não têm releases mapeados.

**Ação futura:** Migrar 714 DynamicWork para WorkRelease (criar releases a partir de `seasons[]` ou criar release único para obras standalone).

### 1.2 AnimeEntry sem release_id

| Métrica | Valor |
|---------|-------|
| Total AnimeEntry | 127 |
| Com release_id | 17 |
| **Sem release_id** | **110** |

**Impacto:** 110 entradas de progresso usam `season_mal_id` (fallback legado) em vez de `release_id` (canônico).

**Ação futura:** Backfill de `release_id` para 110 AnimeEntry restantes (matching por season_mal_id → WorkRelease.mal_id ou title matching).

### 1.3 Legacy seasons[]

**Problema:** `DynamicWork.seasons` é um JSON string contendo array de temporadas. Este formato é legado e foi substituído por WorkRelease canônico.

**Estados possíveis:**
- DynamicWork com `sync_release_completed=true` (83): seasons[] já migrado para WorkRelease.
- DynamicWork com `sync_release_completed=false` (714): seasons[] ainda é fonte de verdade.

**Ação futura:** Para cada um dos 714 DynamicWork:
1. Parsear `seasons[]`.
2. Criar WorkRelease para cada temporada.
3. Criar ExternalMapping (mal) para cada WorkRelease.
4. Marcar `sync_release_completed=true`.

### 1.4 Duplicidades de slug conhecidas

**Problema:** ~100 instâncias de colisão de slug no catálogo global (WorkRelease.slug).

**Causa:** Regra de geração de slug colide quando títulos de temporada se repetem.

**Impacto:** Non-blocking (catálogo funciona com dedup em runtime), mas impede uso de slug como chave única estrita no Postgres.

**Ação futura:** Resolver colisões antes de criar constraint `UNIQUE(slug)` no Supabase. Opções:
- Sufixar slugs duplicados com season_year ou season_number.
- Ou usar `slug + group_id` como chave composta única.

### 1.5 Relações entre releases

**Problema:** WorkRelease tem `release_order` e `display_order` mas não há relação explícita entre releases da mesma franquia além de `group_id`.

**Ação futura:** Avaliar necessidade de campo `parent_release_id` para sequências (ex: Season 2 continua de Season 1).

---

## 2. SINCRONIZAÇÃO

### 2.1 MAL/Jikan — UPSTREAM_UNSTABLE

| Status | Detalhe |
|--------|---------|
| Provider | MAL/Jikan |
| Classificação | UPSTREAM_UNSTABLE |
| 429 sustentado em batch | 3/11 releases falharam |
| 5xx sustentado em request isolada | Re:Zero (MAL 31240) falhou após 5 retries |
| Backend preservado | ✅ malCatalogSync intacto |
| dry_run=false executado | ❌ Nunca |
| Proxy/bypass tentado | ❌ Nunca (não tentar) |

**Ação futura:** Reativar quando upstream estabilizar. Não há ETA. Arquitetura está pronta.

### 2.2 AniList — BLOCKED_UPSTREAM

| Status | Detalhe |
|--------|---------|
| Provider | AniList GraphQL |
| Classificação | BLOCKED_UPSTREAM (403 Manually blocked) |
| Backend preservado | ✅ anilistCatalogSync intacto |
| Causa | IP do datacenter Base44 bloqueado pelo AniList |
| User-Agent testado | Sem efeito |
| Proxy/bypass tentado | ❌ Nunca (não tentar) |

**Ação futura:** Reativar quando migrar para infraestrutura não-bloqueada (Supabase Edge Functions podem ter IPs diferentes). Não há garantia.

### 2.3 TMDB — não implementado como sync novo

**Status:** TMDB é usado apenas no frontend (`src/lib/tmdb.js`, `src/lib/tmdbTrending.js`) para enriquecimento de posters e trending. Não há backend function `tmdbCatalogSync`.

**Ação futura:** Implementar `tmdbCatalogSync` seguindo a mesma arquitetura de anilistCatalogSync/malCatalogSync. TMDB API key já existe (`TMDB_READ_ACCESS_TOKEN`).

### 2.4 Sync incremental / scheduler

**Status atual:** Sync é manual (invocado via Admin panel). Não há scheduler automático.

**Ação futura:** Implementar sync incremental (apenas releases com `last_synced_at` antigo ou `sync_status='pending'`). Usar Supabase Scheduled Functions (pg_cron) ou cron externo.

### 2.5 Reviews pendentes

**Status:** 0 reviews pendentes no último audit (SyncLog com classification=REVIEW_REQUIRED = 0). Mas a policy tem `reviewOnDiff` para `season_year` que pode gerar reviews em futuros syncs.

**Ação futura:** Criar UI de admin para revisar e aprovar/rejeitar reviews pendentes.

### 2.6 Observability / rollback

**Status atual:**
- SyncRun e SyncLog fornecem observabilidade básica.
- Não há mecanismo de rollback automático (apenas dry_run previne writes).
- Não há alertas de falha.

**Ação futura:**
- Dashboard de sync (visualizar SyncRun, SyncLog, SyncConflict).
- Alertas de falha (email/webhook quando SyncRun status=failed).
- Snapshot de entidade antes de write (para rollback manual).

---

## 3. DADOS

### 3.1 ExternalMapping por provider

| Provider | Quantidade | Cobertura |
|----------|-----------|-----------|
| mal | 214 | 100% dos WorkRelease (214/214) |
| anilist | 11 | 5% dos WorkRelease |
| tmdb | 0 | 0% |
| thetvdb | 0 | 0% |

**Ação futura:** Aumentar cobertura de AniList (atualmente só 11 mappings). Implementar TMDB e TVDB mappings.

### 3.2 ExternalMapping por tipo

| Tipo | Quantidade |
|------|-----------|
| anime | 224 |
| manga | 1 |

**Ação futura:** Aumentar cobertura de manga (apenas 1 mapping).

### 3.3 AnimeEntry por status

| Status | Quantidade |
|--------|-----------|
| completed | 93 |
| watching | 20 |
| on_hold | 8 |
| dropped | 3 |
| reading | 2 |
| planned | 1 |

**Observação:** 93/127 = 73% completed. Distribuição saudável.

### 3.4 AnimeEntry por tipo

| Tipo | Quantidade |
|------|-----------|
| anime | 119 |
| manga | 6 |
| liveaction | 2 |

**Observação:** Predominância de anime (94%). Manga e live-action sub-representados.

---

## 4. ARQUITETURA

### 4.1 Frontend usa catálogo estático + DB

**Problema:** `src/lib/catalog.js` contém catálogo hardcoded que é mesclado com DynamicWork em runtime (CatalogContext).

**Impacto:** Dupla fonte de verdade. Catálogo estático pode ficar desatualizado.

**Ação futura:** Migrar todo catálogo estático para DynamicWork (DB como única fonte). Depreciar `catalog.js`.

### 4.2 CatalogSync legado

**Problema:** `CatalogSync` entity é um sync legado por slug (pré-WorkRelease). Coexiste com WorkRelease/ExternalMapping.

**Ação futura:** Avaliar depreciação do CatalogSync após migração completa para WorkRelease.

### 4.3 MediaWork legado

**Problema:** `MediaWork` entity existe mas parece não ser usada ativamente (catálogo usa DynamicWork).

**Ação futura:** Confirmar uso. Se não usado, depreciar.

### 4.4 Ranking é RLS-bound

**Problema:** Ranking reflete atividade individual do usuário (RLS-bound) em vez de agregado global da comunidade.

**Ação futura:** Criar view/materialized view de ranking global (sem RLS) ou tabela denormalizada de ranking.

### 4.5 HeroCarousel sem fallback

**Problema:** HeroCarousel não tem fallback se nenhuma obra estiver marcada como 'trending'.

**Ação futura:** Adicionar fallback (top obras por score ou popularity se `is_trending` vazio).

### 4.6 Slug de News não regenera em title edit

**Problema:** Slug da notícia é gerado na criação mas não regenerado quando o título é editado.

**Ação futura:** Regenerar slug em title edit (ou manter slug original para preservar URLs).

### 4.7 Slug de WorkRelease colide com season title repeat

**Problema:** Regra de geração de slug colide quando títulos de temporada se repetem (ver 1.4).

---

## 5. PRIORIZAÇÃO PÓS-MIGRAÇÃO

| Prioridade | Item | Esforço |
|-----------|------|---------|
| P0 | Migrar 714 DynamicWork para WorkRelease | Alto |
| P0 | Backfill release_id em 110 AnimeEntry | Médio |
| P1 | Resolver colisões de slug (WorkRelease) | Médio |
| P1 | Implementar TMDB sync | Médio |
| P1 | Sync incremental / scheduler | Médio |
| P2 | Reativar MAL/Jikan (quando upstream estabilizar) | Baixo (já pronto) |
| P2 | Reativar AniList (quando IP desbloqueado) | Baixo (já pronto) |
| P2 | Dashboard de sync (observability) | Médio |
| P2 | Depreciar catalog.js (catálogo estático) | Alto |
| P3 | Depreciar CatalogSync legado | Baixo |
| P3 | Depreciar MediaWork | Baixo |
| P3 | Ranking global (materialized view) | Médio |
| P3 | HeroCarousel fallback | Baixo |
| P3 | Slug de News regenera em edit | Baixo |