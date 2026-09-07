# Mapa de Entidades e Dependências Base44

**Data:** 2026-09-07
**Fase:** Preparação para migração Base44 → Lovable + Supabase

---

## 1. MAPA DAS ENTIDADES

### 1.1 Hierarquia de Catálogo

```
DynamicWork (franchise-mãe)
  │
  ├──→ WorkRelease (temporada/edição específica)
  │      │
  │      └──→ ExternalMapping (identidade externa: MAL, AniList, TMDB, TVDB)
  │
  └──→ [denormalizado] franchise_score, franchise_poster_url, score, episodes
```

### 1.2 Progresso do Usuário

```
User (built-in Base44)
  │
  ├──→ UserProfile (perfil estendido, 1:1 por user_email)
  │
  ├──→ AnimeEntry (lista pessoal, N por usuário)
  │      │
  │      ├──→ WorkRelease (via release_id — novo canônico)
  │      └──→ DynamicWork (via season_mal_id — fallback legado)
  │
  ├──→ UserAchievement (conquistas desbloqueadas)
  └──→ XpEvent (histórico de XP)
```

### 1.3 Sincronização (admin-only)

```
SyncRun (execução de sync)
  │
  └──→ SyncLog (N logs por run, um por release processado)

SyncConflict (conflitos de match fuzzy — informativo)
```

### 1.4 Social

```
User
  ├──→ Friendship (amizades entre usuários)
  ├──→ Post → Comment (feed + comentários)
  ├──→ Community → Post (comunidades)
  ├──→ SocialEvent → EventComment (eventos sociais)
  ├──→ WatchTogether (convites para assistir juntos)
  ├──→ DirectMessage (mensagens privadas)
  ├──→ Notification (notificações)
  ├──→ ActivityFeed (atividade social)
  └──→ Debate (debates da comunidade)
```

### 1.5 CMS / Admin

```
News (notícias)
CardOverride (overrides de card por categoria)
WorkCategoryVisibility (visibilidade por categoria)
CatalogSync (sync legado por slug)
MediaWork (obras estáticas — legado)
FanArt (arte de fãs)
PlatformBanner (banners promocionais)
LoginBackgroundImage (imagens de fundo do login)
SiteConfig (configuração do site)
Achievement (definições de conquistas)
WorkSuggestion (sugestões de obras)
ContentReport (moderação)
```

---

## 2. CLASSIFICAÇÃO DE CAMPOS POR ENTIDADE

### 2.1 DynamicWork

| Tipo | Campos |
|------|--------|
| **Identidade** | id, slug, title, title_pt, categories, mal_id, manga_mal_id, franchise_id, franchise_title |
| **Catálogo (canônico)** | romaji_title, genres, year, is_currently_airing |
| **Editoriais (admin)** | synopsis, is_trending, trending_rank, related_franchise_id |
| **Derivados (denormalizados)** | score, episodes, anime_status, franchise_poster_url, franchise_score, popularity_rank, release_count, sync_release_completed |
| **Legacy** | duration, season, image_url, seasons (JSON string) |
| **Sistema** | sync_status, last_synced_at, created_date, updated_date, created_by_id |

### 2.2 WorkRelease

| Tipo | Campos |
|------|--------|
| **Identidade** | id, slug, group_id, group_slug |
| **Catálogo (canônico)** | title_romaji, title_english, title_native, format, season, season_year, episode_count, chapter_count, duration_minutes, status, is_special, is_movie, cover_url, banner_url, score, popularity, trending_score |
| **Editoriais (admin)** | title, synopsis, category, is_main_entry, release_order, display_order, is_live_action, trending_rank |
| **Derivados** | (nenhum — release é folha) |
| **Sistema** | sync_status, last_synced_at, created_date, updated_date, created_by_id |

### 2.3 ExternalMapping

| Tipo | Campos |
|------|--------|
| **Identidade** | id, provider, provider_id, provider_type, provider_url |
| **Relacionamento** | work_group_id, work_release_id |
| **Sistema** | confidence_score, verified_by_admin, last_synced_at, created_date, updated_date, created_by_id |

### 2.4 AnimeEntry

| Tipo | Campos |
|------|--------|
| **Identidade** | id, title, type |
| **Progresso** | status, current_episode, total_episodes, current_chapter, total_chapters, rating, notes |
| **Relacionamento** | release_id (canônico), season_mal_id (fallback legado) |
| **Future-proofing** | external_provider, external_provider_id, external_provider_type |
| **Display** | cover_url, genre |
| **Sistema** | created_date, updated_date, created_by_id |

---

## 3. DEPENDÊNCIAS DO BASE44 — MAPEAMENTO POR ARQUIVO

### 3.1 Núcleo SDK

| Arquivo | Dependência Base44 | Classificação |
|---------|-------------------|---------------|
| `src/api/base44Client.js` | `createClient` de `@base44/sdk`, `appParams` (appId, token, functionsVersion, appBaseUrl) | **C — reescrever** (Supabase client: `createClient` de `@supabase/supabase-js`) |
| `src/lib/AuthContext.jsx` | `base44.auth.me()`, `base44.auth.logout()`, `base44.auth.redirectToLogin()`, `createAxiosClient` de `@base44/sdk/dist/utils/axios-client`, app public settings via API `/api/apps/public` | **C — reescrever** (Supabase Auth: `supabase.auth.getSession()`, `signOut()`, OAuth redirects) |
| `src/lib/app-params.js` | `appId`, `token`, `functionsVersion`, `appBaseUrl` (injetados pelo runtime Base44) | **C — reescrever** (env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |

### 3.2 Contextos e Providers

| Arquivo | Dependência | Classificação |
|---------|------------|---------------|
| `src/contexts/CatalogContext.jsx` | `base44.entities.CatalogSync.list()`, `base44.entities.DynamicWork.list()`, `base44.entities.WorkRelease.list()` | **B — adapter** (Supabase queries: `supabase.from('dynamic_works').select()`) |
| `src/context/CardOverridesContext.jsx` | `base44.entities.CardOverride.list()` | **B — adapter** |
| `src/lib/AuthContext.jsx` | (ver 3.1) | **C** |

### 3.3 Hooks (data fetching)

| Arquivo | Dependência | Classificação |
|---------|------------|---------------|
| `src/hooks/useCatalogSync.js` | `base44.entities.CatalogSync.list()` | **B — adapter** |
| `src/hooks/useSortedWorks.js` | `base44.entities.*` via CatalogContext | **A — fácil** (consome contexto) |
| `src/hooks/useCardOverrides.js` | `base44.entities.CardOverride` | **B — adapter** |
| `src/hooks/useSiteConfig.js` | `base44.entities.SiteConfig` | **B — adapter** |
| `src/hooks/useAchievementSound.js` | `base44.entities.SiteConfig`, `base44.entities.UserProfile` | **B — adapter** |
| `src/hooks/useAchievementToasts.js` | `base44.entities.UserAchievement`, `base44.entities.Achievement` | **B — adapter** |
| `src/hooks/useGlobalSearch.js` | `base44.entities.UserProfile`, `base44.entities.Community`, `base44.entities.SocialEvent`, `base44.entities.DynamicWork` | **B — adapter** |
| `src/hooks/useVisibilityFilter.js` | `base44.entities.WorkCategoryVisibility` | **B — adapter** |
| `src/hooks/useAutoImageRefresh.js` | `base44.entities.*` | **B — adapter** |
| `src/hooks/useUrlParam.js` | Nenhuma (URL only) | **A — fácil** (portável direto) |

### 3.4 Libs (lógica de negócio)

| Arquivo | Dependência | Classificação |
|---------|------------|---------------|
| `src/lib/social.js` | `base44.entities.Friendship`, `Notification`, `WatchTogether`, `ActivityFeed` (create/update) | **B — adapter** |
| `src/lib/xpSystem.js` | Nenhuma (pura: cálculos de XP/level) | **A — fácil** (portável direto) |
| `src/lib/achievements.js` | Nenhuma (pura: definições de conquistas) | **A — fácil** |
| `src/lib/catalog.js` | Nenhuma (catálogo estático hardcoded) | **A — fácil** |
| `src/lib/catalogAliases.js` | Nenhuma (pura) | **A — fácil** |
| `src/lib/franchiseDetection.js` | Nenhuma (pura) | **A — fácil** |
| `src/lib/workReleases.js` | Nenhuma (pura: resolve releases de DynamicWork) | **A — fácil** |
| `src/lib/news.js` | `base44.entities.News` (list/filter/create/update) | **B — adapter** |
| `src/lib/jikan.js` | `base44.entities.CatalogSync` (upsert), fetch Jikan API | **B — adapter** |
| `src/lib/anilistClient.js` | Nenhuma (fetch AniList GraphQL puro) | **A — fácil** |
| `src/lib/anilistSync.js` | `base44.entities.*` (dry-run matching) | **B — adapter** |
| `src/lib/tmdb.js` | `process.env.VITE_TMDB_READ_ACCESS_TOKEN`, fetch TMDB API | **B — adapter** (env var já compatível) |
| `src/lib/tmdbTrending.js` | fetch TMDB API | **A — fácil** |
| `src/lib/recommendations.js` | `base44.entities.AnimeEntry`, `UserProfile` | **B — adapter** |
| `src/lib/hybridSearch.js` | `base44.entities.*` | **B — adapter** |
| `src/lib/catalogAutoSync.js` | `base44.entities.CatalogSync` | **B — adapter** |
| `src/lib/pushNotifications.js` | `base44.integrations.Core.SendPushNotification` | **C — reescrever** (FCM/APNs direto ou serviço externo) |
| `src/lib/notificationRoutes.js` | Nenhuma (pura: mapeia tipo → rota) | **A — fácil** |
| `src/lib/imageCache.js` | Nenhuma (pura) | **A — fácil** |
| `src/lib/resolveAnimeEntryRelease.js` | Nenhuma (pura) | **A — fácil** |
| `src/lib/syncFieldPolicy.js` | Nenhuma (pura: policy engine) | **A — fácil** (mirror do backend) |

### 3.5 Páginas (todas consomem base44 via hooks/contexts)

| Padrão | Classificação |
|--------|---------------|
| Todas as páginas em `src/pages/` | **A — fácil** (consomem hooks/contexts, não chamam base44 diretamente na maioria) |
| `src/pages/Admin.jsx` | **B — adapter** (chama `base44.entities.*` e `base44.functions.invoke()` diretamente) |
| `src/pages/Profile.jsx` | **B — adapter** (`base44.auth.updateMe()`, `base44.entities.UserProfile`) |
| `src/pages/ProfileSetup.jsx` | **B — adapter** (`base44.auth.updateMe()`, `base44.entities.UserProfile`) |
| `src/pages/MyList.jsx` | **B — adapter** (`base44.entities.AnimeEntry`) |
| `src/pages/ObraProfile.jsx` | **A — fácil** (consome CatalogContext) |

### 3.6 Componentes (consomem base44 via hooks)

| Padrão | Classificação |
|--------|---------------|
| Maioria dos componentes | **A — fácil** (consomem hooks/contexts) |
| `src/components/admin/*` | **B — adapter** (chamam `base44.entities.*` diretamente para CRUD admin) |
| `src/components/feed/PostCard.jsx` | **B — adapter** (`base44.entities.Post`, `Comment`) |
| `src/components/social/*` | **B — adapter** (`base44.entities.*` social) |
| `src/components/media/ProgressInput.jsx` | **B — adapter** (`base44.entities.AnimeEntry`) |

### 3.7 Backend Functions (Deno runtime)

| Arquivo | Dependência | Classificação |
|---------|------------|---------------|
| `base44/functions/anilistCatalogSync/entry.ts` | `createClientFromRequest` de `@base44/sdk`, `base44.auth.me()`, `base44.asServiceRole.entities.*`, `Response.json()` | **C — reescrever** (Supabase Edge Function: `createClient` de supabase-js, service role key, `supabase.from()`) |
| `base44/functions/malCatalogSync/entry.ts` | Idem + fetch Jikan API | **C — reescrever** |
| `base44/shared/syncFieldPolicy.ts` | Nenhuma (pura: policy engine) | **A — fácil** (portável direto) |
| `base44/shared/syncUtils.ts` | Nenhuma (pura: utilitários) | **A — fácil** |

### 3.8 Integrações Built-in

| Integração | Uso | Classificação |
|-----------|-----|---------------|
| `base44.integrations.Core.UploadFile` | Upload de imagens (avatars, banners, news, fanart) | **B — adapter** (Supabase Storage: `supabase.storage.from('bucket').upload()`) |
| `base44.integrations.Core.InvokeLLM` | Geração de conteúdo AI | **C — reescrever** (OpenAI/Anthropic API direto ou serviço externo) |
| `base44.integrations.Core.SendEmail` | Notificações por email | **B — adapter** (Resend, SendGrid, ou Supabase Edge Function com SMTP) |
| `base44.integrations.Core.SendPushNotification` | Push mobile | **C — reescrever** (FCM/APNs direto) |
| `base44.integrations.Core.GenerateImage` | Geração de imagens AI | **C — reescrever** |
| `base44.integrations.Core.GenerateSpeech` | TTS | **C — reescrever** |
| `base44.integrations.Core.GenerateVideo` | Geração de vídeo AI | **C — reescrever** |
| `base44.integrations.Core.ExtractDataFromUploadedFile` | Extração de dados | **C — reescrever** |

### 3.9 RLS / Config Específica

| Aspecto | Classificação |
|---------|---------------|
| RLS por entidade (em `base44/entities/*.jsonc`) | **C — reescrever** (Postgres RLS policies: `CREATE POLICY ... USING (...)`) |
| `{{user.email}}` template variable | **C — reescrever** (`auth.jwt() ->> 'email'` no Postgres) |
| `user_condition: { role: 'admin' }` | **C — reescrever** (`auth.jwt() ->> 'role' = 'admin'`) |
| `created_by` automático | **C — reescrever** (`DEFAULT auth.uid()` ou trigger) |
| `base44.users.inviteUser()` | **C — reescrever** (Supabase Admin API: `supabase.auth.admin.inviteUserByEmail()`) |
| `base44.analytics.track()` | **B — adapter** (PostHog, Mixpanel, ou tabela custom) |

---

## 4. RESUMO DE CLASSIFICAÇÃO

| Classe | Quantidade estimada | Descrição |
|--------|---------------------|-----------|
| **A — Fácil de portar** | ~20 arquivos | Lógica pura sem dependência de SDK (xpSystem, achievements, catalog, franchiseDetection, syncFieldPolicy, etc.) |
| **B — Precisa adapter** | ~40 arquivos | Usa `base44.entities.*` — trocar por `supabase.from()` com query builder |
| **C — Precisa reescrever** | ~10 arquivos | Auth, SDK client, backend functions, integrações built-in, RLS |

### Padrão de adapter recomendado

Criar `src/lib/supabaseAdapter.js` expondo a mesma interface de `base44.entities`:

```js
// Antes (Base44)
await base44.entities.DynamicWork.list('-created_date', 5000);

// Depois (Supabase via adapter)
await supabaseAdapter.entities.DynamicWork.list('-created_date', 5000);
// Internamente: supabase.from('dynamic_works').select('*').order('created_date', {ascending:false}).limit(5000)
```

Isso permite migrar arquivo por arquivo sem reescrever toda a lógica de negócio.