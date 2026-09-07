# Data Export Checklist — Base44 → Supabase

**Data:** 2026-09-07
**Status:** Documentação apenas. Nenhuma exportação executada nesta fase.

---

## 1. ENTIDADES PARA EXPORTAR

### 1.1 Catálogo

| # | Entidade | Quantidade Esperada | Formato | Ordem |
|---|----------|---------------------|---------|-------|
| 1 | DynamicWork | 797 | JSON (array de objetos) | 1ª (sem deps) |
| 2 | WorkRelease | 214 | JSON | 2ª (dep: DynamicWork) |
| 3 | ExternalMapping | 225 | JSON | 3ª (dep: DynamicWork, WorkRelease) |
| 4 | CatalogSync | 495 | JSON | Paralelo (legacy) |
| 5 | CardOverride | 89 | JSON | Paralelo |
| 6 | WorkCategoryVisibility | 23 | JSON | Paralelo |
| 7 | MediaWork | 0 | JSON | Paralelo (legacy, vazio) |

### 1.2 Usuário e Progresso

| # | Entidade | Quantidade Esperada | Formato | Ordem |
|---|----------|---------------------|---------|-------|
| 8 | User (emails) | 15 | CSV (email, role) | 1ª (auth) |
| 9 | UserProfile | 12 | JSON | 2ª (dep: User) |
| 10 | AnimeEntry | 127 | JSON | 3ª (dep: User, WorkRelease) |
| 11 | UserAchievement | 456 | JSON | 4ª (dep: User, Achievement) |
| 12 | XpEvent | 152 | JSON | 4ª (dep: User) |
| 13 | Achievement | 74 | JSON | 1ª (sem deps) |

### 1.3 Sincronização

| # | Entidade | Quantidade Esperada | Formato | Ordem |
|---|----------|---------------------|---------|-------|
| 14 | SyncRun | 5 | JSON | Paralelo |
| 15 | SyncLog | 27 | JSON | 2ª (dep: SyncRun) |
| 16 | SyncConflict | 0 | JSON | Paralelo (vazio) |

### 1.4 Social

| # | Entidade | Quantidade Esperada | Formato | Ordem |
|---|----------|---------------------|---------|-------|
| 17 | Friendship | 12 | JSON | 2ª (dep: User) |
| 18 | Post | 5 | JSON | 3ª (dep: User, Community) |
| 19 | Comment | 4 | JSON | 4ª (dep: Post) |
| 20 | Community | 8 | JSON | 2ª (dep: User) |
| 21 | SocialEvent | 3 | JSON | 2ª (dep: User) |
| 22 | EventComment | 4 | JSON | 4ª (dep: SocialEvent) |
| 23 | WatchTogether | 3 | JSON | 3ª (dep: User) |
| 24 | DirectMessage | 35 | JSON | 3ª (dep: User) |
| 25 | Notification | 893 | JSON | 3ª (dep: User) |
| 26 | ActivityFeed | 12 | JSON | 3ª (dep: User) |
| 27 | Debate | 4 | JSON | 1ª (sem deps) |

### 1.5 CMS / Admin

| # | Entidade | Quantidade Esperada | Formato | Ordem |
|---|----------|---------------------|---------|-------|
| 28 | News | 9 | JSON | Paralelo |
| 29 | FanArt | 2 | JSON | Paralelo |
| 30 | PlatformBanner | 0 | JSON | Paralelo (vazio) |
| 31 | LoginBackgroundImage | 0 | JSON | Paralelo (vazio) |
| 32 | SiteConfig | 1 | JSON | Paralelo |
| 33 | WorkSuggestion | 0 | JSON | Paralelo (vazio) |
| 34 | ContentReport | 0 | JSON | Paralelo (vazio) |

---

## 2. FORMATO RECOMENDADO

### 2.1 JSON (entidades de dados)

```json
[
  {
    "id": "uuid-string",
    "created_date": "2025-01-15T10:30:00.000Z",
    "updated_date": "2025-01-15T10:30:00.000Z",
    "created_by_id": "user-uuid-or-null",
    "field1": "value1",
    "field2": 123,
    "categories": "[\"anime\"]",
    "_export_source": "base44",
    "_export_date": "2026-09-07T00:00:00.000Z"
  }
]
```

### 2.2 CSV (lista de usuários)

```csv
email,role,full_name
user1@example.com,admin,User One
user2@example.com,user,User Two
```

### 2.3 Arquivos de imagem

- Exportar URLs (não baixar arquivos binários).
- Para imagens hospedadas no Base44 storage: baixar e re-uploadar para Supabase Storage.
- Mapear URLs antigas → novas URLs em tabela de tradução.

---

## 3. CAMPOS OBRIGATÓRIOS POR ENTIDADE

### 3.1 DynamicWork

| Campo | Obrigatório? | Notas |
|-------|---------------|-------|
| id | ✅ | Preservar UUID |
| slug | ✅ | Único |
| title | ✅ | |
| categories | ✅ | JSON string → jsonb |
| mal_id | ⚠️ | Nullable, mas importante para identity |
| franchise_id | ⚠️ | Nullable, mas importante para dedup |
| created_date, updated_date | ✅ | Preservar timestamps |
| created_by_id | ⚠️ | Mapear para novo user ID |

### 3.2 WorkRelease

| Campo | Obrigatório? | Notas |
|-------|---------------|-------|
| id | ✅ | Preservar UUID |
| group_id | ✅ | FK → DynamicWork.id |
| slug | ✅ | Único |
| title | ✅ | |
| category | ✅ | Enum |
| created_date, updated_date | ✅ | |

### 3.3 ExternalMapping

| Campo | Obrigatório? | Notas |
|-------|---------------|-------|
| id | ✅ | Preservar UUID |
| provider | ✅ | Enum |
| provider_id | ✅ | String |
| work_release_id | ⚠️ | FK → WorkRelease.id (nullable) |
| work_group_id | ⚠️ | FK → DynamicWork.id (nullable) |

### 3.4 AnimeEntry

| Campo | Obrigatório? | Notas |
|-------|---------------|-------|
| id | ✅ | Preservar UUID |
| title | ✅ | |
| type | ✅ | Enum |
| status | ✅ | Enum |
| release_id | ⚠️ | FK → WorkRelease.id (17/127 têm) |
| season_mal_id | ⚠️ | Fallback legado |
| created_by_id | ✅ | Mapear para novo user ID |

### 3.5 UserProfile

| Campo | Obrigatório? | Notas |
|-------|---------------|-------|
| id | ✅ | Preservar UUID |
| user_email | ✅ | Chave de join com auth.users |
| username | ✅ | |
| created_date, updated_date | ✅ | |

---

## 4. IDS E REFERÊNCIAS ENTRE ENTIDADES

### 4.1 Ordem de importação (respeitar dependências)

```
1. auth.users (criar usuários)
2. user_id_mapping (tabela de tradução base44_id → supabase_uuid)
3. achievements (sem deps)
4. dynamic_works (sem deps de catálogo)
5. work_releases (dep: dynamic_works)
6. external_mappings (dep: dynamic_works, work_releases)
7. user_profiles (dep: auth.users)
8. anime_entries (dep: auth.users, work_releases)
9. user_achievements (dep: auth.users, achievements)
10. xp_events (dep: auth.users)
11. communities (dep: auth.users)
12. friendships (dep: auth.users)
13. posts (dep: auth.users, communities)
14. comments (dep: posts)
15. social_events (dep: auth.users)
16. event_comments (dep: social_events, auth.users)
17. watch_togethers (dep: auth.users)
18. direct_messages (dep: auth.users)
19. notifications (dep: auth.users)
20. activity_feed (dep: auth.users)
21. sync_runs (sem deps)
22. sync_logs (dep: sync_runs)
23. news, fan_arts, platform_banners, etc. (sem deps de user)
```

### 4.2 Tabela de mapeamento de IDs

```sql
CREATE TABLE id_mapping (
  base44_id text PRIMARY KEY,
  supabase_id uuid NOT NULL,
  entity_type text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);
```

### 4.3 Tradução de FKs durante importação

Para cada registro importado:
1. Ler `created_by_id` (Base44 user ID).
2. Buscar em `id_mapping` → novo `auth.users.id`.
3. Substituir no registro antes de INSERT.

Para campos `*_email`: manter valor original (email não muda).
Para campos `*_id` que referenciam outras entidades: preservar UUID (não precisa traduzir).

---

## 5. VALIDAÇÕES ANTES DA IMPORTAÇÃO

### 5.1 Integridade referencial

- [ ] Todos os `WorkRelease.group_id` existem em `DynamicWork.id`.
- [ ] Todos os `ExternalMapping.work_release_id` existem em `WorkRelease.id`.
- [ ] Todos os `ExternalMapping.work_group_id` existem em `DynamicWork.id`.
- [ ] Todos os `AnimeEntry.release_id` (não-null) existem em `WorkRelease.id`.
- [ ] Todos os `SyncLog.run_id` existem em `SyncRun.run_id`.
- [ ] Todos os `Comment.post_id` existem em `Post.id`.
- [ ] Todos os `EventComment.event_id` existem em `SocialEvent.id`.

### 5.2 Unicidade

- [ ] `DynamicWork.slug` único.
- [ ] `WorkRelease.slug` único (⚠️ known issue: ~100 colisões de slug).
- [ ] `ExternalMapping (provider, provider_id)` único.
- [ ] `UserProfile.user_email` único.
- [ ] `Achievement.key` único.
- [ ] `News.slug` único.

### 5.3 Consistência de dados

- [ ] `DynamicWork.categories` é JSON string parseable.
- [ ] `DynamicWork.genres` é JSON string parseable.
- [ ] `DynamicWork.seasons` é JSON string parseable (ou null).
- [ ] `SyncRun.processed_release_ids` é JSON string de array.
- [ ] `SyncRun.errors` é JSON string de array.
- [ ] `SyncRun.summary` é JSON string de objeto.
- [ ] Enums têm valores válidos.

### 5.4 Contagens esperadas

| Entidade | Contagem Auditada | Após Importação (esperado) |
|----------|-------------------|---------------------------|
| DynamicWork | 797 | 797 |
| WorkRelease | 214 | 214 |
| ExternalMapping | 225 | 225 |
| AnimeEntry | 127 | 127 |
| SyncRun | 5 | 5 |
| SyncLog | 27 | 27 |
| SyncConflict | 0 | 0 |
| UserProfile | 12 | 12 |
| Achievement | 74 | 74 |
| UserAchievement | 456 | 456 |
| XpEvent | 152 | 152 |
| User | 15 | 15 (recriados no Supabase Auth) |
| Friendship | 12 | 12 |
| Post | 5 | 5 |
| Comment | 4 | 4 |
| Community | 8 | 8 |
| SocialEvent | 3 | 3 |
| EventComment | 4 | 4 |
| WatchTogether | 3 | 3 |
| DirectMessage | 35 | 35 |
| Notification | 893 | 893 |
| ActivityFeed | 12 | 12 |
| Debate | 4 | 4 |
| News | 9 | 9 |
| FanArt | 2 | 2 |
| PlatformBanner | 0 | 0 |
| LoginBackgroundImage | 0 | 0 |
| SiteConfig | 1 | 1 |
| WorkSuggestion | 0 | 0 |
| ContentReport | 0 | 0 |
| CatalogSync | 495 | 495 |
| CardOverride | 89 | 89 |
| WorkCategoryVisibility | 23 | 23 |
| MediaWork | 0 | 0 |

---

## 6. VALIDAÇÕES DEPOIS DA IMPORTAÇÃO

### 6.1 Contagens

- [ ] Contagem de cada tabela Supabase = contagem Base44 exportada.
- [ ] Zero registros órfãos (FKs válidas).

### 6.2 Integridade

- [ ] `SELECT count(*) FROM work_releases wr LEFT JOIN dynamic_works dw ON wr.group_id = dw.id WHERE dw.id IS NULL` → 0.
- [ ] `SELECT count(*) FROM anime_entries ae LEFT JOIN auth.users u ON ae.user_id = u.id WHERE u.id IS NULL` → 0.
- [ ] `SELECT count(*) FROM external_mappings em LEFT JOIN work_releases wr ON em.work_release_id = wr.id WHERE em.work_release_id IS NOT NULL AND wr.id IS NULL` → 0.

### 6.3 Funcional

- [ ] Login funciona com usuários migrados.
- [ ] Catálogo carrega (DynamicWork + WorkRelease).
- [ ] Lista pessoal carrega (AnimeEntry por user).
- [ ] Perfis carregam (UserProfile por user).
- [ ] Social funciona (Friendship, Post, Comment).

### 6.4 RLS

- [ ] Usuário não-admin não consegue ler AnimeEntry de outro usuário.
- [ ] Usuário não-admin não consegue escrever em DynamicWork.
- [ ] News com status='rascunho' não aparece publicamente.
- [ ] DirectMessage só visível para sender/receiver.

---

## 7. ESTRATÉGIA DE EXPORTAÇÃO

### 7.1 Método recomendado

1. **Não usar** o tool `import_data` (append-only, não faz upsert).
2. Usar `exec_tool` com SDK para exportar cada entidade como JSON.
3. Salvar arquivos JSON localmente (ou em storage temporário).
4. Transformar dados (traduzir FKs, converter JSON strings).
5. Importar no Supabase via `supabase.from('table').insert()` ou bulk SQL.

### 7.2 Ordem de exportação

```
1. Exportar Users (lista de emails + roles) — via dashboard ou API.
2. Exportar entidades sem deps (DynamicWork, Achievement, etc.).
3. Exportar entidades com deps (WorkRelease, ExternalMapping, etc.).
4. Exportar entidades de usuário (UserProfile, AnimeEntry, etc.).
5. Exportar entidades sociais (Post, Comment, etc.).
6. Exportar CMS (News, FanArt, etc.).
7. Exportar Sync (SyncRun, SyncLog).
```

### 7.3 Backup

- [ ] Antes de qualquer migração, fazer backup completo de todas as entidades.
- [ ] Armazenar backups em local seguro (não no próprio Base44).
- [ ] Validar que backups podem ser restaurados.

### 7.4 Janela de manutenção

- [ ] Comunicar downtime aos usuários.
- [ ] Congelar writes durante migração (ou aceitar perda de dados pós-ponto-de-corte).
- [ ] Definir ponto de corte (timestamp): dados antes = migrados, dados depois = perdos ou re-sync.