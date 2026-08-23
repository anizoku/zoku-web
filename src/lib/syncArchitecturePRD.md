# PRD — Sincronização Canônica de Obras (AniZoku)

**Status:** Planejamento
**Autor:** Base44 (com direção do product owner)
**Última atualização:** 2026-08-23

## 1. Contexto e direção

O catálogo do AniZoku hoje é derivado do Jikan/MAL com complementos do TMDB. O modelo é frágil: temporadas duplicadas, OVAs misturados com séries, filmes entrando como série, e títulos iguais virando entradas diferentes. A proposta é criar uma **camada canônica própria** onde o banco do AniZoku é a verdade final exibida ao usuário, e as APIs externas são fontes de dados.

### Princípios (decisões travadas)

1. Não reescrever o catálogo do zero.
2. Não criar `WorkGroup` do zero agora. `DynamicWork` evolui para ser a entidade principal da franquia.
3. Criar `WorkRelease` para temporadas, filmes, OVAs, especiais, partes e releases específicas.
4. Criar `ExternalMapping` para mapear IDs externos (AniList, MAL/Jikan, TMDB, futuramente TheTVDB).
5. Criar `SyncConflict` para casos onde o sistema não tem certeza do match.
6. **Sem fuzzy matching para aprovação automática.** Matching automático só por ID externo confiável já mapeado (AniList ID, idMal, TMDB ID, TheTVDB ID).
7. Fuzzy por título/ano/formato/season aparece **apenas como sugestão dentro do SyncConflict**, nunca como auto-aprovação.
8. **Sem LLM para matching.** Regras determinísticas.
9. **Sem `raw_payload` completo em campos de entidade.** Auditoria via log leve ou arquivo privado (`UploadPrivateFile`), nunca payload gigante no banco.
10. AniList como fonte principal.
11. TMDB como complemento para imagens, filmes, live-action, trailers, posters e backdrops.
12. TheTVDB para fase posterior, depois que a base canônica estiver estável.
13. Não quebrar `AnimeEntry`, `CardOverride`, `WorkCategoryVisibility` e outras referências existentes.
14. Migração gradual, site funcionando durante a transição.

### Decisões de transição (alinhadas)

- **AnimeEntry ↔ WorkRelease:** adicionar campo `release_id` opcional em `AnimeEntry` apontando para `WorkRelease.id`, mantendo `season_mal_id` como fallback legado. Resolução de progresso: `release_id` → `season_mal_id` via `ExternalMapping` → `title/type` legado. Sem `release_id` obrigatório agora; sem remover `season_mal_id`.
- **Dual-read `seasons[]` ↔ `WorkRelease`:** fallback transparente — o frontend lê `WorkRelease` primeiro; se vazio, cai em `seasons[]` do `DynamicWork`. Remoção de `seasons[]` só quando 100% migrado e validado.
- **On-demand sync (busca/adicionar à lista):** abordagem híbrida — na Fase 3 o client faz **leitura** AniList (público, sem chave secreta) e mostra resultado **provisório** sem gravar canônico; a gravação canônica + `ExternalMapping` só acontece na Fase 5 via backend function. Isso evita dados canônicos criados pelo client.

---

## Fase 0 — Auditoria do modelo atual

### Objetivo
Mapear exatamente o estado atual do catálogo, identificar todas as referências cruzadas que dependem de `slug`/`franchise_id`/`season_mal_id`, e produzir um inventário que norteie as fases seguintes. Nenhuma mudança de código ou schema nesta fase.

### Entidades afetadas
- `DynamicWork` (modelo principal, com `franchise_id`, `franchise_title`, `seasons[]` serializado em JSON)
- `CatalogSync` (cache de sync por slug)
- `CardOverride` (override por `card_slug`)
- `WorkCategoryVisibility` (visibilidade por `work_slug`)
- `AnimeEntry` (progresso do usuário, com `season_mal_id`)
- `WorkSuggestion` (sugestões de usuários, com `mal_id`)

### Campos necessários
Nenhum. Esta fase é de leitura e documentação.

### Lógica de upsert
N/A.

### Atividades
1. Inventariar todos os `DynamicWork` que possuem `seasons[]` não-vazio e quantificar o volume.
2. Inventariar `AnimeEntry` que possuem `season_mal_id` setado vs. nulo, e quantos referenciam obras que têm `franchise_id`.
3. Listar todos os pontos do frontend/backend que leem `seasons[]` (parse do JSON) e que leem `franchise_id`/`related_franchise_id`.
4. Mapear referências por `slug` em `CardOverride`, `WorkCategoryVisibility`, `CatalogSync` — confirmar que `slug` permanece estável como chave de junção.
5. Documentar os formatos de `seasons[]` (estrutura de cada item) para validar o schema de `WorkRelease`.
6. Identificar duplicatas conhecidas hoje (obras com mesmo `franchise_id` mas entradas separadas, ou `franchise_id` nulo onde deveria existir).

### Riscos
- Descobrir que `seasons[]` tem variações de formato não-documentadas entre obras antigas e novas.
- Encontrar `AnimeEntry` órfãos (referenciam obras que sumiram do catálogo).

### Critérios de aceitação
- Documento de inventário produzido (este arquivo ou anexo) com: contagem de obras com `seasons[]`, contagem de `AnimeEntry` por estado de `season_mal_id`, lista de pontos de leitura de `seasons[]` no código, e lista de duplicatas conhecidas.
- Schema atual de `seasons[]` confirmado e servindo de base para o schema de `WorkRelease`.

### O que NÃO fazer nesta fase
- Não alterar nenhum schema.
- Não criar entidades novas.
- Não rodar nenhum script de migração.
- Não mudar o frontend.

---

## Fase 1 — Criar WorkRelease, ExternalMapping e SyncConflict

### Objetivo
Criar as três entidades novas sem alterar `DynamicWork` ou `AnimeEntry`. As entidades ficam vazias nesta fase — só a estrutura existe. O site continua 100% funcional lendo o modelo legado.

### Entidades afetadas
- **Novas:** `WorkRelease`, `ExternalMapping`, `SyncConflict`.
- **Existentes:** nenhuma alteração.

### Campos necessários

#### WorkRelease
```
- group_id          (string, required) → DynamicWork.id (franchise-mãe)
- group_slug        (string, required) → DynamicWork.slug (denormalizado p/ query sem join)
- slug              (string, required) → slug único do release (ex: attack-on-titan-season-2)
- title             (string, required)
- title_romaji      (string)
- title_english     (string)
- title_native      (string)
- category          (string, enum: anime|manga|movie|liveaction|special|ova)
- format            (string) → AniList format (TV, MOVIE, OVA, ONA, SPECIAL, MANGA, NOVEL, etc.)
- season            (string) → winter|spring|summer|fall
- season_year       (number)
- episode_count     (number)
- chapter_count     (number)
- duration          (string) → ex: "24 min/ep"
- release_order     (number) → ordem cronológica de exibição dentro do grupo
- display_order     (number) → ordem de exibição no catálogo (diferente de release_order p/ colocar specials no fim)
- status            (string, enum: releasing|finished|not_yet_released|cancelled|hiatus)
- is_main_entry     (boolean, default false) → true para a entrada "principal" do grupo
- is_special        (boolean, default false)
- is_movie          (boolean, default false)
- is_live_action    (boolean, default false)
- synopsis          (string)
- cover_url         (string)
- banner_url        (string)
- score             (number)
- popularity        (number)
- trending          (boolean, default false)
- sync_status       (string, enum: synced|pending|manual_override, default: pending)
- last_synced_at     (date-time)
```

#### ExternalMapping
```
- work_group_id     (string) → DynamicWork.id (nullable quando mapeia só release)
- work_release_id   (string) → WorkRelease.id (nullable quando mapeia só grupo)
- provider          (string, enum: anilist|mal|tmdb|thetvdb|jikan, required)
- provider_id       (string, required) → ID no provedor (string p/ suportar IDs grandes)
- provider_url      (string)
- provider_type     (string) → anime|manga|movie|tv|etc. (tipo do recurso no provedor)
- confidence_score  (number, default 100) → 100 quando match por ID exato
- verified_by_admin (boolean, default false)
- last_synced_at    (date-time)
```
Constraint lógica (aplicada no código, não no schema): `work_group_id` ou `work_release_id` deve estar setado (não ambos nulos). Para o mesmo `provider` + `provider_id` + `provider_type`, deve ser único (upsert por essa chave composta).

#### SyncConflict
```
- provider          (string, enum: anilist|mal|tmdb|thetvdb|jikan, required)
- provider_id       (string, required)
- provider_type     (string)
- external_title    (string)
- external_payload_summary (string) → resumo leve dos dados externos (NUNCA o payload completo)
- possible_work_group_id   (string) → sugestão de match de grupo
- possible_work_release_id (string) → sugestão de match de release
- conflict_type     (string, enum: no_match|ambiguous_title|duplicate_candidate|missing_relation|category_mismatch)
- confidence_score  (number) → score da melhor sugestão fuzzy (informativo, não auto-aprova)
- suggested_action   (string, enum: link_existing|create_new_release|create_new_group|ignore)
- status            (string, enum: pending|resolved|dismissed, default: pending)
- admin_note        (string)
- resolved_at       (date-time)
- resolved_by       (string) → email do admin
```

### Lógica de upsert
Nesta fase, nenhuma lógica de upsert roda — as entidades estão vazias. Apenas os schemas existem.

### Riscos
- Criar `WorkRelease` com `group_id` apontando para `DynamicWork.id` que ainda não está populado — sem problema enquanto vazio, mas validar que o campo é string livre (não FK enforced).
- `ExternalMapping` com `provider_id` como string: confirmar que IDs grandes do AniList (int) e TheTVDB (int) cabem como string.

### Critérios de aceitação
- As três entidades existem no schema e estão acessíveis via `base44.entities.WorkRelease` / `ExternalMapping` / `SyncConflict`.
- RLS configurado: `WorkRelease`, `ExternalMapping` e `SyncConflict` com create/update/delete admin-only e read público (exceto `SyncConflict` que pode ser read admin-only para não vazar conflitos).
- O site continua funcionando 100% sem nenhuma mudança visível.
- Nenhum `DynamicWork` ou `AnimeEntry` foi alterado.

### O que NÃO fazer nesta fase
- Não popular `WorkRelease`, `ExternalMapping` ou `SyncConflict`.
- Não alterar `DynamicWork` (nem adicionar campos).
- Não alterar `AnimeEntry`.
- Não tocar no frontend.
- Não integrar AniList ainda.

---

## Fase 2 — Migrar `seasons[]` serializado do DynamicWork para WorkRelease

### Objetivo
Popular `WorkRelease` a partir dos `seasons[]` existentes em `DynamicWork`, criar `ExternalMapping` para os `mal_id` de cada temporada, e adicionar `release_id` opcional em `AnimeEntry`. O site continua lendo `seasons[]` (fallback transparente) — `WorkRelease` passa a ser lido em paralelo quando existir.

### Entidades afetadas
- **Novas (populadas):** `WorkRelease`, `ExternalMapping`.
- **Alteradas:** `DynamicWork` (adicionar campos de controle), `AnimeEntry` (adicionar `release_id`).

### Campos necessários

#### Em DynamicWork (adicionar)
```
- sync_release_completed (boolean, default false) → true quando todas as seasons[] foram migradas para WorkRelease com sucesso
- release_count          (number, default 0) → contagem de WorkRelease vinculados (denormalizado p/ evitar query)
```

#### Em AnimeEntry (adicionar)
```
- release_id (string, optional) → WorkRelease.id (novo, canônico). season_mal_id permanece como fallback legado.
```

### Lógica de upsert (migração)

Script de migração (rodado uma vez, via `exec_tool` ou backend function quando disponível):

1. Para cada `DynamicWork` com `seasons[]` não-vazio:
   a. Parse do JSON `seasons[]`.
   b. Para cada item de season:
      - Verificar se já existe `WorkRelease` com `group_id = DynamicWork.id` e `slug` derivado do `season_title` + `mal_id`. Se existir, atualizar (upsert por `group_id` + `slug`).
      - Se não existir, criar `WorkRelease` com os campos mapeados do item de season.
      - Para o `mal_id` da season: upsert em `ExternalMapping` com `provider = "mal"`, `provider_id = mal_id`, `work_release_id = WorkRelease.id`, `work_group_id = DynamicWork.id`, `confidence_score = 100`.
   c. Marcar `is_main_entry = true` no `WorkRelease` correspondente à temporada raiz (quando `related_franchise_id` for nulo e for a temporada 1/única).
   d. Ao final, setar `DynamicWork.sync_release_completed = true` e `release_count = N`.
2. Para `AnimeEntry` existentes: **não migrar nesta fase**. `release_id` fica nulo. O backfill de `release_id` em entradas antigas é uma sub-fase posterior (ver abaixo).

### Backfill de release_id em AnimeEntry (sub-fase, após migração de WorkRelease)
Rodado depois que `WorkRelease` + `ExternalMapping` estão populados:
1. Para cada `AnimeEntry` com `season_mal_id` setado e `release_id` nulo:
   - Buscar `ExternalMapping` com `provider = "mal"`, `provider_id = season_mal_id`.
   - Se encontrar exatamente um `work_release_id`, setar `AnimeEntry.release_id`.
   - Se não encontrar ou encontrar ambíguo, **não tocar** — mantém `season_mal_id` como fallback.
2. Critério: só preencher `release_id` em match **exato por ID**. Nunca fuzzy.

### Resolução de progresso no frontend (nova ordem de precedência)
1. Se `AnimeEntry.release_id` setado → ler `WorkRelease` por `release_id`.
2. Senão se `AnimeEntry.season_mal_id` setado → buscar `ExternalMapping` (`provider=mal`, `provider_id=season_mal_id`) → `work_release_id` → ler `WorkRelease`.
3. Senão → fallback legado por `title` + `type` (comportamento atual).

### Riscos
- `seasons[]` com formato inconsistente (descoberto na Fase 0) — o script de migração precisa tolerar variações e logar obras que falham.
- Obras com `franchise_id` nulo onde deveria existir — não migrar essas, deixar para revisão.
- `AnimeEntry` órfãos (obra sumiu do catálogo) — o backfill simplesmente não encontra mapping e mantém legado; sem erro.
- Dual-read: garantir que o frontend não mostre duplicado (WorkRelease + seasons[] ao mesmo tempo). Regra: se `DynamicWork.sync_release_completed = true`, ler só `WorkRelease`; senão ler `seasons[]`.

### Critérios de aceitação
- Todo `DynamicWork` com `seasons[]` válido tem `sync_release_completed = true` e `release_count` correto ao final da migração.
- Cada `WorkRelease` criado tem `ExternalMapping` para seu `mal_id` (quando existir).
- Um usuário com `AnimeEntry` antigo (só `season_mal_id`) continua vendo sua lista normalmente via fallback.
- Um usuário que adicionar uma nova obra **depois** da migração, quando a `WorkRelease` já existir, tem `release_id` preenchido.
- Obras com `seasons[]` inválido ficam com `sync_release_completed = false` e logadas para revisão (não quebram a migração).
- Nenhum `AnimeEntry` perde dados; `season_mal_id` permanece intacto.

### O que NÃO fazer nesta fase
- Não remover `seasons[]` do `DynamicWork`.
- Não tornar `release_id` obrigatório.
- Não remover `season_mal_id` do `AnimeEntry`.
- Não integrar AniList (ainda usa dados do Jikan existentes).
- Não fazer fuzzy matching no backfill.

---

## Fase 3 — Integrar AniList como fonte principal com upsert por ID

### Objetivo
Substituir Jikan como fonte principal por AniList para novas sincronizações e on-demand. TMDB continua como complemento de imagens. A gravação canônica (`WorkRelease`/`ExternalMapping`) nesta fase é **limitada e conservadora**: o client faz leitura AniList e mostra resultado provisório; a gravação canônica efetiva fica para a Fase 5 (backend). Aqui criamos a camada de integração AniList e o upsert por ID exato, rodando via admin/manual.

### Entidades afetadas
- **Lidas/escritas:** `DynamicWork`, `WorkRelease`, `ExternalMapping`, `SyncConflict`.
- **Não alteradas em schema:** nenhuma nesta fase (campos da Fase 1/2 bastam).

### Campos necessários
Nenhum novo. Usa os campos de `ExternalMapping` com `provider = "anilist"` e `provider = "mal"` (via `idMal` do AniList).

### Lógica de upsert (AniList → canônico)

Para cada obra vinda do AniList:

1. **Buscar por ID exato:**
   - Se `ExternalMapping` existe com `provider = "anilist"`, `provider_id = anilist_id` → é a mesma obra. Atualizar `WorkRelease`/`DynamicWork` correspondente (upsert).
   - Senão, se AniList retorna `idMal` e `ExternalMapping` existe com `provider = "mal"`, `provider_id = idMal` → match forte por MAL ID. Atualizar e criar `ExternalMapping` AniList apontando para o mesmo release.
2. **Se nenhum ID exato bateu:**
   - Não criar canônico automaticamente.
   - Criar `SyncConflict` com `conflict_type = no_match`, `external_title`, `external_payload_summary` (resumo leve), e sugestões fuzzy (título/ano/formato) preenchidas como `possible_work_group_id`/`possible_work_release_id` com `confidence_score` informativo.
3. **Se ID exato bateu (upsert):**
   - Atualizar campos do `WorkRelease` (título, episódios, status, score, synopsis, etc.) **respeitando override manual**: se `sync_status = manual_override`, não sobrescrever campos que o admin editou (pelo menos `title`, `cover_url`, `synopsis` — definir lista de campos protegidos).
   - Atualizar `ExternalMapping.last_synced_at`.
   - Não criar duplicata.

### Integração TMDB (complemento)
- TMDB continua como hoje: posters, backdrops, trailers para filmes/live-action.
- Quando AniList traz uma obra de formato `MOVIE` ou live-action, enriquecer com TMDB (poster/backdrop) e criar `ExternalMapping` `provider = "tmdb"` se houver ID TMDB confiável.
- TMDB **nunca** cria `WorkRelease` sozinho. Só enriquece release existente ou gera `SyncConflict`.

### On-demand (busca) — abordagem híbrida
- O usuário pesquisa no catálogo local primeiro (comportamento atual).
- Se não encontra, o client consulta AniList (público, sem chave secreta) e mostra resultado **provisório** (display only).
- **Não grava** canônico nem `ExternalMapping` a partir do client.
- Se o usuário adiciona à lista uma obra provisória, cria `AnimeEntry` com `title`/`type` legado e `season_mal_id` (do `idMal` do AniList) — sem `release_id` ainda. Marca a obra como prioridade para sync completo na Fase 5.
- A gravação canônica (`WorkRelease` + `ExternalMapping` + resolução de `release_id` no `AnimeEntry`) acontece na Fase 5 via backend.

### Riscos
- AniList GraphQL tem rate limit generoso mas não infinito; on-demand no client pode gerar muitas chamadas. Mitigação: cache local (react-query) + debounce na busca.
- `idMal` do AniList pode ser nulo para algumas obras — essas não têm match forte por MAL ID e vão para `SyncConflict` se não houver AniList ID mapeado.
- Override manual: definir claramente quais campos o admin "protege" do sync para não sobrescrever edição manual.
- Diferenças de modelo: AniList usa `format` (TV/MOVIE/OVA/...) e `status` (RELEASING/FINISHED/...) — mapear para os enums de `WorkRelease`.

### Critérios de aceitação
- Buscar uma obra no AniList que já tem `ExternalMapping` AniList ou MAL resulta em upsert (atualização) sem criar duplicata.
- Buscar uma obra no AniList sem ID mapeado cria `SyncConflict` (não cria canônico automático).
- O override manual do admin não é sobrescrito pelo sync.
- TMDB enriquece (poster/backdrop) mas não cria `WorkRelease`.
- On-demand no client mostra resultado provisório sem gravar canônico.
- Jikan deixa de ser a fonte primária para novas sincronizações (permanece só como validação/backup legado).

### O que NÃO fazer nesta fase
- Não usar fuzzy matching para aprovação automática.
- Não usar LLM para matching.
- Não salvar `raw_payload` do AniList em entidade.
- Não rodar sync diário no client (isso é Fase 5).
- Não remover Jikan do código legado (mantém como fallback de validação).
- Não gravar canônico a partir do client no fluxo on-demand.

---

## Fase 4 — Criar fluxo de SyncConflict no admin

### Objetivo
Criar a tela de admin para revisar e resolver `SyncConflict`, permitindo vincular a obra existente, criar nova release, criar novo grupo ou ignorar. Esta fase é puramente frontend + lógica de resolução que grava o resultado.

### Entidades afetadas
- **Lidas/escritas:** `SyncConflict`, `WorkRelease`, `ExternalMapping`, `DynamicWork`.
- **Schema:** nenhum novo.

### Campos necessários
Nenhum novo. Usa `SyncConflict` da Fase 1.

### Lógica de upsert (resolução de conflito)
Quando o admin resolve um `SyncConflict`:

1. **"Vincular a obra existente"** (`suggested_action = link_existing`):
   - Admin seleciona um `WorkRelease` (ou `DynamicWork`) existente.
   - Cria `ExternalMapping` com `provider`, `provider_id`, `provider_type` do conflito, apontando para o release/grupo escolhido, `verified_by_admin = true`, `confidence_score = 100`.
   - Marca `SyncConflict.status = resolved`, `resolved_by`, `resolved_at`, `admin_note`.
2. **"Criar nova release"** (`suggested_action = create_new_release`):
   - Admin seleciona o `DynamicWork` (grupo) pai.
   - Cria `WorkRelease` a partir do `external_payload_summary` (admin confirma/edita campos).
   - Cria `ExternalMapping` apontando para o novo release.
   - Resolve o conflito.
3. **"Criar novo WorkGroup"** (`suggested_action = create_new_group`):
   - Cria `DynamicWork` (novo grupo) + `WorkRelease` principal + `ExternalMapping`.
   - Resolve o conflito.
4. **"Ignorar"** (`suggested_action = ignore`):
   - Marca `SyncConflict.status = dismissed`, com `admin_note`.
   - Não cria nada. Futuras sincronizações com o mesmo `provider_id` devem reabrir o conflito ou serem ignoradas (decidir política: reabrir se dados mudaram, senão manter dismissed).

### UI do admin
Nova aba "Conflitos de Sync" no Admin (ou dentro da aba de Manutenção/Catálogo):
- Lista de `SyncConflict` com `status = pending`, ordenada por `created_date`.
- Cada item mostra: `external_title`, `provider`, `provider_id`, `external_payload_summary`, sugestões fuzzy (`possible_work_*` com `confidence_score`), e botões de ação.
- Filtros: por `provider`, `conflict_type`, `status`.
- Badge de contagem pendente na aba (igual ao padrão de Sugestões/Moderação).

### Riscos
- Admin vincula ao release errado → cria `ExternalMapping` incorreto que vai direcionar futuros syncs. Mitigação: permitir "desvincular" (deletar `ExternalMapping` e reabrir conflito).
- Volume de conflitos pode ser alto no início. Mitigação: bulk-actions (resolver vários de uma vez quando a sugestão for clara).
- Conflito dismissed mas a obra volta a ser sincronizada → política de reabertura precisa ser definida (sugerido: reabrir só se `external_payload_summary` mudou).

### Critérios de aceitação
- Admin consegue ver, filtrar e resolver conflitos pendentes.
- As quatro ações (vincular, criar release, criar grupo, ignorar) funcionam e gravam corretamente.
- Resolver um conflito cria o `ExternalMapping` apropriado e marca `SyncConflict.status = resolved`.
- O badge de contagem pendente aparece na aba de admin.
- Um conflito resolvido como "vincular" faz com que a próxima sincronização da mesma obra faça upsert no release correto (validação end-to-end).

### O que NÃO fazer nesta fase
- Não auto-resolver conflitos (tudo é manual do admin).
- Não usar LLM para sugerir resolução (só fuzzy determinístico como sugestão informativa).
- Não criar conflitos automaticamente em volume nesta fase (eles são gerados pela Fase 3/5).

---

## Fase 5 — Sync diário/assíncrono quando backend functions disponíveis

### Objetivo
Mover a sincronização para backend functions (scheduled tasks), permitindo sync diário/semanal e on-demand assíncrono sem expor chaves de API no client e sem depender do usuário estar logado. **Esta fase requer Builder+ (backend functions + scheduled tasks).**

### Entidades afetadas
- **Lidas/escritas:** todas as canônicas (`DynamicWork`, `WorkRelease`, `ExternalMapping`, `SyncConflict`) + `AnimeEntry` (backfill de `release_id`).
- **Schema:** adicionar campos de controle de fila.

### Campos necessários

#### Nova entidade SyncQueue (fila de sincronização)
```
- work_group_id     (string, nullable) → DynamicWork.id (quando sync de obra existente)
- work_release_id    (string, nullable) → WorkRelease.id
- provider           (string, enum: anilist|mal|tmdb|thetvdb|jikan)
- provider_id        (string) → ID externo a sincronizar
- provider_type      (string)
- trigger            (string, enum: daily_popular|daily_season|weekly_relations|on_demand_search|on_demand_add|backfill)
- priority           (string, enum: high|normal|low, default: normal)
- status             (string, enum: queued|processing|completed|failed, default: queued)
- attempts           (number, default 0)
- last_error         (string) → mensagem leve de erro (não stack trace gigante)
- queued_at          (date-time)
- processed_at       (date-time)
```

#### Em DynamicWork (adicionar)
```
- sync_priority      (string, enum: high|normal|low|none, default: none) → obras adicionadas/buscas recentes ficam high
- last_full_sync_at  (date-time)
```

### Lógica de upsert (backend)

#### Daily Sync (scheduled task diário)
1. Buscar top animes populares do AniList (top 1000-2000).
2. Para cada um, enfileirar `SyncQueue` com `trigger = daily_popular`, `priority = normal`.
3. Buscar animes da temporada atual + próxima temporada do AniList → enfileirar `daily_season`.
4. Buscar obras com `DynamicWork.sync_priority = high` (pesquisadas/adicionadas nas últimas 24h) → enfileirar `on_demand_*`.
5. Worker processa a fila: para cada item, chama AniList, aplica upsert por ID exato (Fase 3), cria `SyncConflict` se sem match.

#### Weekly Sync (scheduled task semanal)
1. Para obras populares, buscar relações (AniList `relations`) e enfileirar `weekly_relations`.
2. Atualizar imagens/banners/scores (TMDB enriquecimento).
3. Reprocessar obras com `sync_status = pending` ou `sync_release_completed = false`.
4. Rodar backfill de `release_id` em `AnimeEntry` (sub-fase da Fase 2, agora automatizada).

#### On-demand (backend function invocada pelo client)
1. Usuário pesquisa obra não-canônica → client mostra provisório (Fase 3) e, se adiciona à lista, chama backend function `enqueueOnDemandSync(provider_id)`.
2. Backend cria `SyncQueue` com `trigger = on_demand_add`, `priority = high`.
3. Worker processa, cria canônico, e faz backfill do `release_id` no `AnimeEntry` recém-criado.

### Secrets necessários
- `ANILIST_ENDPOINT` (público, mas configurável).
- `TMDB_API_KEY` (secret — já usado hoje, validar se está via secret ou hardcoded).
- `THETVDB_API_KEY` + `THETVDB_USER_KEY` + `THETVDB_USER_PIN` (Fase 6).
- Jikan: sem chave.

### Riscos
- **Builder+ necessário:** sem backend functions, esta fase não roda. O app continua funcionando com a Fase 3/4 (client-side limitado), mas sem sync automático.
- Rate limit do AniList no backend: mais controlável que no client, mas ainda precisa de throttle na fila.
- Fila pode acumular se worker falhar: `attempts` com limite (ex: 3) e `status = failed` após esgotar.
- Backfill de `release_id` em massa pode gerar muitas escritas: usar `bulkUpdate` com batches de 500.
- `last_error` leve: não logar payload/stack trace no campo (limite de tamanho).

### Critérios de aceitação
- Scheduled task diário roda e popula `SyncQueue` sem intervenção manual.
- Worker processa a fila fazendo upsert por ID exato e criando `SyncConflict` para sem-match.
- On-demand: usuário adiciona obra não-canônica → `AnimeEntry` criado → backend sincroniza → `release_id` é preenchido no `AnimeEntry` (visível na próxima leitura).
- Backfill semanal preenche `release_id` em `AnimeEntry` antigos com match exato.
- Nenhuma chave de API exposta no client.
- `SyncQueue` com `status = failed` após 3 tentativas é visível no admin para investigação.

### O que NÃO fazer nesta fase
- Não rodar sync no client (migrado para backend).
- Não usar LLM no matching.
- Não salvar `raw_payload` no `SyncQueue.last_error` (só mensagem leve).
- Não integrar TheTVDB ainda (Fase 6).
- Não remover `seasons[]` do `DynamicWork` (só depois de 100% migrado e validado, em fase futura).

---

## Fase 6 — Avaliar integração com TheTVDB

### Objetivo
Avaliar (e, se fizer sentido, integrar) TheTVDB como complemento para estrutura de temporadas, episódios, especiais e ordens alternativas. Esta fase é de **avaliação primeiro** — só implementar se a base canônica (Fase 1-5) estiver estável e o ganho justificar a complexidade.

### Entidades afetadas
- **Lidas/escritas:** `WorkRelease`, `ExternalMapping`, `SyncConflict`, `SyncQueue`.
- **Schema:** possivelmente adicionar campos de episódio em `WorkRelease` se TheTVDB justificar.

### Campos necessários (se aprovado)
#### Em WorkRelease (adicionar, se TheTVDB justificar)
```
- thetvdb_season_id  (string) → season ID no TheTVDB
- episode_list        (string, JSON serializado leve) → lista de episódios só se necessário (avaliar tamanho)
- alternative_order   (string) → ordem alternativa de exibição (ex: ordem cronológica vs. ordem de exibição)
```
Aviso: `episode_list` pode crescer; se for grande, usar arquivo privado em vez de campo.

#### Em ExternalMapping
Já suporta `provider = "thetvdb"` (enum da Fase 1).

### Lógica de upsert (TheTVDB)
1. TheTVDB usa OAuth2 client-credentials → backend function busca token com secrets.
2. Para cada `WorkRelease` de anime que precisa estrutura de episódios/specials:
   - Buscar por `ExternalMapping` TheTVDB (se já mapeado) ou por fuzzy title+year (criando `SyncConflict` se ambíguo).
   - Enriquecer `WorkRelease` com season/episode structure do TheTVDB.
   - TheTVDB **nunca** cria `WorkRelease` sozinho — só enriquece existente ou gera `SyncConflict`.
3. O matching AniList↔TheTVDB é o ponto mais difícil: criar `SyncConflict` com `conflict_type = ambiguous_title` para casos como "Final Season Part 2" vs "Season 4 Part 2".

### Riscos
- **Matching AniList↔TheTVDB é a parte mais complexa do sistema inteiro.** TheTVDB organiza por season number; AniList trata "Season 2" como obra separada. Sem ID em comum, o match é fuzzy e vai gerar muitos conflitos.
- OAuth2 do TheTVDB: token expira, precisa renovação no backend.
- Estrutura de episódios pode ser grande → risco de estourar campo de entidade.
- Custo de manutenção: TheTVDB tem menos cobertura que AniList para anime.

### Critérios de aceitação (de avaliação, antes de implementar)
- Documento de avaliação decidindo: TheTVDB traz ganho real sobre o que AniList + TMDB já entregam?
- Se sim: integração enriquece `WorkRelease` com specials/episódios sem criar duplicatas.
- Se não: fase arquivada, `ExternalMapping` continua suportando `thetvdb` para uso futuro.

### O que NÃO fazer nesta fase
- Não implementar TheTVDB antes de concluir a avaliação.
- Não usar TheTVDB como fonte principal (sempre complemento).
- Não criar `WorkRelease` a partir do TheTVDB sem match com AniList/MAL existente.

---

## Resumo de dependências entre fases

```
Fase 0 (auditoria) → Fase 1 (entidades vazias) → Fase 2 (migração seasons[] + release_id) → Fase 3 (AniList upsert) → Fase 4 (admin de conflitos) → Fase 5 (backend sync) → Fase 6 (TheTVDB, opcional)
```

- Fase 5 requer **Builder+** (backend functions + scheduled tasks). Sem Builder+, o app funciona até a Fase 4 com sync manual/admin.
- Fase 6 é opcional e depende da Fase 5 estar estável.

## Resumo de entidades novas e alterações

| Entidade | Ação | Fase |
|---|---|---|
| `WorkRelease` | Criar | 1 |
| `ExternalMapping` | Criar | 1 |
| `SyncConflict` | Criar | 1 |
| `DynamicWork` | +`sync_release_completed`, `release_count` | 2 |
| `DynamicWork` | +`sync_priority`, `last_full_sync_at` | 5 |
| `AnimeEntry` | +`release_id` (opcional) | 2 |
| `SyncQueue` | Criar | 5 |
| `WorkRelease` | +campos TheTVDB (se aprovado) | 6 |

## Princípios transversais (valem para todas as fases)
- **Upsert por ID exato sempre.** Nunca criar canônico sem verificar `ExternalMapping` primeiro.
- **Sem fuzzy auto-aprovação.** Fuzzy só como sugestão em `SyncConflict`.
- **Sem LLM no matching.**
- **Sem `raw_payload` em campos.** Resumo leve ou arquivo privado.
- **Override manual protegido.** `sync_status = manual_override` bloqueia sobrescrita de campos editados.
- **Site sempre funcional.** Dual-read com fallback transparente até a migração ser 100% validada.
- **Migração não-destrutiva.** `season_mal_id` e `seasons[]` só são removidos em fase futura, após validação completa.