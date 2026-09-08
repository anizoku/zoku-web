# Release Tracking Implementation Report — Fase 4

## Configuração

```
RELEASE_TRACKING_MODE = WORK_RELEASE_FIRST
ENTRY_PRIMARY_LINK = release_id
LEGACY_FALLBACK = season_mal_id
FUZZY_MATCHING = DISABLED
ANIME_ONLY_CATEGORY_FILTER = ENABLED
LEGACY_FORMAT_FALLBACK = ENABLED
```

## Arquitetura

### Fluxo de Resolução

```
/obra/:slug
  ↓
CatalogContext.getBySlug(slug) → media (com media.releases pré-carregado)
  ↓
media.has_work_releases === true E activeReleases.length > 0?
  ├─ SIM  → ReleaseBlock para cada release ativo (release mode)
  └─ NÃO  → FormatBlock para cada formato ativo (legacy mode)
```

### Prioridade de Leitura de Releases

1. **WorkRelease** (canônico) — quando `DynamicWork.sync_release_completed === true` e `release_count > 0`
2. **seasons[] legado** — fallback quando WorkRelease não existe

### Resolução de AnimeEntry por Release

1. `AnimeEntry.release_id === WorkRelease.id` — match exato (prioridade máxima)
2. `AnimeEntry.season_mal_id === release.mal_id` — fallback legado via ExternalMapping
3. `null` — sem match (NUNCA fuzzy matching por título/slug/genre)

## Arquivos Alterados

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/releaseTracking.js` | Helpers síncronos: `findEntryForRelease`, `filterActiveReleases`, `buildReleaseLabel`, `buildReleaseSubtitle`, `getReleaseStatusLabel`, `getReleaseMap`, `resolveEntryRelease` |
| `src/components/obra/ReleaseBlock.jsx` | Componente de tracking por release — status/progresso/XP independentes por release |

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/workReleases.js` | Adicionados `status`, `chapter_count`, `duration_minutes` à normalização de WorkRelease |
| `src/pages/ObraProfile.jsx` | Modo release (ReleaseBlock) quando `has_work_releases && activeReleases.length > 0`; fallback legado (FormatBlock) caso contrário; suporte a `?release=<id>` para URLs compartilháveis |
| `src/components/mylist/EntryCard.jsx` | Resolve release da entry via `resolveEntryRelease`; exibe label do release; usa total específico do release |
| `src/pages/MyList.jsx` | `deduplicateEntries` inclui `release_id` e `season_mal_id` na chave — entries de releases distintos NÃO são deduplicadas |

## Como a Página Resolve WorkRelease

1. `useCatalog().getBySlug(slug)` retorna `media` com `media.releases` já pré-carregado pelo `CatalogContext`
2. `media.releases` é populado por `resolveReleasesSync(dynamicWork, releasesByGroupId)` em `CatalogContext`
3. `resolveReleasesSync` decide a fonte: WorkRelease (canônico) ou seasons[] (legado)
4. `filterActiveReleases(releases)` filtra por `isCategoryActive(release.category)` — Anime Only respeita category, não format
5. `media.has_work_releases === true` confirma que a fonte é WorkRelease (não legado)

## Como AnimeEntry é Associada ao Release

### Criação (ReleaseBlock.handleAdd)

```js
entryData = {
  title: media.title,           // franchise title (compat legado)
  type: entryType,              // anime | manga
  genre: `__format:${category}`,// marker legado
  release_id: release.release_id,  // VÍNCULO CANÔNICO
  season_mal_id: release.mal_id,   // fallback legado
  total_episodes: release.episode_count,
  total_chapters: release.chapter_count,
  ...
}
```

### Leitura (releaseTracking.findEntryForRelease)

1. Filtra entries por `created_by === userEmail`
2. Busca `entry.release_id === release.release_id` (match exato)
3. Se não encontrar, busca `entry.season_mal_id === release.mal_id` (fallback legado)
4. Se não encontrar, retorna `null` (não fuzzy match)

## Como Legacy season_mal_id Funciona

- Entradas antigas podem ter `release_id = null` e `season_mal_id` preenchido
- `findEntryForRelease` tenta `season_mal_id` quando `release_id` não match
- O `release.mal_id` vem do `ExternalMapping(provider=mal)` enriquecido por `getWorkReleases`
- Se o mapping retorna exatamente 1 `work_release_id`, o match é confiável
- Se retorna múltiplos (ambíguo), NÃO vincula automaticamente

## Como MyList Foi Ajustado

- `deduplicateEntries` agora usa chave: `${title}__${genre}__${release_id}__${season_mal_id}`
- Entries com `release_id` diferente NÃO são deduplicadas (HxH 1999 e HxH 2011 aparecem separadas)
- Entries sem `release_id` nem `season_mal_id` continuam sendo deduplicadas pelo comportamento legado
- Nenhum auto-delete — apenas deduplicação visual

## Como EntryCard Foi Ajustado

- Usa `useCatalog()` + `resolveEntryRelease(entry, catalog)` para encontrar o release
- Exibe `buildReleaseLabel(release, work.title)` como subtítulo quando diferente do título da franquia
- Usa `release.episode_count` / `release.chapter_count` como total quando disponível (mais preciso)
- Detecta airing via `release.status === "releasing"` além do catálogo legado

## Como Múltiplos Releases Aparecem na Obra

- Cada release ativo recebe um `ReleaseBlock` independente
- Cada bloco mostra: label do release, format · episódios · ano, status do release
- Cada bloco tem seu próprio: status selector, progresso, XP, botão remover
- Ordenação: `display_order → release_order → season_number → title` (já existente em `compareReleases`)
- `?release=<id>` na URL faz scroll suave para o bloco específico

## Query Param de Release

- `/obra/hunter-x-hunter?release=<release_id>` — scroll suave para o release
- Compatível com `?tipo=` existente (não substitui, coexiste)
- `?tipo=anime` continua válido para modo legado (FormatBlock)
- Não cria rota nova — mesma rota `/obra/:slug`

## Casos Reais Testados (Inspeção Estática)

### Hunter x Hunter (3 releases)
- `hunter-x-hunter-1999` — anime/TV, 62 ep, finished, 1999 → "Hunter x Hunter (1999)"
- `hunter-x-hunter-2011` — anime/TV, 148 ep, finished, 2011 → "Hunter x Hunter (2011)"
- `hunter-x-hunter-manga` — manga/MANGA, releasing, 1998 → **filtrado** (Anime Only)

### Attack on Titan (7 releases)
- 7 releases anime/TV, todos ativos durante Anime Only
- Cada um com label próprio e progresso independente

### One Piece (1 release)
- 1 release → 1 ReleaseBlock (funciona como antes)

### Gantz / Fullmetal Alchemist: Brotherhood / Your Name (sem releases)
- Sem WorkReleases → fallback para FormatBlock legado

## Casos de Teste (A–P)

| Caso | Descrição | Status |
|------|-----------|--------|
| A | Obra com 1 release → funciona como antes | ✅ Estático |
| B | Obra com 2+ releases → mostra separados | ✅ Estático |
| C | Cada release tem status próprio | ✅ Estático |
| D | Cada release tem progresso próprio | ✅ Estático |
| E | Adicionar release A → não adiciona B | ✅ Estático (entry criada com release_id específico) |
| F | Adicionar A e B → duas AnimeEntry | ✅ Estático (release_id diferente) |
| G | Incrementar A → B não muda | ✅ Estático (updateMutation age sobre entry.id específico) |
| H | Remover A → B permanece | ✅ Estático (deleteMutation deleta apenas entry.id específico) |
| I | Legacy season_mal_id → resolvida quando mapping confiável | ✅ Estático (findEntryForRelease fallback) |
| J | AnimeEntry moderna com release_id → prioridade máxima | ✅ Estático (release_id verificado primeiro) |
| K | Manga não aparece em Anime Only | ✅ Estático (filterActiveReleases + isCategoryActive) |
| L | Anime format MOVIE/OVA/SPECIAL aparece se category=anime | ✅ Estático (filtro por category, não format) |
| M | MyList diferencia releases | ✅ Estático (dedup key inclui release_id) |
| N | EntryCard diferencia releases | ✅ Estático (resolveEntryRelease + buildReleaseLabel) |
| O | Nenhum auto-delete | ✅ Estático (apenas dedup visual) |
| P | Nenhum fuzzy matching | ✅ Estático (apenas release_id e season_mal_id) |

## Problemas Encontrados nos Dados

1. **WorkRelease não tem campo `season_number`** — o schema não inclui `season_number`. A normalização em `workReleases.js` referencia `r.season_number` que sempre é `undefined`. O label usa o título do release (que já contém "Season 2", "(1999)", etc.) ou ano como fallback. Não é um bug — apenas significa que o caminho `season_number` do `buildReleaseLabel` é relevante apenas para seasons[] legado.

2. **83 obras migradas (sync_release_completed=true)** — destas, 74 têm múltiplos releases. As demais obras (~milhares) ainda usam seasons[] legado e continuam funcionando via FormatBlock.

3. **Sem idempotência backend para XP** — limitação pré-existente (documentada no checkpoint anterior). Não agravada nesta fase.

## GO / PARTIAL GO / NO-GO

**PARTIAL GO**

- ✅ Release mode funcional para obras migradas (WorkRelease)
- ✅ Legacy format mode preservado para obras não migradas
- ✅ Anime Only filtra por category (não format) — anime MOVIE/OVA/SPECIAL permanece ativo
- ✅ AnimeEntry vinculada por release_id (canônico) com fallback season_mal_id (legado)
- ✅ MyList não deduplica releases distintos
- ✅ EntryCard mostra label do release
- ✅ ?release= param para URLs compartilháveis
- ✅ Sem fuzzy matching, sem auto-delete, sem mudança de schema
- ⚠️ Testes A–P validados apenas estaticamente (sem runtime test)
- ⚠️ Idempotência backend de XP não garantida (pré-existente)
- ⚠️ WorkRelease sem campo `season_number` — label usa título/ano (funcional, mas menos estruturado)

## Próximas Fases (NÃO iniciadas)

- Fase 6 — metadata canônico
- Fase 7 — redesign visual
- Fase 8 — elenco/notas

Aguardando revisão do usuário antes de continuar.