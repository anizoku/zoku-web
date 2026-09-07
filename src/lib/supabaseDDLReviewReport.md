# Supabase DDL Review Report

**Data:** 2026-09-07
**Fase:** 1 — Geração e validação do schema SQL
**Status:** DDL gerado, NÃO executado. Aguardando revisão manual.

---

## RESUMO EXECUTIVO

O DDL completo foi gerado em `supabase/migrations/0001_initial_schema.sql` com 3 arquivos complementares. O schema segue o princípio **PRESERVAÇÃO > NORMALIZAÇÃO**: reproduz o estado atual do AniZoku com mínima transformação, preservando IDs como TEXT, campos legacy, e adiando normalizações maiores.

### GO / NO-GO

### ✅ **GO** — DDL pronto para aplicação manual no Supabase

O schema está completo, validado contra os schemas Base44, e segue todas as restrições da fase de validação pré-migração. Nenhum bloqueador crítico encontrado.

---

## 1. ARQUIVOS CRIADOS

| Arquivo | Descrição | Linhas (estimado) |
|---------|-----------|-------------------|
| `supabase/migrations/0001_initial_schema.sql` | DDL completo (tabelas, FKs, índices, RLS, triggers) | ~700 |
| `supabase/migrations/0001_validation_queries.sql` | Queries de verificação pós-aplicação | ~250 |
| `supabase/migrations/0001_rollback.sql` | Rollback seguro em ordem reversa | ~150 |
| `src/lib/supabaseDDLReviewReport.md` | Este relatório | — |

---

## 2. TABELAS CRIADAS (34 total)

### Catálogo (7 tabelas)

| Tabela | Origem | PK | Registros esperados |
|--------|--------|-----|---------------------|
| dynamic_works | DynamicWork | TEXT | 797 |
| work_releases | WorkRelease | TEXT | 214 |
| external_mappings | ExternalMapping | TEXT | 225 |
| catalog_sync | CatalogSync | TEXT | 495 |
| card_overrides | CardOverride | TEXT | 89 |
| work_category_visibility | WorkCategoryVisibility | TEXT | 23 |
| media_works | MediaWork | TEXT | 0 |

### Usuário e Progresso (5 tabelas)

| Tabela | Origem | PK | Registros esperados |
|--------|--------|-----|---------------------|
| user_profiles | UserProfile | TEXT | 12 |
| anime_entries | AnimeEntry | TEXT | 127 |
| achievements | Achievement | TEXT | 74 |
| user_achievements | UserAchievement | TEXT | 456 |
| xp_events | XpEvent | TEXT | 152 |

### Sincronização (3 tabelas)

| Tabela | Origem | PK | Registros esperados |
|--------|--------|-----|---------------------|
| sync_runs | SyncRun | TEXT | 5 |
| sync_logs | SyncLog | TEXT | 27 |
| sync_conflicts | SyncConflict | TEXT | 0 |

### Social (11 tabelas)

| Tabela | Origem | PK | Registros esperados |
|--------|--------|-----|---------------------|
| friendships | Friendship | TEXT | 12 |
| posts | Post | TEXT | 5 |
| comments | Comment | TEXT | 4 |
| communities | Community | TEXT | 8 |
| social_events | SocialEvent | TEXT | 3 |
| event_comments | EventComment | TEXT | 4 |
| watch_togethers | WatchTogether | TEXT | 3 |
| direct_messages | DirectMessage | TEXT | 35 |
| notifications | Notification | TEXT | 893 |
| activity_feed | ActivityFeed | TEXT | 12 |
| debates | Debate | TEXT | 4 |

### CMS / Admin (7 tabelas)

| Tabela | Origem | PK | Registros esperados |
|--------|--------|-----|---------------------|
| news | News | TEXT | 9 |
| fan_art | FanArt | TEXT | 2 |
| platform_banners | PlatformBanner | TEXT | 0 |
| login_background_images | LoginBackgroundImage | TEXT | 0 |
| site_config | SiteConfig | TEXT | 1 |
| work_suggestions | WorkSuggestion | TEXT | 0 |
| content_reports | ContentReport | TEXT | 0 |

### Auxiliares (3 tabelas)

| Tabela | PK | Propósito |
|--------|-----|-----------|
| user_roles | UUID (user_id) | Mapeia user_id → role ('admin'/'user') |
| id_mapping | TEXT (base44_id, entity_type) | Traduz ObjectId → UUID do Supabase Auth |
| url_mapping | TEXT (base44_url) | Rastreia URLs Base44 Storage → Supabase Storage |

---

## 3. FOREIGN KEYS (25 total)

### Entre entidades migradas (TEXT FKs) — 5 FKs

| FK | Child → Parent | ON DELETE | Justificativa |
|----|---------------|-----------|---------------|
| fk_wr_group | work_releases → dynamic_works | CASCADE | Release não existe sem grupo |
| fk_em_group | external_mappings → dynamic_works | SET NULL | Mapping pode sobreviver sem grupo |
| fk_em_release | external_mappings → work_releases | SET NULL | Mapping pode sobreviver sem release |
| fk_ae_release | anime_entries → work_releases | SET NULL | Entry preserva progresso mesmo sem release |
| fk_sl_run | sync_logs → sync_runs (run_id) | CASCADE | Log não existe sem run |

### Social (TEXT FKs) — 4 FKs

| FK | Child → Parent | ON DELETE | Justificativa |
|----|---------------|-----------|---------------|
| fk_p_community | posts → communities | SET NULL | Post sobrevive se comunidade deletada |
| fk_c_post | comments → posts | CASCADE | Comentário não existe sem post |
| fk_c_parent | comments → comments | CASCADE | Reply não existe sem parent |
| fk_ec_event | event_comments → social_events | CASCADE | Comentário não existe sem evento |

### Para auth.users (UUID FKs, nullable) — 16 FKs

| FK | Tabela | Campo | ON DELETE |
|----|--------|-------|-----------|
| fk_up_user | user_profiles | user_id | SET NULL |
| fk_ae_user | anime_entries | user_id | SET NULL |
| fk_ua_user | user_achievements | user_id | SET NULL |
| fk_xe_user | xp_events | user_id | SET NULL |
| fk_f_requester | friendships | requester_id | SET NULL |
| fk_f_receiver | friendships | receiver_id | SET NULL |
| fk_p_author | posts | created_by | SET NULL |
| fk_c_author | comments | created_by | SET NULL |
| fk_com_creator | communities | creator_id | SET NULL |
| fk_se_organizer | social_events | organizer_id | SET NULL |
| fk_ec_author | event_comments | author_id | SET NULL |
| fk_wt_initiator | watch_togethers | initiator_id | SET NULL |
| fk_wt_friend | watch_togethers | friend_id | SET NULL |
| fk_dm_sender | direct_messages | sender_id | SET NULL |
| fk_dm_receiver | direct_messages | receiver_id | SET NULL |
| fk_n_recipient | notifications | recipient_id | SET NULL |
| fk_af_actor | activity_feed | actor_id | SET NULL |
| fk_af_target | activity_feed | target_id | SET NULL |
| fk_ws_suggested_by | work_suggestions | suggested_by_id | SET NULL |
| fk_cr_reported_by | content_reports | reported_by_id | SET NULL |

### Decisões de CASCADE

| FK | CASCADE? | Justificativa |
|----|----------|---------------|
| fk_wr_group | ✅ Sim | Release é child direto de group; apagar group → apagar releases |
| fk_sl_run | ✅ Sim | Log é child direto de run; apagar run → apagar logs |
| fk_c_post | ✅ Sim | Comentário é child direto de post |
| fk_c_parent | ✅ Sim | Reply é child direto de parent |
| fk_ec_event | ✅ Sim | Comentário é child direto de evento |
| Todas as demais | ❌ Não | SET NULL ou nenhuma — preserva dados sociais/históricos |

---

## 4. ÍNDICES (48 total)

### Catálogo
- `idx_wr_group_id` — work_releases.group_id
- `idx_em_release_id`, `idx_em_group_id`, `idx_em_provider` — external_mappings
- `idx_cs_slug` — catalog_sync
- `idx_co_card_slug` — card_overrides
- `idx_wcv_work_slug` — work_category_visibility
- `idx_dw_franchise_id`, `idx_dw_mal_id`, `idx_dw_is_trending`, `idx_dw_created_date` — dynamic_works
- `idx_wr_slug`, `idx_wr_group_slug` — work_releases

### Usuário e Progresso
- `idx_ae_user_id`, `idx_ae_user_email`, `idx_ae_release_id` — anime_entries
- `idx_up_user_email`, `idx_up_user_id` — user_profiles
- `idx_ua_user_email`, `idx_ua_user_id`, `idx_ua_achievement_key` — user_achievements
- `idx_xe_user_email`, `idx_xe_user_id`, `idx_xe_event_date` — xp_events

### Social
- `idx_p_community_id`, `idx_p_created_by`, `idx_p_created_by_uuid`, `idx_p_created_date` — posts
- `idx_c_post_id`, `idx_c_parent_id`, `idx_c_created_by` — comments
- `idx_com_creator_email`, `idx_com_creator_id` — communities
- `idx_se_organizer_email`, `idx_se_organizer_id`, `idx_se_event_date` — social_events
- `idx_ec_event_id`, `idx_ec_author_email` — event_comments
- `idx_wt_initiator_email`, `idx_wt_friend_email` — watch_togethers
- `idx_dm_sender_email`, `idx_dm_receiver_email` — direct_messages
- `idx_n_recipient_email`, `idx_n_recipient_id`, `idx_n_is_read` — notifications
- `idx_af_actor_email`, `idx_af_target_email` — activity_feed

### Sync
- `idx_sl_run_id`, `idx_sl_release_id` — sync_logs

### CMS / Admin
- `idx_news_slug`, `idx_news_status`, `idx_news_published_at` — news
- `idx_ws_suggested_by_email`, `idx_ws_status` — work_suggestions
- `idx_cr_reported_by_email`, `idx_cr_status` — content_reports

### Auxiliares
- `idx_im_base44_id`, `idx_im_supabase_id`, `idx_im_email` — id_mapping

---

## 5. RLS POLICIES (~80 total)

### Padrões aplicados

| Padrão Base44 | Implementação Supabase |
|---------------|----------------------|
| `read: {}` (público) | `USING (true)` |
| `read: {"user_condition": {"role": "admin"}}` | `USING (is_admin())` |
| `read: {"data.user_email": "{{user.email}}"}` | `USING (user_email = current_user_email())` |
| `read: {"$or": [...]}` | `USING (cond1 OR cond2 OR ...)` |
| `create: {"created_by": "{{user.email}}"}` | `WITH CHECK (is_owner(created_by_id))` |
| `read: {"data.visibility": "public"}` | `USING (visibility = 'public')` |
| `read: {"data.status": "publicado"}` | `USING (status = 'publicado')` |

### Helper functions

| Função | Propósito |
|--------|-----------|
| `is_admin()` | Verifica se `auth.uid()` tem role 'admin' em `user_roles` |
| `is_owner(base44_id)` | Verifica se um ObjectId pertence ao usuário atual via `id_mapping` |
| `current_user_email()` | Retorna `auth.jwt() ->> 'email'` |
| `set_updated_date()` | Trigger function para auto-updated_date |

### Estratégia de transição

- **Campos `*_email` legados** usados em RLS quando disponíveis (compatibilidade imediata)
- **`is_owner(created_by_id)`** usado para entidades sem campo email (via `id_mapping`)
- **`auth.uid() = *_id`** (UUID) disponível mas nullable — não quebra fluxos quando vazio
- RLS não exige que novos UUIDs estejam preenchidos — usa OR com email/id_mapping

---

## 6. CAMPOS LEGACY PRESERVADOS

### Campos de identidade (preservados, não removidos)

| Campo | Tabela | Tipo | Propósito |
|-------|--------|------|-----------|
| `created_by_id` | todas | TEXT | ObjectId legado do criador |
| `created_by` | todas | UUID (nullable) | Novo FK para auth.users |
| `user_email` | user_profiles, user_achievements, xp_events | TEXT | Email legado |
| `user_id` | user_profiles, anime_entries, etc | UUID (nullable) | Novo FK para auth.users |
| `requester_email`, `receiver_email` | friendships | TEXT | Emails legados |
| `sender_email`, `receiver_email` | direct_messages | TEXT | Emails legados |
| `recipient_email`, `from_email` | notifications | TEXT | Emails legados |
| `actor_email`, `target_email` | activity_feed | TEXT | Emails legados |
| `organizer_email` | social_events | TEXT | Email legado |
| `creator_email` | communities | TEXT | Email legado |
| `author_email` | event_comments | TEXT | Email legado |
| `initiator_email`, `friend_email` | watch_togethers | TEXT | Emails legados |
| `suggested_by_email` | work_suggestions | TEXT | Email legado |
| `reported_by_email`, `author_email` | content_reports | TEXT | Emails legados |
| `members` | communities | text[] | Array de emails legado |
| `participants` | social_events | text[] | Array de emails legado |
| `liked_by` | posts, comments | text[] | Array de emails legado |

### Campos de dados legacy (preservados para compatibilidade do frontend)

| Campo | Tabela | Tipo | Nota |
|-------|--------|------|------|
| `seasons` | dynamic_works | jsonb | JSON array legacy (frontend ainda usa) |
| `categories` | dynamic_works | jsonb | JSON array serializado |
| `genres` | dynamic_works | jsonb | JSON array serializado |
| `duration` | dynamic_works | TEXT | String legacy ('24 min/ep') |
| `processed_release_ids` | sync_runs | TEXT | JSON array (preservar como TEXT) |
| `errors` | sync_runs | TEXT | JSON array |
| `summary` | sync_runs | TEXT | JSON object |
| `proposed_fields`, `written_fields`, `reviews`, `ignored`, `dw_updates` | sync_logs | TEXT | JSON (preservar como TEXT) |
| `created_at`, `reviewed_at` | work_suggestions, content_reports | TEXT | String timestamp legacy |
| `author_id` | news | TEXT | Snapshot legado (não é auth.users) |
| `author_name` | news, posts, comments | TEXT | Snapshot legado |
| `author_avatar`, `author_level` | posts | TEXT/INTEGER | Snapshot legado |

---

## 7. DECISÕES IMPORTANTES DE TIPO

### TEXT vs UUID

| Decisão | Justificativa |
|---------|---------------|
| PKs = TEXT | IDs Base44 são ObjectId (24-char hex), não UUID |
| FKs entre entidades = TEXT | Preservar ObjectIds sem conversão |
| FKs para auth.users = UUID | auth.users.id é UUID nativo do Supabase |
| `created_by_id` = TEXT | Preservar ObjectId legado |
| `created_by` = UUID nullable | Novo campo, preenchido via id_mapping |

### JSON strings → jsonb

| Campo | Tabela | Decisão | Justificativa |
|-------|--------|---------|---------------|
| `categories` | dynamic_works | jsonb | JSON array claramente válido |
| `genres` | dynamic_works | jsonb | JSON array claramente válido |
| `seasons` | dynamic_works | jsonb | JSON array claramente válido |
| `avatar_crop` | user_profiles | jsonb | Objeto com scale/offsetX/offsetY |
| `banner_crop` | user_profiles | jsonb | Objeto com scale/offsetX/offsetY |
| `links` | user_profiles | jsonb | Objeto com twitter/instagram/website |
| `sources` | news | jsonb | Array de {name, url} |
| `original_snapshot` | card_overrides | jsonb | Objeto snapshot |

### JSON strings mantidos como TEXT (compatibilidade)

| Campo | Tabela | Decisão | Justificativa |
|-------|--------|---------|---------------|
| `processed_release_ids` | sync_runs | TEXT | JSON array grande, frontend pode ler como string |
| `errors` | sync_runs | TEXT | JSON array |
| `summary` | sync_runs | TEXT | JSON object |
| `proposed_fields` | sync_logs | TEXT | JSON array |
| `written_fields` | sync_logs | TEXT | JSON array |
| `reviews` | sync_logs | TEXT | JSON array |
| `ignored` | sync_logs | TEXT | JSON array |
| `dw_updates` | sync_logs | TEXT | JSON array |

### Arrays → text[]

| Campo | Tabela | Decisão |
|-------|--------|---------|
| `tags` | communities, debates | text[] |
| `members` | communities | text[] (emails) |
| `participants`, `participants_names` | social_events | text[] (emails) |
| `liked_by` | posts, comments | text[] (emails) |
| `favorite_animes`, `favorite_mangas` | user_profiles | text[] (slugs) |
| `genres` | media_works | text[] |

### ENUMs (24 tipos)

Usados apenas para campos com valores fixos e estáveis. Campos com valores abertos (ex: `format` em WorkRelease, `anime_status`/`manga_status` em DynamicWork com strings PT-BR) permanecem como TEXT.

---

## 8. DIFERENÇAS ENTRE BASE44 E SUPABASE

| Aspecto | Base44 | Supabase |
|---------|--------|---------|
| IDs | MongoDB ObjectId (24-char hex) | TEXT (preservado) |
| Auth | Base44 Auth (tokens/sessions) | Supabase Auth (auth.users UUID) |
| RLS | JSON-based (`"created_by": "{{user.email}}"`) | SQL policies (`is_admin()`, `is_owner()`, `current_user_email()`) |
| Storage | `base44.app/api/apps/.../files/...` | Supabase Storage buckets |
| Backend functions | `base44/functions/*/entry.ts` | Supabase Edge Functions (fase posterior) |
| Realtime | Built-in subscriptions | Supabase Realtime (fase posterior) |
| JSON arrays | Stored as JSON strings | jsonb (onde seguro) ou TEXT (onde compatibilidade é crítica) |
| Email arrays | Native arrays | text[] |
| `created_by_id` | Built-in, ObjectId | TEXT (preservado) + `created_by` UUID (novo) |

---

## 9. RISCOS AINDA EXISTENTES

### Risco 1: `is_owner()` depende de `id_mapping` preenchida (MÉDIO)

**Problema:** RLS policies que usam `is_owner(created_by_id)` não funcionam até que `id_mapping` seja populada durante a importação de usuários.

**Impacto:** Após aplicar DDL mas antes de importar dados, usuários não podem criar/editar registros (RLS bloqueia).

**Mitigação:** Popular `id_mapping` e `user_roles` ANTES de importar dados de entidades. Ou desabilitar RLS temporariamente durante importação (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`).

### Risco 2: 714 DynamicWork sem WorkRelease (ALTO)

**Problema:** 714 das 797 DynamicWork não têm WorkRelease correspondente. O frontend resolve releases via `seasons[]` legacy para essas obras.

**Impacto:** Funcionalidade de releases funciona apenas para 83 obras após migração.

**Mitigação:** Preservar `seasons[]` como jsonb em `dynamic_works`. Frontend continua usando `seasons[]` para obras sem WorkRelease. Backfill de WorkRelease é tarefa pós-migração.

### Risco 3: 102 grupos de slug duplicado em DynamicWork (MÉDIO)

**Problema:** `dynamic_works.slug` tem 102 grupos duplicados (205 registros). Não é possível criar `UNIQUE(slug)`.

**Impacto:** Queries por slug podem retornar múltiplos registros. Frontend já lida com isso via `deduplicateCatalog()` no CatalogContext.

**Mitigação:** NÃO criar `UNIQUE(dynamic_works.slug)`. Resolver duplicatas em fase de normalização posterior (não na primeira migração).

### Risco 4: 110 AnimeEntry sem release_id (MÉDIO)

**Problema:** 110 dos 127 AnimeEntry têm `release_id = null`.

**Impacto:** Progresso do usuário não está vinculado a WorkRelease canônica.

**Mitigação:** `release_id` é nullable no schema. Backfill é tarefa pós-migração. Frontend usa `season_mal_id` como fallback.

### Risco 5: 57 URLs Base44 Storage precisam migração (BAIXO)

**Problema:** 57 URLs em 5 entidades apontam para `base44.app/api/apps/.../files/...`. Essas URLs deixarão de funcionar quando o app Base44 for desativado.

**Impacto:** Avatares, banners, logos, imagens de notícias e fan art ficam quebrados.

**Mitigação:** Migrar URLs ANTES de desativar o Base44. Baixar → uploadar para Supabase Storage → atualizar URLs via `url_mapping`.

### Risco 6: Recriação de 15 usuários no Supabase Auth (CRÍTICO)

**Problema:** Senhas e tokens OAuth não são portáveis do Base44. Usuários precisam redefinir senha.

**Impacto:** Usuários existentes recebem email de setup de senha. Sessões ativas são perdidas.

**Mitigação:** Comunicar aos usuários antes da migração. Usar `createUser({ email })` sem senha (Supabase envia link mágico).

### Risco 7: `notifications` insert policy pode bloquear criação system (BAIXO)

**Problema:** A policy `n_insert` usa `WITH CHECK (recipient_email = current_user_email() OR created_by_id IS NOT NULL)`. Notificações criadas pelo sistema (sem usuário autenticado) podem falhar.

**Mitigação:** Notificações do sistema devem ser criadas via service role (bypass RLS). A condição `created_by_id IS NOT NULL` permite criação quando há um criador identificado.

---

## 10. AMBIGUIDADES ENCONTRADAS

### Ambiguidade 1: `provider_type` em ExternalMapping

**Problema:** O campo `provider_type` no schema Base44 é uma string livre (não enum), mas o nome colide com o enum `provider_type` criado para `provider`.

**Resolução:** O campo foi nomeado `provider_type_field` na tabela `external_mappings` para evitar colisão com o tipo ENUM. Documentar para normalização posterior (renomear de volta quando possível).

### Ambiguidade 2: `created_at` vs `created_date` em WorkSuggestion e ContentReport

**Problema:** WorkSuggestion e ContentReport têm `created_at` (string timestamp legacy) além do built-in `created_date`.

**Resolução:** Ambos preservados. `created_date` (TIMESTAMPTZ) é o built-in. `created_at` (TEXT) é o legacy string. Frontend pode usar qualquer um. Normalizar em fase posterior.

### Ambiguidade 3: `author_id` em News

**Problema:** `author_id` em News é descrito como "ID do usuário (entidade User) que criou a notícia" mas é um ObjectId, não UUID de auth.users.

**Resolução:** Preservado como TEXT (snapshot legado). NÃO criar FK para auth.users. `author_name` também preservado como snapshot. O link canônico é via `created_by_id` (TEXT) + `created_by` (UUID nullable).

### Ambiguidade 4: `order` em FanArt, PlatformBanner, LoginBackgroundImage

**Problema:** `order` é palavra reservada em SQL.

**Resolução:** Usado com aspas duplas `"order"` no DDL. Funcional mas requer aspas em todas as queries. Considerar renomear para `sort_order` em fase de normalização.

### Ambiguidade 5: RLS para `notifications` insert

**Problema:** Notificações podem ser criadas pelo sistema (em nome de outro usuário) ou por usuários (ex: friend request). A policy precisa permitir ambos.

**Resolução:** `WITH CHECK (recipient_email = current_user_email() OR created_by_id IS NOT NULL)` — permite criação quando o destinatário é o próprio usuário OU quando há um criador identificado. Notificações do sistema via service role bypassam RLS.

---

## 11. CHECK AUTOMÁTICO — RESULTADOS

| Verificação | Status | Detalhe |
|-------------|--------|---------|
| UUID incorreto para IDs Base44? | ✅ Nenhum encontrado | Todas as PKs são TEXT |
| UNIQUE(dynamic_works.slug) acidental? | ✅ Não existe | Apenas UNIQUE(work_releases.slug) |
| FKs com tipo incompatível? | ✅ Nenhuma | TEXT→TEXT, UUID→UUID |
| NOT NULL que quebra importação? | ✅ Nenhum | Apenas PKs são NOT NULL |
| CASCADE arriscado? | ✅ Apenas 5 apropriados | parent→child diretos |
| Campos legacy preservados? | ✅ Todos | emails, created_by_id, seasons, etc. |
| RLS em todas as tabelas? | ✅ Sim | 34 tabelas com RLS |
| Helper functions criadas? | ✅ 4 funções | is_admin, is_owner, current_user_email, set_updated_date |
| Triggers em todas as tabelas? | ✅ 33 triggers | Uma por tabela (exceto auxiliares) |
| ENUMs para campos estáveis? | ✅ 24 ENUMs | Campos abertos permanecem TEXT |

---

## 12. PRÓXIMOS PASSOS

1. **Revisar o DDL manualmente** — Verificar `0001_initial_schema.sql` contra os schemas Base44.
2. **Criar projeto Supabase** — Via dashboard (não automatizado).
3. **Aplicar DDL** — Executar `0001_initial_schema.sql` no SQL Editor do Supabase.
4. **Executar validation queries** — Rodar `0001_validation_queries.sql` e verificar todos os critérios.
5. **Criar storage buckets** — `public-assets` e `private-assets` via dashboard ou SQL comentado no DDL.
6. **NÃO importar dados ainda** — Aguardar Fase 2 (adapter layer + export/import).

### Rollback disponível

Se algo der errado, executar `0001_rollback.sql` para remover todo o schema criado (sem afetar auth.users ou storage).