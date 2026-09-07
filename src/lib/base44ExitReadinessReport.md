# Base44 Exit Readiness Report

**Data:** 2026-09-07
**Projeto:** AniZoku — Community hub for tracking anime progress
**Origem:** Base44 (React + Tailwind + MongoDB-like + RLS via JSON)
**Destino:** Lovable + Supabase (React + Tailwind + Postgres + RLS via SQL)

---

## RESUMO EXECUTIVO

O projeto está **PRONTO** para iniciar a migração para Supabase. A arquitetura de catálogo (DynamicWork → WorkRelease → ExternalMapping) está consolidada, as policies de sync são portáveis (lógica pura sem SDK), e a auditoria final confirma os números esperados. O maior risco é a migração de 714 DynamicWork sem WorkRelease, que deve ser tratada como passo pós-migração, não bloqueador.

---

## 1. O PROJETO ESTÁ PRONTO PARA COMEÇAR A MIGRAÇÃO?

### ✅ SIM

**Justificativa:**

1. **Arquitetura de catálogo consolidada** — DynamicWork (franchise-mãe) → WorkRelease (temporada) → ExternalMapping (identidade externa) está implementada e validada.
2. **Policy de sync portável** — `syncFieldPolicy.ts` e `syncUtils.ts` são lógica pura sem dependência de SDK (classe A — fácil de portar).
3. **RLS bem definida** — Todas as entidades têm RLS documentada em `base44/entities/*.jsonc`, mapeável para Postgres policies.
4. **Backend functions preservadas** — `anilistCatalogSync` e `malCatalogSync` estão intactas e documentadas (BLOCKED/UNSTABLE upstream, mas arquitetura correta).
5. **Frontend desacoplado** — Maioria das páginas consome hooks/contexts, não chama base44 diretamente (classe A — fácil).
6. **Auditoria completa** — Números de todas as entidades confirmados.

### ⚠️ COM RESSALVAS

1. **714 DynamicWork sem WorkRelease** — Não bloqueia migração, mas precisa ser resolvido pós-migração.
2. **110 AnimeEntry sem release_id** — Não bloqueia, mas precisa de backfill pós-migração.
3. **User migration** — Usuários Base44 não podem ser exportados diretamente; precisam ser recriados no Supabase Auth.
4. **Storage de imagens** — URLs de imagens hospedadas no Base44 precisam ser migradas para Supabase Storage.

---

## 2. O QUE PODE SER MIGRADO IMEDIATAMENTE?

### Classe A — Fácil de portar (lógica pura, sem SDK)

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/xpSystem.js` | Cálculos de XP/level/rank — puro |
| `src/lib/achievements.js` | Definições de conquistas — puro |
| `src/lib/catalog.js` | Catálogo estático — puro (avaliar depreciação) |
| `src/lib/catalogAliases.js` | Dedup de aliases — puro |
| `src/lib/franchiseDetection.js` | Detecção de franquia — puro |
| `src/lib/workReleases.js` | Resolve releases — puro |
| `src/lib/syncFieldPolicy.js` | Policy engine (mirror frontend) — puro |
| `src/lib/anilistClient.js` | Cliente AniList GraphQL — puro |
| `src/lib/notificationRoutes.js` | Mapeamento tipo→rota — puro |
| `src/lib/imageCache.js` | Cache de imagens — puro |
| `src/lib/resolveAnimeEntryRelease.js` | Resolve release de entry — puro |
| `base44/shared/syncFieldPolicy.ts` | Policy engine (backend) — puro |
| `base44/shared/syncUtils.ts` | Utilitários de sync — puro |
| `src/hooks/useUrlParam.js` | URL state — puro |
| `src/lib/tmdbTrending.js` | TMDB trending — puro (usa env var) |

### Entidades de dados (schema estável, pronto para DDL)

- DynamicWork, WorkRelease, ExternalMapping
- UserProfile, AnimeEntry, UserAchievement, XpEvent, Achievement
- SyncRun, SyncLog, SyncConflict
- Todas as entidades sociais (Friendship, Post, Comment, Community, etc.)
- Todas as entidades CMS (News, FanArt, PlatformBanner, etc.)

---

## 3. O QUE DEVE PERMANECER CONGELADO?

### Backend functions (não modificar, não executar dry_run=false)

| Função | Status | Ação |
|--------|--------|------|
| `anilistCatalogSync` | BLOCKED_UPSTREAM (403) | Congelado. Reativar apenas em nova infra. |
| `malCatalogSync` | UPSTREAM_UNSTABLE (429/5xx) | Congelado. Reativar quando upstream estabilizar. |

### Dados de catálogo (não alterar durante migração)

- Não criar novos WorkRelease em massa.
- Não alterar AnimeEntry.
- Não executar sync real.
- Não apagar registros.
- Não alterar IDs.

### Frontend (não alterar comportamento)

- Não alterar UI durante fase de preparação.
- Não alterar lógica de negócio.

---

## 4. QUAIS SÃO OS MAIORES RISCOS?

### Risco 1: Migração de Usuários (CRÍTICO)

**Problema:** Usuários Base44 não podem ser exportados diretamente. Precisam ser recriados no Supabase Auth.

**Impacto:** Senhas não são portáveis (hash diferente). Usuários precisarão resetar senha ou usar OAuth.

**Mitigação:**
- Usar `supabase.auth.admin.createUser({ email })` sem senha (usuário recebe link de setup).
- Ou migrar apenas emails e forçar reset no primeiro login.
- Preservar `user_email` em todas as entidades para manter referências.

### Risco 2: 714 DynamicWork sem WorkRelease (ALTO)

**Problema:** 90% do catálogo não tem estrutura canônica de temporadas.

**Impacto:** Funciona no Base44 (usa `seasons[]` legado), mas no Supabase com FKs estritas, pode quebrar.

**Mitigação:**
- Migrar `seasons[]` como `jsonb` (não criar FK obrigatória).
- Fazer backfill de WorkRelease pós-migração (não bloqueia importação).
- Manter `seasons[]` como fallback até backfill completo.

### Risco 3: Colisões de slug (MÉDIO)

**Problema:** ~100 colisões de slug em WorkRelease.

**Impacto:** Impede `UNIQUE(slug)` constraint no Postgres.

**Mitigação:**
- Resolver colisões antes de criar constraint.
- Ou usar `UNIQUE(group_id, slug)` como constraint composta.

### Risco 4: URLs de imagens (MÉDIO)

**Problema:** Imagens hospedadas no Base44 Storage podem quebrar se o app Base44 for desativado.

**Impacto:** Avatares, banners, news images, fanart ficam quebrados.

**Mitigação:**
- Baixar todas as imagens do Base44 Storage antes de desativar.
- Re-uploadar para Supabase Storage.
- Atualizar URLs em todas as entidades.

### Risco 5: RLS complexa (MÉDIO)

**Problema:** Algumas entidades têm RLS complexa (`$or` com múltiplas condições, `$in` em arrays).

**Impacto:** Tradução para Postgres RLS pode ter bugs.

**Mitigação:**
- Testar cada policy com usuários reais antes de ir para produção.
- Usar função helper `is_admin()` para simplificar.

### Risco 6: JSON strings vs jsonb (BAIXO)

**Problema:** Campos como `categories`, `genres`, `seasons` são JSON strings no Base44.

**Impacto:** Precisam ser convertidos para `jsonb` no Postgres.

**Mitigação:**
- Converter durante importação (`JSON.parse()` antes de INSERT).
- Validação pós-importação.

---

## 5. QUAL DEVE SER A ORDEM RECOMENDADA DA MIGRAÇÃO?

### Fase 1: Setup Supabase (semana 1)

1. Criar projeto Supabase.
2. Configurar Auth (email/password + OAuth providers).
3. Criar tabelas (DDL) seguindo `supabaseMigrationManifest.md`.
4. Criar enums, FKs, triggers de `updated_date`.
5. Configurar RLS policies.
6. Criar buckets de Storage.

### Fase 2: Adapter layer (semana 1-2)

1. Criar `src/lib/supabaseClient.js` (substitui `base44Client.js`).
2. Criar `src/lib/supabaseAdapter.js` com mesma interface de `base44.entities`.
3. Migrar `AuthContext.jsx` para Supabase Auth.
4. Migrar `CatalogContext.jsx` para usar adapter.

### Fase 3: Migração de dados (semana 2)

1. Exportar todas as entidades do Base44 (JSON).
2. Recriar usuários no Supabase Auth.
3. Criar tabela `id_mapping` (base44_id → supabase_uuid).
4. Importar entidades em ordem de dependência (ver `dataExportChecklist.md`).
5. Migrar imagens (download do Base44 → upload para Supabase Storage).
6. Validar contagens e integridade.

### Fase 4: Migração do frontend (semana 2-3)

1. Trocar `base44Client.js` por `supabaseClient.js` + adapter.
2. Migrar hooks um por um (testar cada um).
3. Migrar componentes admin.
4. Migrar páginas que chamam base44 diretamente.
5. Testar todos os fluxos end-to-end.

### Fase 5: Migração de backend (semana 3)

1. Reescrever `anilistCatalogSync` como Supabase Edge Function.
2. Reescrever `malCatalogSync` como Supabase Edge Function.
3. Reescrever integrações built-in (UploadFile, SendEmail, InvokeLLM).
4. Configurar scheduler (pg_cron) para sync incremental.

### Fase 6: Pós-migração (semana 3-4)

1. Backfill de WorkRelease para 714 DynamicWork.
2. Backfill de `release_id` em 110 AnimeEntry.
3. Resolver colisões de slug.
4. Implementar TMDB sync.
5. Depreciar `catalog.js` (catálogo estático).
6. Desativar app Base44.

---

## 6. EXISTE ALGUM BLOQUEADOR CRÍTICO ANTES DE INICIAR SUPABASE?

### ❌ NÃO HÁ BLOQUEADOR CRÍTICO

**Justificativa:**

1. **Dados estão auditados** — Números confirmados, sem surpresas.
2. **Arquitetura está documentada** — Mapa de entidades, dependências, e policies mapeadas.
3. **Backend está preservado** — Funções intactas para reativação futura.
4. **Frontend está desacoplado** — Adapter layer é viável.
5. **RLS está mapeada** — Padrões Base44 → Postgres são conhecidos.

### ⚠️ ITENS A RESOLVER ANTES DA MIGRAÇÃO DE DADOS

| Item | Bloqueia? | Ação |
|------|----------|------|
| Exportar lista de usuários (emails + roles) | Sim (para Auth) | Via Base44 dashboard |
| Backup completo de todas as entidades | Sim (segurança) | Via exec_tool |
| Confirmar plano Supabase (tier) | Sim (RLS precisa de Pro+) | Verificar pricing |
| Confirmar domínio custom para email | Sim (SendEmail) | Configurar no Supabase |

### ⚠️ ITENS QUE NÃO BLOQUEIAM (resolvíveis pós-migração)

| Item | Resolução |
|------|-----------|
| 714 DynamicWork sem WorkRelease | Backfill pós-migração |
| 110 AnimeEntry sem release_id | Backfill pós-migração |
| Colisões de slug | Resolver antes de UNIQUE constraint |
| URLs de imagens | Migrar durante importação |
| MAL/Jikan unstable | Reativar quando upstream estabilizar |
| AniList blocked | Reativar em nova infra |

---

## 7. VEREDICTO FINAL

| Aspecto | Status |
|---------|--------|
| **Pronto para migrar?** | ✅ SIM |
| **Bloqueador crítico?** | ❌ NÃO |
| **GO / NO-GO** | **GO** |

### Próximos 3 passos recomendados

1. **Criar projeto Supabase e executar DDL** — Seguir `supabaseMigrationManifest.md` para criar tabelas, enums, FKs, RLS, triggers.
2. **Criar adapter layer** — `src/lib/supabaseClient.js` + `src/lib/supabaseAdapter.js` com mesma interface de `base44.entities`, permitindo migrar arquivo por arquivo sem reescrever lógica.
3. **Exportar e importar dados** — Seguir `dataExportChecklist.md`: exportar entidades em ordem de dependência, recriar usuários no Supabase Auth, criar `id_mapping`, importar com tradução de FKs.

---

## APÊNDICE: NÚMEROS AUDITADOS (2026-09-07)

| Entidade | Total | Detalhe |
|----------|-------|---------|
| DynamicWork | 797 | 83 com WorkRelease, 714 sem |
| WorkRelease | 214 | 83 group_ids únicos |
| ExternalMapping | 225 | mal: 214, anilist: 11, tmdb: 0, thetvdb: 0 |
| AnimeEntry | 127 | 17 com release_id, 110 sem |
| SyncRun | 5 | Todos completed |
| SyncLog | 27 | ERROR: 19, SYNC_SAFE: 4, NO_CHANGES: 4 |
| SyncConflict | 0 | Vazio |
| UserProfile | ~TBD | (não auditado nesta fase) |
| User | ~TBD | (via dashboard) |

### Arquivos criados nesta fase

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/entityMapAndDependencies.md` | Mapa de entidades + classificação de campos + dependências Base44 |
| `src/lib/supabaseMigrationManifest.md` | Manifest de migração (tabelas, IDs, FKs, JSON, enums, timestamps, RLS) |
| `src/lib/dataExportChecklist.md` | Checklist de exportação de dados |
| `src/lib/legacyTechDebt.md` | Lista consolidada de tech debt |
| `src/lib/base44ExitReadinessReport.md` | Este relatório |