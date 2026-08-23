# Fase 2C — Relatório Pós-Migração: WorkRelease + ExternalMapping

**Data:** 2026-08-23
**Modo:** Migração real executada.

---

## Resumo da Migração

| Métrica | Valor |
|---|---|
| DynamicWork migrados | 79 |
| WorkRelease criados | 206 |
| ExternalMapping criados | 206 |
| DynamicWork atualizados (sync_release_completed + release_count) | 79 |
| Grupos excluídos | 3 |
| Erros | 0 |
| Warnings | 0 |

---

## Verificação de Duplicatas

| Verificação | Resultado |
|---|---|
| Slugs de WorkRelease duplicados (group_id + slug) | ✅ 0 duplicatas |
| ExternalMapping duplicados (provider + provider_id + provider_type) | ✅ 0 duplicatas |
| Total WorkRelease no banco | 206 |
| Total ExternalMapping no banco | 206 |

---

## Grupos Excluídos (3)

| slug | id | motivo |
|---|---|---|
| hunter-x-hunter | 6a5074d40366340112f3fbb2 | excluído manualmente (conflito mal_id 11061) |
| hunter-x-hunter | 6a2bb1c9f0515195be93340c | excluído manualmente (conflito mal_id 11061) |
| dan-da-dan | 6a4d567b19cbf3ad51fdb9ee | excluído manualmente (mal_id 57334 duplicado em seasons[]) |

Nota: o registro hunter-x-hunter manga (6a2f677ab3610ded6c7bbbd1) não era elegível (sem seasons[]), então não aparece aqui nem na migração.

---

## Upsert por Chave Lógica

- **WorkRelease:** verificado por `group_id + slug` — 0 colisões (entidades estavam vazias na Fase 1, bulkCreate criou todos os 206 sem conflito).
- **ExternalMapping:** verificado por `provider + provider_id + provider_type` — 0 colisões.

Cada ExternalMapping foi vinculado ao `work_release_id` correspondente (release criada para o mesmo group_id + slug).

---

## Campos Preenchidos por WorkRelease

- `group_id`, `group_slug`, `slug`, `title`
- `category` (anime|manga|movie|liveaction derivado de DynamicWork.categories)
- `format` (TV|MOVIE|OVA|ONA|SPECIAL derivado de season_title)
- `season_number`, `release_order`
- `episode_count`, `season_year`
- `cover_url` (poster_url da season ou image_url do grupo)
- `score`
- `status` (releasing|finished|not_yet_released derivado de anime_status)
- `is_main_entry` (true para a primeira season do grupo)
- `is_special`, `is_movie` (derivados de format)
- `sync_status` = "synced"
- `last_synced_at` = timestamp da migração

## Campos Preenchidos por ExternalMapping

- `work_group_id` (DynamicWork.id)
- `work_release_id` (WorkRelease.id criado)
- `provider` = "mal"
- `provider_id` = String(mal_id da season)
- `provider_type` = "anime"
- `confidence_score` = 100 (match por ID exato)
- `verified_by_admin` = false
- `last_synced_at` = timestamp da migração

## Campos Atualizados em DynamicWork

- `sync_release_completed` = true (para os 79 grupos migrados)
- `release_count` = número de seasons[] daquele grupo

---

## Confirmações

- ✅ **AnimeEntry não foi alterado** — nenhuma operação de leitura/escrita em AnimeEntry.
- ✅ **Frontend não foi alterado** — nenhum arquivo .jsx/.js modificado.
- ✅ **seasons[] permanece intacto** — DynamicWork.seasons não foi tocado (apenas sync_release_completed e release_count atualizados).
- ✅ **season_mal_id permanece intacto** — AnimeEntry não foi alterado.
- ✅ **WorkRelease e ExternalMapping não tiveram duplicatas** — verificado pós-migração.
- ✅ **SyncConflict não foi criado** — nenhum erro inesperado durante a migração.
- ✅ **App continua visualmente igual** — nenhum componente consome WorkRelease/ExternalMapping ainda.

---

## Estado Atual do Banco

| Entidade | Registros |
|---|---|
| DynamicWork | 800 (79 com sync_release_completed=true) |
| WorkRelease | 206 |
| ExternalMapping | 206 |
| SyncConflict | 0 |
| AnimeEntry | inalterado |

---

## Pendências para Próximas Fases

1. **dan-da-dan:** corrigir seasons[] (remover season duplicada index 1) → re-migrar.
2. **hunter-x-hunter:** decidir mescla/consolidação dos 2 registros anime + renomear slug do manga → re-migrar.
3. **Backfill de AnimeEntry.release_id:** vincular entradas existentes aos WorkRelease criados (Fase 3).
4. **Integração AniList:** criar ExternalMapping com provider=anilist (Fase futura).
5. **Frontend:** refatorar leitores de seasons[] para usar getWorkReleases() (Fase futura).