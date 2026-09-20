# AniZoku — Documento Canônico do Sistema

**Data:** 2026-09-15  
**Propósito:** Levantamento exaustivo de entidades, backend functions, e chamadas SDK para migração Base44 → Supabase/Lovable.  
**Escopo:** Tudo que o Lovable/Supabase precisa substituir.

---

## SUMÁRIO EXECUTIVO

| Categoria | Quantidade |
|---|---|
| Entidades (custom) | 27 |
| Entidade built-in | 1 (User) |
| Backend Functions | 5 |
| Shared Modules | 4 |
| SDK: `base44.entities.*` call sites | ~120 (30 entidades × múltiplas ops) |
| SDK: `base44.functions.invoke` call sites | 4 (grantXp, updateProgress, unlockAchievement) |
| SDK: `base44.auth.*` call sites | ~48 (12 métodos distintos) |
| SDK: `base44.integrations.Core.*` call sites | 14 (UploadFile) |
| SDK: `base44.users.*` call sites | 0 (não usado no frontend) |

---

## ARQUITETURA

```
Frontend (React/Vite)
  ├─ base44.entities.<Entity>.<op>()  → Base44 API (RLS-enforced)
  ├─ base44.functions.invoke(<fn>)     → Backend Functions (service role)
  ├─ base44.auth.*                     → Auth SDK
  └─ base44.integrations.Core.*        → Built-in integrations (LLM, Upload, Email)

Backend Functions (Deno/TypeScript)
  ├─ grantXp           → XP direto (post_created, anime_added, level_up, legacy_migration)
  ├─ updateProgress    → Progresso + XP atômico (episodes, chapters, completion)
  ├─ unlockAchievement → Conquistas + XP (validação server-side)
  ├─ anilistCatalogSync → Sync AniList → WorkRelease/DynamicWork
  └─ malCatalogSync    → Sync MAL/Jikan → WorkRelease/DynamicWork

Shared Modules (base44/shared/)
  ├─ xpConstants.ts    → XP_REWARDS, ACHIEVEMENT_XP, level calc, idempotency helpers
  ├─ syncFieldPolicy.ts → Tier 1 field policy, prohibited fields, normalizers
  ├─ syncUtils.ts      → sleep, chunk, cache, retry helpers
  └─ scopeConfig.ts    → ANIME_ONLY frozen categories
```

---

## PARTE 1 — ENTIDADES

### Convenções RLS

| Símbolo | Significado |
|---|---|
| `{}` (read) | Público — qualquer autenticado lê |
| `created_by: "{{user.email}}"` | Apenas dono |
| `data.<field>: "{{user.email}}"` | Apenas dono (por campo custom) |
| `user_condition: { role: "admin" }` | Apenas admin |
| `$or: [...]` | Qualquer condição OR |

### Built-in Attributes (todas entidades)

```
id: string (MongoDB ObjectId, 24-char hex)
created_date: string (ISO date-time)
updated_date: string (ISO date-time)
created_by: string (user email — preenchido automaticamente)
```

---

### 1.1 — DynamicWork (Catálogo — Franchise/Mãe)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| slug | string | ✅ | Slug único kebab-case |
| title | string | ✅ | Título principal (en) |
| title_pt | string | | Título PT-BR |
| romaji_title | string | | Título romaji |
| categories | string | | JSON array serializado `["anime"]` |
| genres | string | | JSON array serializado |
| synopsis | string | | Sinopse |
| episodes | number | | Total episódios (anime) |
| chapters | number | | Total capítulos (manga) |
| volumes | number | | Total volumes (manga) |
| anime_status | string | | "Em exibição"/"Finalizado"/"Em breve" |
| manga_status | string | | "Em publicação"/"Finalizado"/"Em hiato" |
| mal_id | number | | MAL ID (anime) |
| manga_mal_id | number | | MAL ID (manga) |
| score | number | | MAL score 0-10 |
| year | number | | Ano |
| duration | string | | "24 min/ep" |
| image_url | string | | Poster URL |
| source | string | | "jikan" |
| sync_status | string | | "synced"/"manual_override" |
| last_synced_at | string (date-time) | | |
| popularity_rank | number | | |
| is_currently_airing | boolean | | |
| season | string | | "winter_2025" etc |
| season_year | number | | |
| is_trending | boolean | | Admin "Em Alta" |
| trending_rank | number | | |
| franchise_id | string | | mal_id da raiz do franchise |
| franchise_title | string | | Título canônico do franchise |
| franchise_score | number | | Score canônico (admin override) |
| franchise_poster_url | string | | Poster canônico (admin override) |
| seasons | string | | JSON array: `[{mal_id, season_number, season_title, sort_order, episodes, year, poster_url, synopsis, score}]` |
| related_franchise_id | string | | franchise_id da obra canônica relacionada |
| sync_release_completed | boolean | | true quando seasons[] migradas para WorkRelease |
| release_count | number | | Contagem de WorkRelease vinculados |

**RLS:**
| Operação | Regra |
|---|---|
| create | admin only |
| read | público |
| update | admin only |
| delete | admin only |

**Relações:**
- `1:N` → WorkRelease (via `group_id`)
- `1:N` → ExternalMapping (via `work_group_id`)
- `1:N` → AnimeEntry (indireto via franchise title match)

**Dados legados:** `seasons[]` JSON contém dados pré-migração. Alguns 714 DynamicWork sem WorkRelease correspondente (dívida técnica). 102 grupos com slugs duplicados.

**Dados descartáveis:** `source`, `last_synced_at`, `sync_status` — metadados de sync, não essenciais para o usuário final.

---

### 1.2 — WorkRelease (Catálogo — Release/Temporada)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| group_id | string | ✅ | DynamicWork.id (franchise-mãe) |
| group_slug | string | | DynamicWork.slug denormalizado |
| slug | string | ✅ | Slug único do release |
| title | string | ✅ | Título do release |
| title_romaji | string | | |
| title_english | string | | |
| title_native | string | | |
| category | string (enum) | ✅ | anime/manga/movie/liveaction |
| format | string | | TV/MOVIE/OVA/ONA/SPECIAL/MANGA/NOVEL |
| season | string | | winter/spring/summer/fall |
| season_year | number | | |
| episode_count | number | | Total episódios |
| chapter_count | number | | Total capítulos (manga) |
| duration_minutes | number | | Min/ep |
| release_order | number | | Ordem cronológica |
| display_order | number | | Ordem exibição catálogo |
| status | string (enum) | | releasing/finished/not_yet_released/cancelled/hiatus |
| is_main_entry | boolean | | Entrada principal do grupo |
| is_special | boolean | | Derivado de format |
| is_movie | boolean | | Derivado de format |
| is_live_action | boolean | | |
| synopsis | string | | |
| cover_url | string | | Poster |
| banner_url | string | | Banner |
| score | number | | 0-10 |
| popularity | number | | |
| trending_score | number | | |
| trending_rank | number | | |
| sync_status | string (enum) | | synced/pending/manual_override |
| last_synced_at | string (date-time) | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Relações:**
- `N:1` → DynamicWork (via `group_id`)
- `1:N` → ExternalMapping (via `work_release_id`)
- `1:N` → AnimeEntry (via `release_id`)

**Dados legados:** 110 AnimeEntry sem `release_id` (backfill pendente).

---

### 1.3 — ExternalMapping (Identidade Externa)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| work_group_id | string | | DynamicWork.id |
| work_release_id | string | | WorkRelease.id |
| provider | string (enum) | ✅ | anilist/mal/tmdb/thetvdb |
| provider_id | string | ✅ | ID no provedor (string p/ IDs grandes) |
| provider_url | string | | |
| provider_type | string | | anime/manga/movie/tv |
| confidence_score | number | | 100 = match exato |
| verified_by_admin | boolean | | |
| last_synced_at | string (date-time) | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Relações:**
- `N:1` → DynamicWork (via `work_group_id`)
- `N:1` → WorkRelease (via `work_release_id`)

**Notas:** Jikan NÃO é provider — IDs do Jikan usam `provider="mal"`. Esta é a **identidade canônica** para sync (nunca fuzzy/LLM).

---

### 1.4 — CatalogSync (Cache de Sync Legado)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| slug | string | ✅ | Slug da obra (chave de junção) |
| total_episodes | number | | |
| total_chapters | number | | |
| total_volumes | number | | |
| anime_status | string | | PT-BR |
| manga_status | string | | PT-BR |
| mal_id | number | | |
| manga_mal_id | number | | |
| score | number | | |
| romaji_title | string | | |
| synced_at | string (date-time) | | |
| sync_status | string (enum) | | synced/not_found/manual_override |
| franchise_id | string | | Cache de franchise_id |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Dados descartáveis:** Esta entidade é **legada** — foi substituída por DynamicWork + WorkRelease + ExternalMapping. Pode ser descartada na migração Supabase se os dados forem migrados para o novo schema.

---

### 1.5 — MediaWork (Catálogo Legado)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| title | string | ✅ | |
| category | string (enum) | ✅ | anime/manga/movie/liveaction |
| cover_url | string | | |
| banner_url | string | | |
| genres | array[string] | | |
| rating | number | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Dados descartáveis:** Entidade **legada** — usada apenas no admin CatalogManager. Substituída por DynamicWork/WorkRelease. **Descartável na migração.**

---

### 1.6 — CardOverride (Override de Catálogo)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| card_slug | string | ✅ | Slug da obra |
| category | string (enum) | | anime/manga/movie/liveaction |
| override_title | string | | |
| override_description | string | | |
| override_image_url | string | | |
| is_manual_override | boolean | | default true |
| sync_disabled | boolean | | default true |
| edited_by | string | | |
| edited_by_name | string | | |
| edited_at | string (date-time) | | |
| original_snapshot | object | | |
| notes | string | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Uso:** Admin edita cards do catálogo sem afetar sync. Único call site: `AdminEditCardModal.jsx`.

---

### 1.7 — WorkCategoryVisibility (Visibilidade por Categoria)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| work_slug | string | ✅ | |
| work_title | string | | |
| show_in_animes | boolean | | default true |
| show_in_mangas | boolean | | default true |
| show_in_liveaction | boolean | | default true |
| show_in_filmes | boolean | | default true |
| updated_by | string | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Uso:** Controla visibilidade de obras em categorias frozen (ANIME_ONLY mode).

---

### 1.8 — AnimeEntry (Progresso do Usuário)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| title | string | ✅ | Título canônico (franchise title) |
| type | string (enum) | ✅ | anime/manga (default anime) |
| cover_url | string | | |
| status | string (enum) | | watching/reading/completed/planned/dropped/on_hold |
| current_episode | number | | default 0 |
| total_episodes | number | | |
| current_chapter | number | | default 0 |
| total_chapters | number | | |
| rating | number | | 1-10 |
| notes | string | | |
| genre | string | | |
| season_mal_id | number | | mal_id da temporada (fallback legado) |
| release_id | string | | WorkRelease.id (canônico) |
| external_provider | string | | Provider provisório (ex: anilist) |
| external_provider_id | string | | ID no provedor externo |
| external_provider_type | string | | anime/manga/movie/tv |

**RLS:**
| Operação | Regra |
|---|---|
| create | `created_by: "{{user.email}}"` (dono) |
| read | dono OU admin |
| update | dono OU admin |
| delete | dono OU admin |

**Relações:**
- `N:1` → WorkRelease (via `release_id`)
- `N:1` → DynamicWork (indireto via title match)

**Segurança P0:** Frontend **NÃO** deve atualizar `current_episode`, `current_chapter`, ou `status="completed"` diretamente. Tudo via `updateProgress` backend function. RLS permite (dono), mas XP só é concedido pelo backend.

**Dados legados:** `season_mal_id` é fallback legado — `release_id` é canônico. 110 entries sem `release_id`.

---

### 1.9 — XpEvent (Ledger de XP)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| user_email | string | ✅ | |
| event_type | string (enum) | ✅ | achievement_unlocked/level_up/episode_watched/chapter_read/post_created/work_completed/anime_added/legacy_migration |
| achievement_id | string | | Se event_type=achievement_unlocked |
| xp_amount | number | | default 0. **Resolvido pelo backend** |
| event_date | string (date-time) | | Setado pelo backend |
| source_type | string | | anime_entry/post/achievement (auditoria) |
| source_id | string | | ID da entidade fonte |
| idempotency_key | string | | Único por user+ação. **Construído pelo backend** |

**RLS:**
| Operação | Regra |
|---|---|
| create | **admin only** |
| read | público |
| update | **admin only** |
| delete | **admin only** |

**Segurança P0:** Cliente **NÃO pode criar** XpEvent (RLS admin-only). Todo XP passa por `grantXp`, `updateProgress`, ou `unlockAchievement` (que usam `asServiceRole`).

**Dados legados:** `legacy_migration` = baseline de XP legado (excluído do ranking semanal/mensal).

**Target Supabase:** `UNIQUE(user_id, idempotency_key)` constraint para atomicidade real.

---

### 1.10 — UserAchievement (Conquistas Desbloqueadas)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| user_email | string | ✅ | |
| achievement_key | string | ✅ | key da conquista |
| unlocked_at | string (date-time) | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | **admin only** |
| read | público |
| update | **admin only** |
| delete | **admin only** |

**Segurança P0:** Cliente **NÃO pode criar** UserAchievement. Tudo via `unlockAchievement` backend.

---

### 1.11 — Achievement (Catálogo de Conquistas)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| key | string | ✅ | ID estável (ex: ep_1000) |
| name | string | ✅ | Nome de exibição |
| description | string | | |
| icon | string | | Nome do ícone lucide-react |
| category | string | | |
| xp | number | | default 0 |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Notas:** Catálogo estático. Os valores de XP reais estão em `ACHIEVEMENT_XP` (xpConstants.ts), não no campo `xp` desta entidade.

---

### 1.12 — User (Built-in)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| role | string (enum) | ✅ | admin/user |
| --- built-in --- | | | id, created_date, full_name, email (read-only) |

**RLS:** Built-in. Apenas admins listam/atualizam/deletam outros usuários. Usuários não podem ser criados via SDK — apenas via invites.

**SDK:** `base44.users.inviteUser(email, role)` — não usado no frontend atual (0 call sites).

---

### 1.13 — UserProfile (Perfil do Usuário)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| user_email | string | ✅ | Unique |
| username | string | | @handle |
| display_name | string | | |
| bio | string | | |
| avatar_url | string | | |
| avatar_crop | object | | {scale, offsetX, offsetY} |
| banner_url | string | | |
| banner_crop | object | | {scale, offsetX, offsetY} |
| country | string | | |
| preferred_language | string (enum) | | pt/en/es/ja/other |
| links | object | | {twitter, instagram, website} |
| favorite_animes | array[string] | | |
| favorite_mangas | array[string] | | |
| selected_badge_id | string | | Achievement badge no avatar |
| list_visibility | string (enum) | | public/friends/private |
| profile_visibility | string (enum) | | public/friends/private |
| profile_setup_completed | boolean | | |
| profile_setup_completed_at | string (date-time) | | |
| push_enabled | boolean | | |
| achievement_sound_enabled | boolean | | default true |
| current_streak | number | | Dias consecutivos |
| last_activity_date | string | | YYYY-MM-DD |
| login_streak | number | | Dias consecutivos de login |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.user_email: "{{user.email}}"` (dono) |
| read | público OU dono OU admin |
| update | `data.user_email: "{{user.email}}"` (dono) |
| delete | `data.user_email: "{{user.email}}"` (dono) |

**Relações:** `1:1` → User (via user_email)

**Segurança:** `current_streak` e `last_activity_date` são atualizados pelo backend (`updateStreak` em xpConstants.ts). Frontend não deve atualizar diretamente.

---

### 1.14 — Friendship (Amizades)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| requester_email | string | ✅ | |
| receiver_email | string | ✅ | |
| requester_name | string | | |
| receiver_name | string | | |
| status | string (enum) | | pending/accepted/rejected (default pending) |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.requester_email: "{{user.email}}"` (requester) |
| read | requester OU receiver OU admin |
| update | requester OU receiver OU admin |
| delete | requester OU receiver OU admin |

**Relações:** `N:2` → User (requester + receiver)

**Notas:** Campo é `receiver_email` (NÃO `addressee_email` — bug corrigido em unlockAchievement).

---

### 1.15 — DirectMessage (Mensagens Diretas)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| sender_email | string | ✅ | |
| receiver_email | string | ✅ | |
| content | string | ✅ | |
| is_read | boolean | | default false |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.sender_email: "{{user.email}}"` (sender) |
| read | sender OU receiver |
| update | sender OU receiver |
| delete | sender only |

**Realtime:** `subscribe` usado em 2 arquivos (FloatingChat, MobileChatDrawer).

---

### 1.16 — Notification (Notificações)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| recipient_email | string | ✅ | |
| type | string (enum) | ✅ | friend_request/friend_accepted/post_liked/post_commented/event_invite/event_reminder/list_update/watch_together_invite/watch_together_near_5/watch_together_near_1/direct_message/mention/event_message |
| message | string | ✅ | |
| from_name | string | | |
| from_email | string | | |
| reference_id | string | | ID de entidade relacionada |
| is_read | boolean | | default false |

**RLS:**
| Operação | Regra |
|---|---|
| create | `created_by: "{{user.email}}"` |
| read | `data.recipient_email: "{{user.email}}"` (destinatário) |
| update | `data.recipient_email: "{{user.email}}"` (destinatário) |
| delete | destinatário OU admin |

**Uso:** 12 call sites de `create` em 6 arquivos. `update` em 1 arquivo (marcar como lida).

---

### 1.17 — ActivityFeed (Feed de Atividade)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| actor_email | string | ✅ | |
| actor_name | string | | |
| target_email | string | | |
| target_name | string | | |
| activity_type | string (enum) | ✅ | watch_together_created/list_commented/event_invited/started_watching_together/friend_added |
| media_title | string | | |
| media_episode | number | | |
| description | string | ✅ | |

**RLS:**
| Operação | Regra |
|---|---|
| create | `created_by: "{{user.email}}"` |
| read | actor OU target OU admin |
| update | `created_by: "{{user.email}}"` (actor) |
| delete | `created_by: "{{user.email}}"` (actor) |

---

### 1.18 — WatchTogether (Assistir Junto)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| initiator_email | string | ✅ | |
| initiator_name | string | | |
| friend_email | string | ✅ | |
| friend_name | string | | |
| media_title | string | ✅ | |
| media_type | string (enum) | | anime/manga |
| target_episode | number | | |
| target_chapter | number | | |
| status | string (enum) | | pending/accepted/rejected/completed |
| notified_5 | boolean | | Notificação 5 min antes |
| notified_1 | boolean | | Notificação 1 min antes |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.initiator_email: "{{user.email}}"` (initiator) |
| read | initiator OU friend |
| update | initiator OU friend |
| delete | initiator only |

---

### 1.19 — SocialEvent (Eventos Sociais)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| title | string | ✅ | |
| description | string | | |
| media_title | string | | |
| event_type | string (enum) | | watch_episode/watch_marathon/read_chapter/debate/theory_night/watch_party |
| media_type | string (enum) | | anime/manga |
| event_date | string (date-time) | ✅ | |
| max_participants | number | | |
| visibility | string (enum) | | public/friends/private |
| status | string (enum) | | scheduled/happening/finished |
| organizer_email | string | | |
| organizer_name | string | | |
| participants | array[string] | | |
| participants_names | array[string] | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.organizer_email: "{{user.email}}"` |
| read | public OU organizer OU participant OU admin |
| update | organizer OU admin |
| delete | organizer OU admin |

---

### 1.20 — EventComment (Comentários de Evento)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| event_id | string | ✅ | |
| content | string | ✅ | |
| author_name | string | | |
| author_email | string | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.author_email: "{{user.email}}"` |
| read | público |
| update | author OU admin |
| delete | author OU admin |

**Realtime:** `subscribe` usado em 1 arquivo.

---

### 1.21 — Community (Comunidades)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| name | string | ✅ | |
| description | string | | |
| cover_url | string | | |
| avatar_url | string | | |
| members_count | number | | default 0 |
| category | string (enum) | | anime/manga/general/theories/reviews/news |
| tags | array[string] | | |
| creator_email | string | | |
| members | array[string] | | Array de emails |

**RLS:**
| Operação | Regra |
|---|---|
| create | `created_by: "{{user.email}}"` (qualquer user) |
| read | público |
| update | creator OU admin |
| delete | creator OU admin |

**Notas:** `members_count` e `members` podem estar dessincronizados — backend unlockAchievement usa `c.member_count || c.members?.length || 0`.

---

### 1.22 — Post (Posts do Feed)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| content | string | ✅ | |
| image_url | string | | |
| anime_title | string | | |
| post_type | string (enum) | | discussion/review/reaction/theory/general |
| community_id | string | | null = feed geral |
| likes_count | number | | default 0 |
| comments_count | number | | default 0 |
| liked_by | array[string] | | |
| author_name | string | | |
| author_avatar | string | | |
| author_level | number | | default 1 |

**RLS:**
| Operação | Regra |
|---|---|
| create | `created_by: "{{user.email}}"` (autor) |
| read | público |
| update | autor OU admin |
| delete | autor OU admin |

**Realtime:** `subscribe` em 1 arquivo.

**XP:** Post creation concede XP via `grantXp("post_created")` (backend valida ownership).

---

### 1.23 — Comment (Comentários de Post)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| post_id | string | ✅ | |
| parent_id | string | | Para threaded replies |
| content | string | ✅ | |
| author_name | string | | |
| author_avatar | string | | |
| likes_count | number | | |
| liked_by | array[string] | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | `created_by: "{{user.email}}"` (autor) |
| read | público |
| update | autor OU admin |
| delete | autor OU admin |

---

### 1.24 — Debate (Debates — Admin Only)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| title | string | ✅ | |
| description | string | | |
| anime_title | string | | |
| author_name | string | | |
| replies_count | number | | |
| is_hot | boolean | | |
| tags | array[string] | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

**Notas:** Entidade admin-only. Usada na home (ActiveDebatesSection).

---

### 1.25 — News (Notícias)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| title | string | ✅ | |
| slug | string | | kebab-case |
| summary | string | | |
| content | string | | Markdown |
| category | string (enum) | ✅ | anime/manga/movie/liveaction/general |
| image_url | string | | Legado |
| banner_image_url | string | | Carrossel home ~2400x1000 |
| card_image_url | string | | Card lista ~1200x675 |
| article_image_url | string | | Topo artigo ~1200x630 |
| video_type | string (enum) | | none/embed/file |
| video_url | string | | |
| video_provider | string | | youtube/vimeo/file |
| sources | array[{name, url}] | | |
| source_url | string | | Legado |
| source_name | string | | Legado |
| published_at | string (date-time) | | |
| is_featured | boolean | | Carrossel home |
| author_name | string | | Snapshot |
| author_id | string | | User ID (fonte de verdade) |
| status | string (enum) | | rascunho/publicado |
| reading_minutes | number | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | admin only |
| read | `status === "publicado"` OU admin |
| update | admin only |
| delete | admin only |

**Dados legados:** `image_url`, `source_url`, `source_name` são legados — substituídos por `banner_image_url`/`card_image_url`/`article_image_url` e `sources[]`.

---

### 1.26 — FanArt (Artes de Fã)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| image_url | string | ✅ | |
| title | string | | |
| work_slug | string | | Link para obra |
| work_title | string | | |
| artist_name | string | | Obrigatório para novas |
| artist_instagram | string | | |
| artist_twitter | string | | |
| artist_website | string | | |
| source_url | string | | |
| credit_notes | string | | Admin only |
| active | boolean | | default true |
| order | number | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | admin only |
| read | `active === true` OU admin |
| update | admin only |
| delete | admin only |

---

### 1.27 — PlatformBanner (Banners Promocionais)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| image_url | string | ✅ | |
| title | string | | |
| link_url | string | | |
| active | boolean | | default true |
| order | number | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

---

### 1.28 — LoginBackgroundImage (Imagens de Fundo do Login)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| image_url | string | ✅ | |
| title | string | | |
| active | boolean | | default true |
| order | number | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

---

### 1.29 — SiteConfig (Configuração do Site)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| label | string | ✅ | Identificador (ex: "default") |
| logo_compact_url | string | | |
| logo_full_url | string | | |
| achievement_sound_url | string | | |
| updated_by | string | | |

**RLS:** create=admin, read=público, update=admin, delete=admin

---

### 1.30 — SyncRun (Runs de Sincronização)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| run_id | string | ✅ | UUID |
| dry_run | boolean | | default true |
| started_at | string (date-time) | | |
| completed_at | string (date-time) | | |
| status | string (enum) | | running/completed/failed/interrupted |
| total_releases | number | | |
| processed_release_ids | string | | JSON array |
| current_batch | number | | |
| batches_completed | number | | |
| errors | string | | JSON array |
| last_checkpoint_at | string (date-time) | | |
| summary | string | | JSON |

**RLS:** Tudo admin only.

---

### 1.31 — SyncLog (Logs de Sincronização)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| run_id | string | ✅ | Ref SyncRun |
| release_id | string | ✅ | Ref WorkRelease |
| release_slug | string | | |
| mal_id | number | | |
| anilist_id | number | | |
| match_valid | boolean | | |
| classification | string (enum) | ✅ | SYNC_SAFE/NO_CHANGES/REVIEW_REQUIRED/ID_MISMATCH/ANILIST_NOT_FOUND/MAL_NOT_FOUND/MISSING_MAPPING/SKIPPED_MANUAL_OVERRIDE/SKIPPED_FROZEN_CATEGORY/UPSTREAM_RATE_LIMITED/ERROR |
| proposed_fields | string | | JSON |
| written_fields | string | | JSON |
| reviews | string | | JSON |
| ignored | string | | JSON |
| dw_updates | string | | JSON |
| error_message | string | | |
| timestamp | string (date-time) | | |

**RLS:** Tudo admin only.

---

### 1.32 — SyncConflict (Conflitos de Sync)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| provider | string (enum) | ✅ | anilist/mal/tmdb/thetvdb |
| provider_id | string | ✅ | |
| provider_type | string | | |
| external_title | string | | |
| external_payload_summary | string | | LEVE, nunca payload completo |
| possible_work_group_id | string | | Sugestão fuzzy |
| possible_work_release_id | string | | Sugestão fuzzy |
| conflict_type | string (enum) | ✅ | no_match/ambiguous_title/duplicate_candidate/missing_relation/category_mismatch |
| confidence_score | number | | |
| suggested_action | string (enum) | | link_existing/create_new_release/create_new_group/ignore |
| status | string (enum) | | pending/resolved/dismissed |
| admin_note | string | | |
| resolved_at | string (date-time) | | |
| resolved_by | string | | |

**RLS:** Tudo admin only.

---

### 1.33 — ContentReport (Moderação)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| reported_by_email | string | ✅ | |
| content_type | string (enum) | ✅ | post/comment/reply/profile |
| content_id | string | ✅ | |
| content_preview | string | | |
| author_email | string | | |
| reason | string (enum) | ✅ | spam/hate_speech/nsfw/harassment/spoiler/misinformation/other |
| description | string | | |
| report_status | string (enum) | | pending/reviewed/dismissed/actioned |
| admin_action | string (enum) | | warning/content_removed/user_warned/user_suspended |
| admin_note | string | | |
| created_at | string | | |
| reviewed_at | string | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.reported_by_email: "{{user.email}}"` (reporter) |
| read | reporter OU admin |
| update | admin only |
| delete | admin only |

---

### 1.34 — WorkSuggestion (Sugestões de Obras)

| Campo | Tipo | Required | Descrição |
|---|---|---|---|
| suggested_by_email | string | ✅ | |
| title | string | ✅ | |
| type | string (enum) | ✅ | anime/manga |
| mal_id | number | ✅ | |
| image_url | string | | |
| synopsis | string | | |
| year | number | | |
| score | number | | |
| status | string | | |
| episodes | number | | |
| chapters | number | | |
| genres | string | | |
| mal_url | string | | |
| suggestion_status | string (enum) | | pending/approved/rejected |
| admin_note | string | | |
| created_at | string | | |
| reviewed_at | string | | |

**RLS:**
| Operação | Regra |
|---|---|
| create | `data.suggested_by_email: "{{user.email}}"` (suggester) |
| read | suggester OU admin |
| update | admin only |
| delete | admin only |

---

## PARTE 2 — BACKEND FUNCTIONS

### 2.1 — grantXp

**Arquivo:** `base44/functions/grantXp/entry.ts`  
**Auth:** `base44.auth.me()` — usuário autenticado  
**Service Role:** `base44.asServiceRole` — bypassa RLS para XpEvent.create

**Event Types Aceitos:**
| Event Type | XP | Source | Idempotency Key |
|---|---|---|---|
| `post_created` | 20 | Post.id | `post:{postId}:create` |
| `anime_added` | 15 | AnimeEntry.id | `entry:{entryId}:created` |
| `level_up` | 0 | level number | `levelup:{email}:{level}` |
| `legacy_migration` | var | null | `legacy-xp-baseline-v1:{email}` (admin only) |

**Event Types REJEITADOS (INVALID_EVENT_TYPE):**
- `episode_watched`, `chapter_read`, `episode_range`, `chapter_range`, `work_completed`, `achievement_unlocked`

**Fluxo:**
1. `auth.me()` → user
2. Parse body → event_type, source_id
3. Validar event_type na whitelist
4. Para `anime_added`/`post_created`: buscar entidade fonte, validar ownership (`created_by === user.email`)
5. Construir idempotency_key server-side
6. `findExisting()` — checar idempotência
7. Se não existe: `createEvent()` + `updateStreak()`
8. Retornar `{status, xp_amount, idempotency_key}`

**Entidades Tocadas:**
- `XpEvent.create` (service role)
- `UserProfile.filter` + `UserProfile.update` (streak)
- `AnimeEntry.get` (validação anime_added)
- `Post.get` (validação post_created)

**Segurança:**
- `user.email` de `auth.me()`, nunca do payload
- `xp_amount` de `XP_REWARDS`, nunca do cliente
- `idempotency_key` construído server-side
- Ownership validada para todo event type com source

---

### 2.2 — updateProgress

**Arquivo:** `base44/functions/updateProgress/entry.ts`  
**Auth:** `base44.auth.me()`  
**Service Role:** `base44.asServiceRole`

**Actions:**
| Action | Descrição |
|---|---|
| `increment` | current + 1 |
| `decrement` | current - 1 (no XP removal) |
| `set_progress` | set to value |
| `complete` | set to total + status=completed |

**Input:** `{entry_id, action, value}`

**Fluxo:**
1. `auth.me()` → user
2. `AnimeEntry.get(entry_id)` → validar ownership
3. `getCanonicalTotal()` → resolver total de WorkRelease (autoridade) ou entry (fallback)
4. `getWorkRelease()` → checar airing status
5. Computar newProgress baseado em action
6. Validar contra canonicalTotal (OUT_OF_RANGE)
7. `AnimeEntry.update()` — atualizar progress
8. Para cada unidade no range (current+1..newProgress): `createEvent("episode_watched"/"chapter_read", XP_REWARDS.*)` com idempotency key `episode/chapter:{entryId}:{n}`
9. Se completed: `createEvent("work_completed", XP_REWARDS.anime_completed/manga_completed)` com key `completion:{entryId}`
10. `updateStreak()` se XP concedido
11. Retornar `{status, progress, xp_granted, completion_xp_granted, total_xp_granted, completed, status_changed}`

**Entidades Tocadas:**
- `AnimeEntry.get` + `AnimeEntry.update`
- `WorkRelease.get` (canonical total + airing check)
- `XpEvent.create` (per-unit + completion)
- `UserProfile.filter` + `UserProfile.update` (streak)

**Segurança P0:**
- Frontend **NÃO** atualiza AnimeEntry diretamente para progress
- XP por episódio: 10 (anime), 7 (manga)
- XP por completion: 150 (anime), 100 (manga)
- Auto-completion respeita airing status (não completa se `status === "releasing"`)

---

### 2.3 — unlockAchievement

**Arquivo:** `base44/functions/unlockAchievement/entry.ts`  
**Auth:** `base44.auth.me()`  
**Service Role:** `base44.asServiceRole`

**Input:** `{achievement_id}`

**Fluxo:**
1. `auth.me()` → user
2. Validar `achievement_id` em `ACHIEVEMENT_XP`
3. `UserAchievement.filter()` — checar se já desbloqueada (ALREADY_GRANTED)
4. Computar stats do DB (não do cliente):
   - `AnimeEntry.filter({created_by: user.email})`
   - `Post.filter({created_by: user.email})`
   - `UserProfile.filter({user_email: user.email})`
   - `Friendship.list()` → filtrar requester OU receiver
   - `SocialEvent.list()` → filtrar organizer/participant
   - `Community.list()` → filtrar member
   - `WatchTogether.list()` → filtrar participant
   - `XpEvent.filter({user_email: user.email})` → totalXp para level
   - `User.list("created_date", 10)` → isFounder
5. Avaliar condition server-side (`ACHIEVEMENT_CONDITIONS[achievement_id]`)
6. Se met: `UserAchievement.create()` + `createEvent("achievement_unlocked", ACHIEVEMENT_XP[id])` + `updateStreak()`
7. Se não: `CONDITION_NOT_MET` (403)

**Entidades Tocadas:**
- `UserAchievement.filter` + `UserAchievement.create`
- `AnimeEntry.filter`, `Post.filter`, `UserProfile.filter`
- `Friendship.list`, `SocialEvent.list`, `Community.list`, `WatchTogether.list`
- `XpEvent.filter`, `User.list`
- `XpEvent.create` (achievement XP)
- `UserProfile.update` (streak)

**Limitações Conhecidas (4 achievements não computáveis no backend):**
- `five_genres` — uniqueGenres requer catálogo
- `first_comment` — totalComments não fetched
- `streak_weeks_4` — activeWeeks não tracked
- `same_day_complete` — requer timestamps

---

### 2.4 — anilistCatalogSync

**Arquivo:** `base44/functions/anilistCatalogSync/entry.ts`  
**Auth:** `base44.auth.me()` — **admin only**  
**Service Role:** `base44.asServiceRole`

**Input:** `{dry_run, release_ids, batch_size, resume_from}`

**Propósito:** Sincroniza WorkRelease com AniList via ExternalMapping (identity by ID, never fuzzy).

**Fluxo:**
1. Validar admin
2. Criar/resumir SyncRun (checkpoint)
3. Carregar WorkRelease, DynamicWork, ExternalMapping
4. Agrupar releases: anime_mal, manga_mal, anime_anilist, manga_anilist, missing_mapping, frozen_category
5. Para cada batch: query AniList GraphQL (idMal_in / id_in, perPage=50)
6. Para cada release: validar identidade, aplicar Tier 1 policy
7. Se dry_run=false: `WorkRelease.bulkUpdate()` + `DynamicWork.bulkUpdate()` (main entry only)
8. Criar SyncLog por release
9. Checkpoint a cada batch

**Entidades Tocadas:**
- `SyncRun.create` + `SyncRun.update` (checkpoint)
- `SyncLog.create` (por release)
- `WorkRelease.list` + `WorkRelease.bulkUpdate`
- `DynamicWork.list` + `DynamicWork.bulkUpdate`
- `ExternalMapping.list`

**Política:**
- `PROHIBITED_FIELDS`: score, cover_url (nunca do AniList)
- `manual_override`: skip
- Frozen categories (manga/movie/liveaction): skip
- Rate limit: 700ms entre batches, 3 retries com backoff exponencial
- Cache: 5min TTL

**Notas:** AniList API retorna 403 de datacenter IPs — sync deve rodar de frontend ou proxy.

---

### 2.5 — malCatalogSync

**Arquivo:** `base44/functions/malCatalogSync/entry.ts`  
**Auth:** `base44.auth.me()` — **admin only**  
**Service Role:** `base44.asServiceRole`

**Input:** `{dry_run, release_ids, batch_size, resume_from}`

**Propósito:** Sincroniza WorkRelease com MAL via Jikan REST API (identity by MAL ID).

**Fluxo:** Mirror de anilistCatalogSync, adaptado para Jikan:
- Sequential requests (não bulk) — Jikan é REST, não GraphQL
- Rate limit: 1200ms, 5 retries, global cooldown on 429
- `UPSTREAM_RATE_LIMITED` classification (retryable, não adiciona a processedIds)

**Entidades Tocadas:** Mesmas que anilistCatalogSync.

**Política:** `MAL_PROHIBITED_FIELDS` — campos que MAL/Jikan nunca sobrescreve.

---

## PARTE 3 — SHARED MODULES

### 3.1 — xpConstants.ts

**Importado por:** grantXp, updateProgress, unlockAchievement

**Exports:**
```typescript
XP_REWARDS: {
  episode_watched: 10, chapter_read: 7,
  anime_completed: 150, manga_completed: 100,
  post_created: 20, anime_added: 15
}
ACHIEVEMENT_XP: Record<string, number>  // 60+ achievements
xpRequiredForLevel(level): number       // BASE_XP=100, EXPONENT=1.6
getLevelFromXp(xp): number               // max level 100
updateStreak(svc, email): Promise<void>  // UserProfile.current_streak update
findExisting(svc, email, key): Promise<XpEvent|null>  // idempotency check
createEvent(svc, email, type, xp, sourceType, sourceId, key, achievementId): Promise<void>
getCanonicalTotal(svc, entry, isManga): Promise<number>  // WorkRelease authority
getWorkRelease(svc, entry): Promise<WorkRelease|null>   // airing check
```

### 3.2 — syncFieldPolicy.ts

**Importado por:** anilistCatalogSync, malCatalogSync

**Exports:**
- `applyTier1Policy(wr, normalized)` — diff WorkRelease com dados AniList
- `applyMalTier1Policy(wr, normalized)` — diff com Jikan
- `applyDynamicWorkDerivedPolicy(dw, dwNorm)` — diff DynamicWork
- `applyMalDynamicWorkDerivedPolicy(dw, dwNorm)`
- `normalizeAniListToWorkRelease(media)` — normaliza payload AniList
- `normalizeJikanToWorkRelease(jikanData)` — normaliza Jikan
- `normalizeAniListToDynamicWork(media)`
- `normalizeJikanToDynamicWork(jikanData, category)`
- `PROHIBITED_FIELDS` / `MAL_PROHIBITED_FIELDS` — campos nunca sobrescritos

### 3.3 — syncUtils.ts

**Exports:** `sleep`, `parseRetryAfterMs`, `chunk`, `generateRunId`, `createCache`

### 3.4 — scopeConfig.ts

**Exports:** `isCategoryActive(category)` — ANIME_ONLY mode (manga/movie/liveaction = frozen)

---

## PARTE 4 — SDK CALL SITES (Frontend → Base44)

### 4.1 — base44.entities.* (por entidade)

| Entidade | Operações | Total Calls | Arquivos |
|---|---|---|---|
| **AnimeEntry** | list(15), filter(2), create(5), update(9), delete(3), subscribe(1) | 35 | 15+ |
| **UserProfile** | list(15), filter(10), create(2), update(5) | 32 | 15+ |
| **DynamicWork** | list(7), filter(10), create(7), update(7), delete(1) | 32 | 7+ |
| **Post** | list(7), filter(2), create(2), update(3), delete(2), subscribe(1) | 17 | 7+ |
| **News** | list(1), filter(10), create(1), update(3), delete(1) | 16 | 7+ |
| **Notification** | create(12), filter(1), update(3) | 16 | 6+ |
| **Friendship** | list(7), create(1), update(4), delete(5) | 17 | 7+ |
| **WorkRelease** | list(4), filter(1), get(2), update(1) | 8 | 3+ |
| **DirectMessage** | list(3), create(3), update(3), subscribe(2) | 11 | 3+ |
| **WatchTogether** | list(1), create(1), update(4), delete(1) | 7 | 3+ |
| **CatalogSync** | list(5), filter(4), create(2), update(4) | 15 | 5+ |
| **WorkSuggestion** | list(5), create(1), update(2) | 8 | 5+ |
| **Community** | list(4), create(1), update(3) | 8 | 4+ |
| **SocialEvent** | list(4), create(1), update(1) | 6 | 4+ |
| **ContentReport** | list(3), filter(1), create(1), update(1) | 6 | 3+ |
| **SyncRun** | list(3) | 3 | 3 |
| **FanArt** | list(1), filter(1), create(1), update(3), delete(1) | 7 | 1 |
| **PlatformBanner** | list(1), filter(1), create(1), update(3), delete(1) | 7 | 1 |
| **LoginBackgroundImage** | list(2), create(1), update(3), delete(1) | 7 | 2 |
| **CardOverride** | list(1), create(2), update(4), delete(1) | 8 | 1 |
| **SiteConfig** | list(2), create(1), update(1) | 4 | 2 |
| **WorkCategoryVisibility** | list(2), create(1), update(1) | 4 | 2 |
| **MediaWork** | list(1), create(1), update(2), delete(1) | 5 | 1 |
| **XpEvent** | list(2), filter(1) | 3 | 2 |
| **User** | list(5) | 5 | 5 |
| **Comment** | filter(1), create(2), delete(1) | 4 | 1+ |
| **EventComment** | filter(1), create(1), subscribe(1) | 3 | 1 |
| **ActivityFeed** | list(1), create(2) | 3 | 1 |
| **ExternalMapping** | list(1), filter(3) | 4 | 2 |
| **SyncConflict** | filter(1) | 1 | 1 |
| **Debate** | list(1) | 1 | 1 |
| **UserAchievement** | (nenhum — só via backend) | 0 | 0 |
| **Achievement** | (não escaneado — provável list) | — | — |

### 4.2 — base44.functions.invoke (por função)

| Função | Calls | Arquivos |
|---|---|---|
| `grantXp` | 1 | `src/lib/xpEvents.js` |
| `updateProgress` | 1 | `src/lib/progressApi.js` |
| `unlockAchievement` | 2 | `src/lib/progressApi.js`, `src/lib/xpEvents.js` |
| `anilistCatalogSync` | (via admin panel) | — |
| `malCatalogSync` | (via admin panel) | — |

**Nota:** `anilistCatalogSync` e `malCatalogSync` são invocados do admin, mas o regex pode não ter capturado se o nome for dinâmico. Verificar manualmente no admin panel.

### 4.3 — base44.auth.* (por método)

| Método | Calls | Arquivos |
|---|---|---|
| `me()` | 35 | 33 arquivos (quase toda página) |
| `logout()` | 3 | UserMenuButton, AuthContext |
| `loginViaEmailPassword()` | 1 | AuthContext |
| `register()` | 1 | AuthContext |
| `verifyOtp()` | 1 | AuthContext |
| `loginWithProvider()` | 2 | AuthContext |
| `resetPasswordRequest()` | 1 | AuthContext |
| `resetPassword()` | 1 | AuthContext |
| `updateMe()` | 2 | AuthContext, ProfileSetup |
| `isAuthenticated()` | 1 | OAuthConsent |
| `redirectToLogin()` | 1 | AuthContext |

### 4.4 — base44.integrations.Core.*

| Integração | Calls | Arquivos |
|---|---|---|
| `UploadFile` | 14 | 12 arquivos (admin, feed, news, profile, communities) |

**Nota:** O código usa `Core.UploadFile` (não `UploadPublicFile`). Outras integrações (InvokeLLM, SendEmail, GenerateImage, etc.) não foram detectadas no scan — verificar se usadas via UI não-code.

### 4.5 — base44.users.*

**Nenhum call site no frontend.** Invites não são usados via SDK.

### 4.6 — base44.analytics.*

**Nenhum call site detectado.** Analytics não implementado.

---

## PARTE 5 — MATRIZ DE MIGRAÇÃO (Base44 → Supabase)

### 5.1 — Entidades → Tabelas Supabase

| Base44 Entity | Supabase Table | RLS Policy | Notas |
|---|---|---|---|
| User | `auth.users` + `public.profiles` | Supabase Auth | Migrar role para profiles |
| UserProfile | `public.user_profiles` | owner + public read | 1:1 com auth.users |
| AnimeEntry | `public.anime_entries` | owner (RLS by user_id) | Progress tracking |
| XpEvent | `public.xp_events` | **admin-only write** | UNIQUE(user_id, idempotency_key) |
| UserAchievement | `public.user_achievements` | **admin-only write** | |
| Achievement | `public.achievements` | public read, admin write | Catálogo estático |
| DynamicWork | `public.dynamic_works` | public read, admin write | |
| WorkRelease | `public.work_releases` | public read, admin write | FK → dynamic_works |
| ExternalMapping | `public.external_mappings` | public read, admin write | FK → works |
| CatalogSync | **DESCARTÁVEL** | — | Legado, substituído |
| MediaWork | **DESCARTÁVEL** | — | Legado |
| CardOverride | `public.card_overrides` | public read, admin write | |
| WorkCategoryVisibility | `public.work_category_visibilities` | public read, admin write | |
| Friendship | `public.friendships` | requester/receiver | |
| DirectMessage | `public.direct_messages` | sender/receiver | + realtime |
| Notification | `public.notifications` | recipient | |
| ActivityFeed | `public.activity_feed` | actor/target | |
| WatchTogether | `public.watch_together` | initiator/friend | |
| SocialEvent | `public.social_events` | public/organizer/participant | |
| EventComment | `public.event_comments` | public read, author write | + realtime |
| Community | `public.communities` | public read, creator write | |
| Post | `public.posts` | public read, author write | + realtime |
| Comment | `public.comments` | public read, author write | |
| Debate | `public.debates` | public read, admin write | |
| News | `public.news` | public read (status=publicado), admin write | |
| FanArt | `public.fan_art` | public read (active=true), admin write | |
| PlatformBanner | `public.platform_banners` | public read, admin write | |
| LoginBackgroundImage | `public.login_background_images` | public read, admin write | |
| SiteConfig | `public.site_config` | public read, admin write | Singleton |
| SyncRun | `public.sync_runs` | admin only | |
| SyncLog | `public.sync_logs` | admin only | |
| SyncConflict | `public.sync_conflicts` | admin only | |
| ContentReport | `public.content_reports` | reporter/admin | |
| WorkSuggestion | `public.work_suggestions` | suggester/admin | |

### 5.2 — Backend Functions → Supabase RPC / Edge Functions

| Base44 Function | Supabase Equivalente | Tipo |
|---|---|---|
| `grantXp` | `rpc.grant_xp(event_type, source_id)` | PostgreSQL Function (SECURITY DEFINER) |
| `updateProgress` | `rpc.update_progress(entry_id, action, value)` | PostgreSQL Function (SECURITY DEFINER, transactional) |
| `unlockAchievement` | `rpc.unlock_achievement(achievement_id)` | PostgreSQL Function (SECURITY DEFINER) |
| `anilistCatalogSync` | Edge Function (Deno) | HTTP handler (admin only) |
| `malCatalogSync` | Edge Function (Deno) | HTTP handler (admin only) |

### 5.3 — SDK Calls → Supabase Client

| Base44 SDK | Supabase Equivalente |
|---|---|
| `base44.entities.X.list()` | `supabase.from('x').select()` |
| `base44.entities.X.filter({})` | `supabase.from('x').select().eq()` |
| `base44.entities.X.get(id)` | `supabase.from('x').select().eq('id', id).single()` |
| `base44.entities.X.create({})` | `supabase.from('x').insert()` |
| `base44.entities.X.update(id, {})` | `supabase.from('x').update().eq('id', id)` |
| `base44.entities.X.delete(id)` | `supabase.from('x').delete().eq('id', id)` |
| `base44.entities.X.bulkCreate([])` | `supabase.from('x').insert([])` |
| `base44.entities.X.bulkUpdate([])` | `supabase.from('x').upsert([])` |
| `base44.entities.X.subscribe(cb)` | `supabase.channel('x').on('postgres_changes', cb)` |
| `base44.functions.invoke(fn, {})` | `supabase.rpc('fn', {})` |
| `base44.auth.me()` | `supabase.auth.getUser()` |
| `base44.auth.loginViaEmailPassword()` | `supabase.auth.signInWithPassword()` |
| `base44.auth.register()` | `supabase.auth.signUp()` |
| `base44.auth.logout()` | `supabase.auth.signOut()` |
| `base44.auth.updateMe()` | `supabase.rpc('update_profile', { p_updates })`; mídia via RPCs próprios (contrato 20260920010000/20260920011000) |
| `base44.integrations.Core.UploadFile()` | `supabase.storage.from('bucket').upload()` |
| `base44.integrations.Core.InvokeLLM()` | External API call (OpenAI/Anthropic) |
| `base44.integrations.Core.SendEmail()` | External (Resend/Postmark) |

### 5.4 — RLS → Supabase Policies

| Base44 RLS Pattern | Supabase Policy |
|---|---|
| `created_by: "{{user.email}}"` | `auth.jwt() ->> 'email' = created_by` |
| `data.user_email: "{{user.email}}"` | `auth.jwt() ->> 'email' = user_email` |
| `user_condition: { role: "admin" }` | `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` |
| `$or: [data.status = "publicado", admin]` | `status = 'publicado' OR is_admin()` |
| `data.active = true` (read) | `active = true OR is_admin()` |

---

## PARTE 6 — DADOS LEGADOS E DESCARTÁVEIS

### Entidades Descartáveis (não migrar)
- **CatalogSync** — substituída por DynamicWork + WorkRelease + ExternalMapping
- **MediaWork** — substituída por DynamicWork/WorkRelease (usada apenas em admin CatalogManager legado)

### Campos Legados (migrar com cuidado)
- **AnimeEntry.season_mal_id** — fallback legado, `release_id` é canônico
- **News.image_url** — substituído por banner/card/article_image_url
- **News.source_url/source_name** — substituído por `sources[]`
- **DynamicWork.seasons[]** — JSON legado, dados já migrados para WorkRelease
- **DynamicWork.source** — metadado de sync ("jikan")

### Dados de Teste/Desenvolvimento
- **XpEvent com event_type=legacy_migration** — baseline de migração de XP legado (excluído do ranking)
- **SyncRun/SyncLog** — dados de observabilidade, podem ser truncados na migração

---

## PARTE 7 — PROBLEMAS CONHECIDOS E DÍVIDA TÉCNICA

1. **714 DynamicWork sem WorkRelease** — dívida de migração
2. **110 AnimeEntry sem release_id** — backfill pendente
3. **102 grupos DynamicWork com slugs duplicados** — colisão de slug
4. **4 achievements não computáveis no backend** — five_genres, first_comment, streak_weeks_4, same_day_complete
5. **AniList API bloqueada de datacenter** — sync deve rodar de frontend/proxy
6. **Race condition idempotência** — filter→create não atômico no Base44 (Supabase UNIQUE constraint resolve)
7. **Base44 sem field-level RLS** — cliente pode atualizar AnimeEntry diretamente (risco residual, XP só via backend)
8. **Community.members_count vs members[]** — dessincronização possível
9. **User não pode ser criado via SDK** — apenas invites (Supabase: auth.signUp)

---

**FIM DO DOCUMENTO CANÔNICO**
