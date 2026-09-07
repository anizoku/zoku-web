# Pre-Migration Validation Report

**Data:** 2026-09-07
**Fase:** Validação Pré-Migração (antes de criar estrutura no Supabase)
**Status:** Documentação apenas. Nenhuma migração executada.

---

## RESUMO EXECUTIVO

A validação revelou **3 correções críticas** no Migration Manifest original:

1. **IDs NÃO são UUID** — São MongoDB ObjectId (24-char hex). Devem ser preservados como `TEXT PRIMARY KEY`, não `uuid`.
2. **WorkRelease tem 0 slugs duplicados** (não ~100 como relatado anteriormente). As colisões estão em **DynamicWork** (102 grupos, 205 registros).
3. **AnimeEntry 102→127 é atividade normal de usuário** — 25 registros criados em 2026-09-06 por usuários reais.

**Princípio confirmado: PRESERVAÇÃO > NORMALIZAÇÃO.** A primeira migração deve reproduzir o estado atual com mínima transformação.

---

## 1. IDs ATUAIS PODEM SER ARMAZENADOS COMO UUID?

### ❌ NÃO

Todos os IDs no Base44 são **MongoDB ObjectId** (24 caracteres hex, ex: `6a5074d40366340112f3fbb2`), não UUID RFC 4122.

### Auditoria por entidade

| Entidade | Sample ID | Comprimento | Formato | UUID válido? |
|----------|-----------|-------------|---------|---------------|
| DynamicWork | `6a5074d40366340112f3fbb2` | 24 | ObjectId hex | ❌ Não |
| WorkRelease | `6a9bbdcb6e1c8e3f18eb7211` | 24 | ObjectId hex | ❌ Não |
| ExternalMapping | `6a8ba19fd17fe34f5a329bee` | 24 | ObjectId hex | ❌ Não |
| AnimeEntry | `6a9d0ba354824187fe114656` | 24 | ObjectId hex | ❌ Não |
| UserProfile | `6a9d081c2ec23aaf1eecfd2a` | 24 | ObjectId hex | ❌ Não |
| Post | `6a4e85c769b8bd97bcb1067d` | 24 | ObjectId hex | ❌ Não |
| Comment | `69fa03304d1bc402d120490c` | 24 | ObjectId hex | ❌ Não |
| Community | `69f8a08416de28fb78e4eec7` | 24 | ObjectId hex | ❌ Não |
| SyncRun | `6a9e4a8136c1d255323f3347` | 24 | ObjectId hex | ❌ Não |
| SyncLog | `6a9e4ac33c8d156af8cac3bf` | 24 | ObjectId hex | ❌ Não |

### Estratégia de ID definida

| Tabela Supabase | Tipo PK | FKs correspondentes | Novo user_id |
|-----------------|---------|---------------------|--------------|
| `dynamic_works` | `TEXT PRIMARY KEY` | — | — |
| `work_releases` | `TEXT PRIMARY KEY` | `group_id TEXT FK → dynamic_works(id)` | — |
| `external_mappings` | `TEXT PRIMARY KEY` | `work_release_id TEXT FK`, `work_group_id TEXT FK` | — |
| `anime_entries` | `TEXT PRIMARY KEY` | `release_id TEXT FK` | `user_id UUID FK → auth.users(id)` |
| `user_profiles` | `TEXT PRIMARY KEY` | — | `user_id UUID FK → auth.users(id)` |
| `sync_runs` | `TEXT PRIMARY KEY` | — | — |
| `sync_logs` | `TEXT PRIMARY KEY` | `run_id TEXT FK → sync_runs(run_id)` | — |
| `posts` | `TEXT PRIMARY KEY` | `community_id TEXT FK` | `user_id UUID FK → auth.users(id)` |
| `comments` | `TEXT PRIMARY KEY` | `post_id TEXT FK`, `parent_id TEXT FK` | `user_id UUID FK → auth.users(id)` |
| `communities` | `TEXT PRIMARY KEY` | — | `user_id UUID FK → auth.users(id)` |
| (todas as demais) | `TEXT PRIMARY KEY` | TEXT FKs | `user_id UUID` onde houver relação com auth.users |

### Regras

1. **Preservar IDs Base44 como TEXT** — não converter para UUID.
2. **Usar TEXT PRIMARY KEY** em todas as tabelas migradas.
3. **Usar TEXT nas foreign keys** correspondentes.
4. **NÃO gerar novos IDs** para entidades existentes durante a primeira migração.
5. **Supabase `auth.users`** continua usando UUID próprio (built-in).
6. **Adicionar `user_id UUID`** apenas onde houver relação com `auth.users` (novo campo, não substitui o email legado).

---

## 2. POR QUE ANIMEENTRY PASSOU DE 102 PARA 127?

### Resposta: Atividade normal de usuário (Opção A)

### Evidência

Os 25 registros mais recentes foram criados em **2026-09-06** (um dia antes da auditoria atual), por usuários reais adicionando obras às suas listas.

### Os 25 registros adicionais

| # | created_date | created_by_id | title | type | status |
|---|-------------|---------------|-------|------|--------|
| 1 | 2026-09-06T06:43 | 6a9d076b... | Pokémon | anime | completed |
| 2 | 2026-09-06T06:41 | 69f3e9ac... | Medabots | anime | completed |
| 3 | 2026-09-06T06:41 | 6a9d076b... | Naruto Shippuden the Movie 7: The Last | anime | completed |
| 4 | 2026-09-06T06:41 | 6a9d076b... | Tokyo Ghoul | anime | on_hold |
| 5 | 2026-09-06T06:39 | 6a9d076b... | Tokyo Revengers | anime | watching |
| 6 | 2026-09-06T06:39 | 6a9d076b... | Kuroko's Basketball | anime | completed |
| 7 | 2026-09-06T06:37 | 6a9d076b... | The Eminence in Shadow | anime | completed |
| 8 | 2026-09-06T06:36 | 6a9d076b... | Dr. Stone | anime | completed |
| 9 | 2026-09-06T06:35 | 6a9d076b... | Kaiju No. 8 | anime | watching |
| 10 | 2026-09-06T06:35 | 6a9d076b... | Mushoku Tensei | anime | completed |
| 11 | 2026-09-06T06:34 | 6a9d076b... | Gachiakuta | anime | on_hold |
| 12 | 2026-09-06T06:33 | 6a9d076b... | Cyberpunk: Edgerunners | anime | completed |
| 13 | 2026-09-06T06:33 | 6a9d076b... | Vinland Saga | anime | completed |
| 14 | 2026-09-06T06:32 | 6a9d076b... | One Piece | anime | watching |
| 15 | 2026-09-06T06:32 | 6a9d076b... | Demon Slayer | anime | watching |
| 16 | 2026-09-06T06:32 | 6a9d076b... | Demon Slayer | anime | completed |
| 17 | 2026-09-06T06:31 | 6a9d076b... | DAN DA DAN (Mangá) | manga | completed |
| 18 | 2026-09-06T06:30 | 6a9d076b... | Attack on Titan (Mangá) | manga | completed |
| 19 | 2026-09-06T06:30 | 6a9d076b... | Bleach: TYBW | anime | on_hold |
| 20 | 2026-09-06T06:30 | 6a9d076b... | The Apothecary Diaries S2 | anime | on_hold |
| 21-25 | 2026-09-06T06:2x | 6a9d076b... | (continuação) | anime | various |

### Análise

- **Usuário dominante:** `6a9d076b8d2e67ec684a6b18` criou ~23 dos 25 registros (um único usuário adicionando muitas obras em sessão rápida).
- **Usuário secundário:** `69f3e9aceb93e54f14e5790a` criou 1 registro (Medabots).
- **Não são duplicados** — cada registro tem title e status diferentes.
- **Não são dados de teste** — títulos são obras reais de anime/manga.
- **Todos têm `release_id=null` e `season_mal_id=null`** — esperado, pois o backfill de release_id ainda não cobre essas obras.

### Conclusão

**Causa A: Criação normal por usuários desde a auditoria anterior.** Um usuário ativo adicionou ~23 obras à sua lista em uma sessão. Nenhum dado precisa ser corrigido ou excluído.

---

## 3. ONDE REALMENTE EXISTEM COLISÕES DE SLUG?

### Correção importante

O relatório anterior afirmava "~100 colisões de slug em WorkRelease". **Isso estava incorreto.**

### DynamicWork

| Métrica | Valor |
|---------|-------|
| Total | 797 |
| Slugs únicos | 694 |
| **Grupos de slugs duplicados** | **102** |
| **Registros envolvidos em duplicatas** | **205** |

### Exemplos de slugs duplicados em DynamicWork

| Slug | Count | IDs |
|------|-------|-----|
| rezero--starting-life-in-another-world- | 2 | 6a4d5393..., 6a2f67b1... |
| the-ghost-in-the-shell | 2 | 6a4435d1..., 6a2f686a... |
| smoking-behind-the-supermarket-with-you | 2 | 6a4435c3..., 6a2f67e8... |
| bakemonogatari | 2 | 6a3172d5..., 6a2f687e... |
| is-it-wrong-to-try-to-pick-up-girls-in-a-dungeon | 2 | 6a2f68b9..., 6a2bb114... |
| toradora | 2 | 6a2f68b0..., 6a2bb0f2... |
| drifters | 2 | 6a2f689d..., 6a2bb1d7... |
| three-days-of-happiness | 2 | 6a2f6892..., 6a2f6786... |
| that-time-i-got-reincarnated-as-a-slime | 2 | 6a2f6884..., 6a2bb114... |
| trigun | 2 | 6a2f687b..., 6a2bb182... |

### WorkRelease

| Métrica | Valor |
|---------|-------|
| Total | 214 |
| Slugs únicos | 214 |
| **Grupos de slugs duplicados** | **0** |
| **Registros envolvidos em duplicatas** | **0** |

### ExternalMapping

| Métrica | Valor |
|---------|-------|
| Total | 225 |
| Duplicatas de (provider, provider_id, provider_type) | **0** |
| Duplicatas de (provider, provider_id) | **0** |

### Conclusão

- **WorkRelease: ZERO colisões de slug.** Pode usar `UNIQUE(slug)` no Postgres.
- **DynamicWork: 102 grupos duplicados (205 registros).** NÃO pode usar `UNIQUE(slug)`. Opções:
  - Usar `UNIQUE(slug)` apenas em WorkRelease.
  - Em DynamicWork, resolver duplicatas pós-migração (fase de normalização, não primeira migração).
  - Ou usar constraint composta `UNIQUE(slug, franchise_id)` se aplicável.
- **ExternalMapping: ZERO duplicatas.** Pode usar `UNIQUE(provider, provider_id)`.

---

## 4. CONTAGENS COMPLETAS DE TODAS AS ENTIDADES

### Catálogo

| Entidade | Total | Com WorkRelease | Sem WorkRelease |
|----------|-------|-----------------|-----------------|
| DynamicWork | 797 | 83 | 714 |
| WorkRelease | 214 | — | — |
| ExternalMapping | 225 | — | — |
| CatalogSync | 495 | — | — |
| CardOverride | 89 | — | — |
| WorkCategoryVisibility | 23 | — | — |
| MediaWork | 0 | — | — |

### Usuário e Progresso

| Entidade | Total |
|----------|-------|
| User (built-in) | 15 |
| UserProfile | 12 |
| AnimeEntry | 127 |
| Achievement | 74 |
| UserAchievement | 456 |
| XpEvent | 152 |

### Social

| Entidade | Total |
|----------|-------|
| Friendship | 12 |
| Post | 5 |
| Comment | 4 |
| Community | 8 |
| SocialEvent | 3 |
| EventComment | 4 |
| WatchTogether | 3 |
| DirectMessage | 35 |
| Notification | 893 |
| ActivityFeed | 12 |
| Debate | 4 |

### CMS / Admin

| Entidade | Total |
|----------|-------|
| News | 9 |
| FanArt | 2 |
| PlatformBanner | 0 |
| LoginBackgroundImage | 0 |
| SiteConfig | 1 |
| WorkSuggestion | 0 |
| ContentReport | 0 |

### Sincronização

| Entidade | Total |
|----------|-------|
| SyncRun | 5 |
| SyncLog | 27 |
| SyncConflict | 0 |

### ExternalMapping por provider

| Provider | Quantidade |
|----------|-----------|
| mal | 214 |
| anilist | 11 |
| tmdb | 0 |
| thetvdb | 0 |

### User built-in — o que é possível obter

| Dado | Obtível via Base44? | Método |
|------|---------------------|--------|
| Lista de usuários (email, role, full_name) | ✅ Sim | `base44.entities.User.list()` |
| ID de cada usuário | ✅ Sim | ObjectId (24-char hex, não UUID) |
| Email | ✅ Sim | Campo `email` |
| Role | ✅ Sim | Campo `role` ('admin' ou 'user') |
| full_name | ✅ Sim | Campo `full_name` |
| created_date | ✅ Sim | Built-in |
| Senha / hash | ❌ Não | Não exposto, não portável |
| OAuth tokens | ❌ Não | Gerenciado pelo Base44 |
| Sessões ativas | ❌ Não | Gerenciado pelo Base44 |

**Estratégia User:** Exportar lista de 15 usuários (email + role + full_name). Recriar no Supabase Auth via `createUser({ email })` sem senha (usuário recebe link de setup). Preservar `created_by_id` original como TEXT em `id_mapping` para tradução de FKs.

---

## 5. REFERÊNCIAS DE USUÁRIO — MAPEAMENTO COMPLETO

### Campos que referenciam usuário por entidade

| Entidade | Campo | Tipo | Estratégia |
|----------|-------|------|------------|
| (todas) | `created_by_id` | TEXT (ObjectId) | A: preservar legado + B: adicionar `created_by UUID` |
| UserProfile | `user_email` | TEXT (email) | A: preservar + B: adicionar `user_id UUID` |
| AnimeEntry | `created_by_id` | TEXT | A + B |
| Notification | `recipient_email` | TEXT (email) | A + B: adicionar `recipient_id UUID` |
| Notification | `from_email` | TEXT (email) | A: preservar (informativo) |
| Friendship | `requester_email` | TEXT (email) | A + B: adicionar `requester_id UUID` |
| Friendship | `receiver_email` | TEXT (email) | A + B: adicionar `receiver_id UUID` |
| Post | `created_by_id` | TEXT | A + B |
| Comment | `created_by_id` | TEXT | A + B |
| Community | `creator_email` | TEXT (email) | A + B: adicionar `creator_id UUID` |
| Community | `members` | TEXT[] (emails) | A: preservar array de emails |
| SocialEvent | `organizer_email` | TEXT (email) | A + B: adicionar `organizer_id UUID` |
| SocialEvent | `participants` | TEXT[] (emails) | A: preservar array |
| EventComment | `author_email` | TEXT (email) | A + B: adicionar `author_id UUID` |
| WatchTogether | `initiator_email` | TEXT (email) | A + B: adicionar `initiator_id UUID` |
| WatchTogether | `friend_email` | TEXT (email) | A + B: adicionar `friend_id UUID` |
| DirectMessage | `sender_email` | TEXT (email) | A + B: adicionar `sender_id UUID` |
| DirectMessage | `receiver_email` | TEXT (email) | A + B: adicionar `receiver_id UUID` |
| ActivityFeed | `actor_email` | TEXT (email) | A + B: adicionar `actor_id UUID` |
| ActivityFeed | `target_email` | TEXT (email) | A + B: adicionar `target_id UUID` |
| XpEvent | `user_email` | TEXT (email) | A + B: adicionar `user_id UUID` |
| UserAchievement | `user_email` | TEXT (email) | A + B: adicionar `user_id UUID` |
| WorkSuggestion | `suggested_by_email` | TEXT (email) | A + B: adicionar `suggested_by_id UUID` |
| ContentReport | `reported_by_email` | TEXT (email) | A + B: adicionar `reported_by_id UUID` |
| ContentReport | `author_email` | TEXT (email) | A: preservar (informativo) |
| News | `author_id` | TEXT | A: preservar (informativo, não é auth.users) |
| News | `author_name` | TEXT | A: preservar (snapshot) |

### Estratégia por campo

| Estratégia | Descrição |
|-----------|-----------|
| **A — Preservar legado** | Manter campo `*_email` ou `created_by_id` original como TEXT. Não remover na primeira migração. |
| **B — Adicionar user_id UUID** | Adicionar novo campo `*_id UUID FK → auth.users(id)`. Preencher durante importação via `email → auth.users.id` lookup. |
| **C — Resolver email → auth.users.id** | Durante importação: para cada `*_email`, buscar `auth.users.id` onde `email = valor`. Preencher `*_id`. |

### Ordem de resolução

1. Criar `auth.users` no Supabase (via `createUser` com email).
2. Criar tabela `id_mapping(base44_user_id TEXT, supabase_user_id UUID, email TEXT)`.
3. Para cada entidade com campo `*_email`:
   a. Ler `*_email` do registro Base44.
   b. Buscar `supabase_user_id` em `id_mapping` por email.
   c. Preencher `*_id` (novo campo UUID) com o `supabase_user_id`.
4. Para `created_by_id` (ObjectId):
   a. Buscar em `id_mapping` por `base44_user_id`.
   b. Preencher `created_by` (novo campo UUID).

### Campos que NÃO devem ter FK obrigatória na primeira migração

- `created_by_id` → `created_by`: fazer nullable inicialmente (alguns registros podem ter `created_by_id` que não mapeia para usuário existente).
- `from_email` (Notification): não criar FK (informativo, pode ser email não-registrado).
- `author_email` (ContentReport): não criar FK (informativo).
- `author_id` (News): não criar FK para auth.users (é snapshot de ID interno, não auth.users).
- `members` (Community): array de emails, não criar FK (preservar como `text[]`).

---

## 6. QUANTOS ARQUIVOS BASE44 STORAGE PRECISAM SER MIGRADOS?

### Total: 57 URLs Base44 Storage

| Entidade | Campo | Quantidade | Tipo |
|----------|-------|-----------|------|
| UserProfile | `avatar_url` + `banner_url` | 15 | Avatares e banners de perfil |
| News | `image_url` + `banner_image_url` + `card_image_url` + `article_image_url` | 37 | Imagens de notícias (4 campos por notícia) |
| FanArt | `image_url` | 2 | Arte de fãs |
| SiteConfig | `logo_compact_url` + `logo_full_url` | 2 | Logos do site |
| Post | `image_url` | 1 | Imagem de post |
| **TOTAL** | | **57** | |

### URLs externas (não precisam migração)

| Tipo | Quantidade | Origem |
|------|-----------|--------|
| MAL_EXTERNAL | 1092 | `cdn.myanimelist.net` (covers de DynamicWork + WorkRelease) |
| YOUTUBE_EXTERNAL | 3 | `youtube.com` (videos de News) |
| OTHER_EXTERNAL | 1 | URL externa avulsa (AnimeEntry cover) |

### Padrão de URL Base44 Storage

```
https://base44.app/api/apps/{app_id}/files/mp/public/{app_id}/{file_hash}_{filename}
```

Exemplo: `https://base44.app/api/apps/69f36ad625ae768ae51fc819/files/mp/public/69f36ad625ae768ae51fc819/4ff7524b5_WallpaperEngineL`

### Estratégia de migração de storage

1. Baixar cada uma das 57 URLs Base44 (HTTP GET).
2. Uploadar para Supabase Storage bucket (`public-assets`).
3. Atualizar URL na tabela correspondente (substituir domínio base44.app → novo domínio Supabase).
4. Criar tabela `url_mapping(base44_url TEXT, supabase_url TEXT)` para rastreabilidade.

### Entidades afetadas

| Entidade | Campos a atualizar |
|----------|-------------------|
| UserProfile | `avatar_url`, `banner_url` |
| News | `image_url`, `banner_image_url`, `card_image_url`, `article_image_url` |
| FanArt | `image_url` |
| SiteConfig | `logo_compact_url`, `logo_full_url` |
| Post | `image_url` |

---

## 7. CORREÇÕES NO MANIFEST

### Mudanças aplicadas

1. **IDs: UUID → TEXT** — Todas as PKs e FKs de entidades migradas usam `TEXT` (MongoDB ObjectId), não `uuid`. Apenas `auth.users.id` e novos campos `*_id` de referência a auth.users usam `UUID`.

2. **Slug collisions: WorkRelease → DynamicWork** — Corrigido: WorkRelease tem 0 duplicatas (pode usar `UNIQUE(slug)`). DynamicWork tem 102 grupos duplicados (não pode usar `UNIQUE(slug)` na primeira migração).

3. **Contagens: todos ~TBD eliminados** — 33 entidades com contagens reais.

4. **User references: preservar emails + adicionar user_id UUID** — Não remover campos `*_email` na primeira migração. Adicionar `*_id UUID` nullable para FK com auth.users.

5. **Storage: 57 URLs Base44 identificadas** — Mapeamento por entidade e campo.

6. **Princípio: PRESERVAÇÃO > NORMALIZAÇÃO** — Primeira migração reproduz estado atual com mínima transformação. Normalizações maiores (slug dedup, JSON→jsonb, FKs obrigatórias) ficam para fase posterior.

---

## 8. A MIGRAÇÃO CONTINUA GO APÓS ESSAS VERIFICAÇÕES?

### ✅ SIM — GO (com correções aplicadas)

### Justificativa

| Verificação | Resultado | Impacto na migração |
|-------------|-----------|---------------------|
| IDs são UUID? | ❌ Não (ObjectId) | Corrigido: usar TEXT PK |
| AnimeEntry 102→127 explicado? | ✅ Sim (atividade normal) | Nenhum impacto |
| Colisões de slug identificadas? | ✅ Sim (DynamicWork, não WorkRelease) | Corrigido: UNIQUE apenas onde válido |
| Contagens completas? | ✅ Sim (33 entidades) | Nenhum TBD restante |
| Referências de usuário mapeadas? | ✅ Sim | Estratégia A+B+C definida |
| Storage URLs identificadas? | ✅ Sim (57 URLs) | Plano de migração definido |

### Riscos atualizados

| Risco | Nível anterior | Nível atualizado | Mudança |
|-------|---------------|-----------------|---------|
| IDs não-UUID | Não identificado | **Médio** | Novo risco — TEXT PK é viável mas menos ideal que UUID |
| Colisões de slug | Alto (WorkRelease) | **Baixo** (WorkRelease) / Médio (DynamicWork) | Reduzido — WorkRelease limpo |
| Migração de usuários | Crítico | Crítico | Inalterado |
| 714 DynamicWork sem WorkRelease | Alto | Alto | Inalterado |
| Storage URLs | Médio | **Baixo** | Apenas 57 URLs, gerenciável |

### Bloqueadores críticos

**Nenhum.** Todas as correções são aplicáveis no plano de migração sem exigir mudanças de dados no Base44.

### Próximos passos recomendados (atualizados)

1. **Criar projeto Supabase e executar DDL corrigido** — Usar `TEXT PRIMARY KEY` (não UUID), `TEXT` nas FKs entre entidades migradas, `UUID` apenas em `*_id` que referenciam `auth.users`.
2. **Criar adapter layer** — `supabaseClient.js` + `supabaseAdapter.js` com mesma interface de `base44.entities`.
3. **Exportar dados em ordem de dependência** — Seguir `dataExportChecklist.md` com contagens reais. Recriar 15 usuários no Supabase Auth. Criar `id_mapping`. Importar com TEXT IDs preservados.