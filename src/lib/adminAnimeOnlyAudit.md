# Admin Anime-Only Audit

**Data:** 2026-09-07
**Status:** HARDENING COMPLETO — Área Admin protegida para ANIME_ONLY
**Princípio:** Defense-in-depth (UI disabled + library guard + mutation guard)
**Zero deleções · Zero writes em categorias congeladas · Zero API calls para categorias congeladas**

---

## RESUMO EXECUTIVO

| Flag | Status |
|------|--------|
| MANGA_EXTERNAL_SYNC | BLOCKED |
| MANGA_IMPORT | BLOCKED |
| MANGA_ADMIN_WRITES | BLOCKED (except explicit developer/service-role) |
| MOVIE_LIVEACTION_SYNC | BLOCKED |
| TMDB_MOVIE_LIVEACTION_IMPORT | BLOCKED |
| ANIME_SYNC | ACTIVE |
| ANIME_FORMAT_MOVIE | ACTIVE |
| ZERO DELETIONS | ✅ CONFIRMED |

---

## AUDITORIA POR ABA

### 1. Catálogo Dinâmico (`DynamicCatalogPanel.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (stats incluem todas as obras) |
| Pode escrever frozen data? | ❌ BLOCKED |
| Pode chamar API externa para frozen category? | ❌ BLOCKED |
| Status | **SAFE** |

**Guards:**
- **UI:** Botão "Top 500 Mangás" disabled + badge "FROZEN" quando manga congelada
- **Handler:** `handleImportMangas()` verifica `isCategoryFrozen("manga")` antes de chamar `importTopWorks`
- **Library:** `importTopWorks("manga", ...)` verifica `isCategoryActive("manga")` antes de qualquer fetch — retorna `{ categoryFrozen: true }` com 0 API calls, 0 writes
- **Hybrid:** `importTopWorksBothSources("anime", ...)` só importa anime; bloco TMDB complementar é simulação (sem writes de movie/liveaction)

---

### 2. Catálogo (`CatalogManager.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (todas as obras listadas) |
| Pode escrever frozen data? | ❌ BLOCKED (checkboxes disabled) |
| Pode chamar API externa para frozen category? | N/A (não faz chamadas externas) |
| Status | **SAFE** |

**Guards:**
- **UI:** Checkboxes de categorias congeladas (manga, movie, liveaction) disabled + ícone snowflake
- **Handler:** `handleCheckboxChange` ignora mudanças em categorias congeladas (`if (isCategoryFrozen(catalogKey)) return`)
- **Dados:** Obras congeladas permanecem visíveis mas não editáveis

---

### 3. Sincronização (`CatalogSync.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (SyncStatusTable mostra registros) |
| Pode escrever frozen data? | ❌ BLOCKED |
| Pode chamar API externa para frozen category? | ❌ BLOCKED |
| Status | **SAFE** |

**Guards:**
- **UI:** Botões "Mangás (Jikan)" e "Mangás (Híbrida)" disabled + badge "FROZEN"
- **UI:** Botão "Tudo (Jikan)" renomeado para "Todos os Animes (Jikan)" durante freeze
- **Handler:** `handleSyncMangas` e `handleSyncHybridMangas` verificam `isCategoryFrozen("manga")` — emitem log `CATEGORY_FROZEN` e retornam
- **Handler:** `handleSyncAll` pula fase de manga automaticamente quando congelada
- **Library:** `syncAllMangas()` verifica `isCategoryActive("manga")` — retorna `{ categoryFrozen: true }` com 0 API calls
- **Library:** `syncMangaData()` verifica `isCategoryActive("manga")` — retorna `{ sync_status: "frozen" }` com 0 API calls
- **Library:** `runHybridMangaSync()` verifica `isCategoryActive("manga")` — retorna `{ categoryFrozen: true }` com 0 API calls
- **Library:** `syncWorkFromJikan()` — bloco manga condicional a `isCategoryActive("manga")`
- **Backend:** `anilistCatalogSync` e `malCatalogSync` — Layer 1 (grouping) + Layer 2 (pre-write guard) via `!isCategoryActive(wr.category)`

---

### 4. Sugestões (`SuggestionsPanel.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (sugestões de manga visíveis) |
| Pode escrever frozen data? | ❌ BLOCKED |
| Pode chamar API externa para frozen category? | N/A (não faz chamadas externas na aprovação) |
| Status | **SAFE** |

**Guards:**
- **UI:** Botão "Aprovar" disabled + badge "FROZEN" quando `suggestion.type` é manga
- **Mutation:** `approveMutation.mutationFn` verifica `isCategoryActive(suggestion.type)` — lança erro `CATEGORY_FROZEN` antes de qualquer write em CatalogSync
- **Preservação:** Sugestões antigas de manga permanecem visíveis e podem ser rejeitadas (mas não aprovadas para catálogo)
- **Zero writes:** Mesmo se UI for bypassada, a mutation bloqueia antes de `CatalogSync.create` ou `CatalogSync.update`

---

### 5. Moderação (`ModerationPanel.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | N/A (modera conteúdo social, não catálogo) |
| Pode escrever frozen data? | N/A |
| Pode chamar API externa para frozen category? | N/A |
| Status | **N/A** (não toca catálogo) |

---

### 6. Manutenção (`MigrateEntriesPanel.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (lê todas as entries) |
| Pode escrever frozen data? | ❌ BLOCKED (entries congeladas filtradas) |
| Pode chamar API externa para frozen category? | N/A (não faz chamadas externas) |
| Status | **SAFE** |

**Guards:**
- **Filtro:** `toFix` filtrado para apenas entries de categorias ativas (`isEntryActive(entry)`)
- **Separação:** `frozenEntries` contadas separadamente — preservadas, não atualizadas, não apagadas, não contam como erro
- **Relatório:** Summary inclui coluna "Congeladas" mostrando quantas entries foram ignoradas
- **Log:** `"X entrada(s) congelada(s) ignorada(s) — preservadas, sem alteração."`
- **Anime movie:** Entries de anime com format=MOVIE continuam ativas (category=anime)

---

### 7. Unificar Obras (`FranchiseMerger.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (DynamicWork listado) |
| Pode escrever frozen data? | ❌ BLOCKED (manga-only excluído da detecção) |
| Pode chamar API externa para frozen category? | ✅ Jikan (apenas para anime — importRoot cria anime) |
| Status | **SAFE** |

**Guards:**
- **Detecção:** `useEffect` filtra `cats.includes("anime") && w.mal_id` — manga-only works (sem mal_id) excluídos automaticamente
- **Merge:** `applyMerge` — ao deletar absorbed works, verifica se tem categoria congelada (`cats.some(c => !isCategoryActive(c) && c !== "anime")`) — se sim, skip da deleção (preserva dados de manga)
- **Import Root:** `importRoot` cria DynamicWork com `categories: ["anime"]` ou `["anime", "filme"]` — sempre anime, nunca manga/movie/liveaction puro
- **Multi-categoria:** Obras anime+manga podem participar pelo lado anime, mas não são deletadas (manga data preservada)
- **Histórico:** Merges já aplicados não são alterados

---

### 8. Notícias (`NewsManager.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (notícias de manga visíveis) |
| Pode escrever frozen data? | ✅ Sim (admin pode criar/editar notícias de manga) |
| Pode chamar API externa para frozen category? | N/A |
| Status | **N/A** (notícias não são catálogo — freeze não se aplica) |

**Nota:** Notícias são conteúdo editorial, não dados de catálogo. O freeze de manga/movie/liveaction não se aplica a notícias — o admin pode continuar criando notícias sobre qualquer categoria.

---

### 9. Aparência (`AppearanceManager.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | N/A (gerencia logos e sons, não catálogo) |
| Pode escrever frozen data? | N/A |
| Pode chamar API externa para frozen category? | N/A |
| Status | **N/A** (não toca catálogo) |

---

### 10. Banners (`BannersPanel.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | N/A (gerencia banners promocionais) |
| Pode escrever frozen data? | N/A |
| Pode chamar API externa para frozen category? | N/A |
| Status | **N/A** (não toca catálogo) |

---

### 11. Arte de Fãs (`FanArtPanel.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (fanarts visíveis) |
| Pode escrever frozen data? | ✅ Sim (admin pode gerenciar fanarts) |
| Pode chamar API externa para frozen category? | N/A |
| Status | **N/A** (fanart não é catálogo — freeze não se aplica) |

**Nota:** FanArt é conteúdo da comunidade, não dados de catálogo. O freeze não se aplica.

---

### 12. Editor de Card (`AdminEditCardModal.jsx`)

| Pergunta | Resposta |
|----------|---------|
| Pode ler frozen data? | ✅ Sim (overrides existentes visíveis) |
| Pode escrever frozen data? | ❌ BLOCKED (uploads disabled para frozen) |
| Pode chamar API externa para frozen category? | N/A (usa UploadFile, não API de catálogo) |
| Status | **SAFE** |

**Guards:**
- **UI:** `CategoryImageBlock` para categorias congeladas mostra badge "FROZEN" e texto "Categoria congelada — upload de imagem desativado."
- **UI:** Botões Upload/Trocar/Remover/Restaurar não renderizados para categorias congeladas
- **Save Meta:** `handleSaveMeta` skip updates em overrides de categorias congeladas (`!o.category || !isCategoryFrozen(o.category)`)
- **Preservação:** Overrides existentes em categorias congeladas NÃO são apagados

---

## TESTES DE SEGURANÇA (LÓGICOS)

| # | Teste | Esperado | Resultado |
|---|-------|----------|-----------|
| A | Admin > Catálogo Dinâmico > Top 500 Mangás | disabled / CATEGORY_FROZEN / 0 Jikan calls / 0 writes | ✅ UI disabled + handler guard + library guard |
| B | `importTopWorks("manga")` direto | CATEGORY_FROZEN / 0 API calls / 0 writes | ✅ Library guard retorna `{ categoryFrozen: true }` |
| C | `syncAllMangas()` direto | CATEGORY_FROZEN / 0 API calls / 0 writes | ✅ Library guard retorna `{ categoryFrozen: true }` |
| D | `runHybridMangaSync()` direto | CATEGORY_FROZEN / 0 API calls / 0 writes | ✅ Library guard retorna `{ categoryFrozen: true }` |
| E | Sugestão de manga > Aprovar | bloqueado / 0 CatalogSync writes | ✅ UI disabled + mutation guard (throw) |
| F | Manutenção (AnimeEntry manga) | ignorado / preservado | ✅ Filtro `isEntryActive` + coluna "Congeladas" |
| G | FranchiseMerger com manga-only | não processado | ✅ Filtro `cats.includes("anime") && w.mal_id` |
| H | Movie/liveaction import/sync/create | bloqueado | ✅ Library guards (`!isCategoryActive`) |
| I | Anime category=anime format=MOVIE | permitido | ✅ `isCategoryActive("anime")` = true |
| J | Anime normal | funciona | ✅ Sem guard em anime |

---

## ARQUITETURA DE GUARDS (Defense-in-Depth)

```
┌─ UI Layer (buttons disabled, badges FROZEN) ─────────────────────┐
│  DynamicCatalogPanel · CatalogSync · SuggestionsPanel            │
│  CategoryManager · AdminEditCardModal                            │
├─ Handler Layer (early return before library call) ───────────────┤
│  handleImportMangas · handleSyncMangas · handleSyncHybridMangas  │
│  handleSyncAll (skip manga phase)                                │
├─ Mutation Layer (throw before writes) ───────────────────────────┤
│  approveMutation (SuggestionsPanel)                             │
├─ Library Layer (return before fetch/write) ──────────────────────┤
│  importTopWorks · importTopWorksBothSources · runHybridMangaSync │
│  syncAllMangas · syncMangaData · syncWorkFromJikan               │
├─ Backend Layer (Layer 1 grouping + Layer 2 pre-write) ───────────┤
│  anilistCatalogSync · malCatalogSync                             │
└─ Data Layer (zero deletions, zero writes for frozen) ────────────┘
```

Cada camada é independente — se uma falhar, a próxima bloqueia.

---

## GO / NO-GO FINAL

### ✅ **GO** — Área Admin HARDENED para ANIME_ONLY

- ✅ Manga sync: BLOCKED em 4 camadas (UI + handler + library + backend)
- ✅ Manga import: BLOCKED em 3 camadas (UI + handler + library)
- ✅ Manga admin writes: BLOCKED (CatalogSync, DynamicWork, CardOverride)
- ✅ Movie/liveaction sync/import: BLOCKED (library guards)
- ✅ TMDB movie/liveaction import: BLOCKED (não há fluxo de import TMDB para movie/liveaction)
- ✅ Anime sync: ACTIVE
- ✅ Anime format=MOVIE: ACTIVE (category=anime)
- ✅ Zero deleções confirmado
- ✅ Zero API calls para categorias congeladas
- ✅ Defense-in-depth em todas as abas que tocam catálogo