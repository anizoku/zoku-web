# Anime-Only Freeze Report

**Data:** 2026-09-07 (atualizado)
**Status:** ANIME_ONLY ativo — feature freeze reversível
**Princípio:** PRESERVAÇÃO > NORMALIZAÇÃO (zero deleções)

---

## 1. MOTIVO DO FREEZE

O AniZoku está em fase de simplificação de escopo: focar temporariamente apenas em ANIME, congelando Manga, Filmes (não-anime) e Séries/Live-action. O objetivo é reduzir complexidade operacional durante a preparação para migração para Supabase, mantendo todos os dados preservados para reativação futura.

---

## 2. ARQUITETURA DERIVADA (Fonte Única de Verdade)

### Princípio

`ACTIVE_CATEGORIES` é a **única fonte de verdade**. Tudo o resto (`FROZEN_CATEGORIES`, `ANIME_ONLY_MODE`, tabs, guards) é **derivado** automaticamente. Para reativar uma categoria, basta adicioná-la a `ACTIVE_CATEGORIES` — nenhuma outra edição é necessária.

### Configuração central (`src/lib/scopeConfig.js` + `base44/shared/scopeConfig.ts`)

| Estado | Categorias |
|--------|-----------|
| **Ativas** | `anime` |
| **Congeladas (derivadas)** | `manga`, `movie`, `liveaction` |

### Categorias reais vs Filtro de UI

`'all'` **NÃO é uma categoria de conteúdo** — é apenas um filtro de UI. As funções de guard tratam `'all'` explicitamente:

| Input | `isCategoryActive` | `isCategoryFrozen` |
|-------|---------------------|---------------------|
| `'all'` | `true` | `false` |
| `'anime'` | `true` | `false` |
| `'manga'` | `false` | `true` |
| `'movie'` | `false` | `true` |
| `'liveaction'` | `false` | `true` |
| `undefined` / `null` / `''` | `false` | `false` |
| `'unknown'` (não-real) | `false` | `false` |

Categorias desconhecidas (não pertencentes a `ALL_CATEGORIES`) **nunca** são classificadas como frozen — safe default.

### Categoria vs Format

O freeze é por **category**, não por **format**. Anime com `format = MOVIE` (ex: Demon Slayer: Mugen Train) continua **ATIVO** porque `category = anime`.

---

## 3. EXPORTS DA SCOPE CONFIG

### Frontend: `src/lib/scopeConfig.js`

| Export | Tipo | Descrição |
|--------|------|-----------|
| `ALL_CATEGORIES` | string[] | `['anime', 'manga', 'movie', 'liveaction']` — categorias reais |
| `ACTIVE_CATEGORIES` | string[] | `['anime']` — **fonte de verdade** |
| `FROZEN_CATEGORIES` | string[] | Derivado: `ALL_CATEGORIES - ACTIVE_CATEGORIES` |
| `ANIME_ONLY_MODE` | boolean | Derivado: `true` quando só anime está ativo (informativo, **nunca** para guards) |
| `isCategoryActive(cat)` | function | `true` para ativas OU `'all'`; `false` para o resto |
| `isCategoryFrozen(cat)` | function | `true` apenas para categorias reais não-ativas; `false` para `'all'`, vazio, desconhecido |
| `hasActiveCategory(cats)` | function | True se array tem pelo menos uma categoria ativa |
| `filterActiveWorks(works)` | function | Filtra array de obras para apenas ativas |
| `CATEGORY_DEFINITIONS` | object | Labels PT-BR por categoria |
| `ACTIVE_CATEGORY_TABS` | array | Tabs derivadas: `Todos` + categorias ativas |
| `FROZEN_CATEGORY_TABS` | array | Tabs congeladas (para admin/visualização) |
| `ALL_CATEGORY_TABS` | array | Todas as tabs com flag `frozen` |

### Backend: `base44/shared/scopeConfig.ts`

Mesmas constantes e funções, importadas por ambos os backend functions de sync.

### Como reativar

Para reativar Manga no futuro, basta editar **um único array** em dois arquivos:

```js
export const ACTIVE_CATEGORIES = ['anime', 'manga'];
```

`FROZEN_CATEGORIES`, `ANIME_ONLY_MODE`, tabs, guards, e filtros **se atualizam automaticamente**. Nenhuma outra alteração de código é necessária.

---

## 4. ARQUIVOS MODIFICADOS

### Arquivos centrais (2)

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/scopeConfig.js` | Config central derivada (frontend) |
| `base44/shared/scopeConfig.ts` | Config central derivada (backend) |

### Arquivos de UI (1)

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/FrozenCategory.jsx` | Página "temporariamente indisponível" |

### Arquivos modificados — Frontend

| Arquivo | Modificação |
|---------|-------------|
| `src/contexts/CatalogContext.jsx` | Catálogo filtrado por `hasActiveCategory`; `getByCategory('all')` retorna catálogo ativo; congeladas retornam `[]`; `getCatalogStats` zera congeladas via `FROZEN_CATEGORIES` |
| `src/lib/recommendations.js` | `getRecommendations` e `getRelatedWorks` usam `filterActiveWorks(CATALOG)` |
| `src/lib/hybridSearch.js` | Pula `searchManga` quando manga inativa; bloqueia fallback TMDB quando movie/liveaction congelados |
| `src/pages/Trending.jsx` | `trending` usa `filterActiveWorks(CATALOG)` |
| `src/components/home/TrendingSection.jsx` | `fallbackItems` usa `filterActiveWorks(CATALOG)` |
| `src/components/home/HeroCarousel.jsx` | Filtra `trendingWorks` por `hasActiveCategory` |
| `src/pages/MyList.jsx` | Oculta entries de manga da UI; `handleAdd` força anime quando type congelado |
| `src/pages/Works.jsx` | Tabs usam `ACTIVE_CATEGORY_TABS`; categoria congelada → `FrozenCategory`; `handleAddExternal` mostra toast `CATEGORY_FROZEN` e não prossegue |
| `src/components/catalog/SuggestWorkModal.jsx` | `effectiveWorkType` faz fallback para primeira categoria ativa quando type congelado |
| `src/components/catalog/useTMDBPoster.jsx` | Bloqueia chamadas TMDB para movie/liveaction congelados |
| `src/pages/ObraProfile.jsx` | Bloqueia fetch TMDB para movie-only/liveaction-only congelados |
| `src/components/admin/CatalogSync.jsx` | Botões de sync manga desabilitados quando congelados; handlers emitem log `CATEGORY_FROZEN` |
| `src/App.jsx` | Rotas `/mangas`, `/films`, `/series` → `FrozenCategory` |

### Arquivos modificados — Backend (3)

| Arquivo | Modificação |
|---------|-------------|
| `base44/entities/SyncLog.jsonc` | Adicionado `SKIPPED_FROZEN_CATEGORY` ao enum `classification` |
| `base44/functions/anilistCatalogSync/entry.ts` | Guard usa `!isCategoryActive(wr.category)`; grupo `frozen_category` na seleção do lote; Layer 2 pre-write guard; contador `skippedFrozen` |
| `base44/functions/malCatalogSync/entry.ts` | Guard usa `!isCategoryActive(wr.category)`; separa `frozenCategory` no grouping; Layer 2 pre-write guard; contador `skippedFrozen` |

---

## 5. PONTOS DE SYNC PROTEGIDOS

### Camada 1 — Seleção do lote (Layer 1)

Ambos os backend functions separam releases com categoria congelada em um grupo `frozen_category` **antes** de qualquer chamada de API externa. Esses releases:

- ❌ Não fazem chamadas a AniList/Jikan
- ❌ Não recebem proposed_fields
- ❌ Não são escritos em WorkRelease ou DynamicWork
- ✅ Recebem um SyncLog com `classification: 'SKIPPED_FROZEN_CATEGORY'`
- ✅ São marcados como processados em `processedIds` (para checkpoint/resume)

### Camada 2 — Pre-write guard (Layer 2)

Dentro do loop de processamento, **antes** de qualquer cálculo de policy ou preparação de write:

```ts
if (!isCategoryActive(wr.category)) {
  // Log SKIPPED_FROZEN_CATEGORY, add to processedIds, continue
}
```

Safety net: mesmo se a Layer 1 for bypassada, a Layer 2 impede qualquer write em categorias congeladas. **Não depende de `ANIME_ONLY_MODE`** — usa `isCategoryActive` diretamente.

### Classificação SKIPPED_FROZEN_CATEGORY

- **NÃO** é classificada como ERROR
- **NÃO** conta como falha
- É registrada no SyncLog com `error_message`: `"Category {x} is not active (frozen)"`
- É contada no summary do SyncRun como `skipped_frozen`

---

## 6. PÁGINAS ESCONDIDAS

### Rotas redirecionadas para FrozenCategory

| Rota | Categoria | Comportamento |
|------|----------|---------------|
| `/mangas` | manga | `FrozenCategory category="manga"` |
| `/films` | movie | `FrozenCategory category="movie"` |
| `/series` | liveaction | `FrozenCategory category="liveaction"` |

### Página Works (`/obras`)

| URL | Resultado |
|-----|-----------|
| `/obras` | Catálogo anime (categoria default = `'all'`) |
| `/obras?categoria=all` | Catálogo anime (todo catálogo ativo) |
| `/obras?categoria=anime` | Catálogo anime |
| `/obras?categoria=manga` | `FrozenCategory` |
| `/obras?categoria=movie` | `FrozenCategory` |
| `/obras?categoria=liveaction` | `FrozenCategory` |

`'all'`, `undefined`, `null`, `''` **nunca** mostram FrozenCategory.

### Página Trending (`/trending`)

- Tabs mostram apenas: **Todos** + **Animes**
- Dados filtrados por `filterActiveWorks(CATALOG)`

---

## 7. FILTROS ADICIONADOS

| Chokepoint | Filtro | Arquivo |
|------------|--------|---------|
| Catálogo mesclado | `hasActiveCategory(item.categories)` | CatalogContext.jsx |
| `getByCategory('all')` | Retorna catálogo ativo completo | CatalogContext.jsx |
| `getByCategory(frozen)` | Retorna `[]` | CatalogContext.jsx |
| `getCatalogStats` | Zera contadores congeladas | CatalogContext.jsx |
| Recomendações | `filterActiveWorks(CATALOG)` | recommendations.js |
| Obras relacionadas | `filterActiveWorks(CATALOG)` | recommendations.js |
| Busca global | Usa catálogo filtrado do contexto | useGlobalSearch.js |
| Busca externa manga | Pula `searchManga` quando manga inativa | hybridSearch.js |
| Busca externa TMDB | Bloqueia fallback TMDB quando movie/liveaction congelados | hybridSearch.js |
| TMDB poster | Bloqueia TMDB para movie/liveaction congelados | useTMDBPoster.jsx |
| TMDB ObraProfile | Bloqueia fetch TMDB para movie-only/liveaction-only | ObraProfile.jsx |
| Trending page | `filterActiveWorks(CATALOG)` | Trending.jsx |
| Trending section (home) | `filterActiveWorks(CATALOG)` | TrendingSection.jsx |
| Hero carousel | `hasActiveCategory(cats)` | HeroCarousel.jsx |
| My List | Oculta `type === "manga"` | MyList.jsx |
| Add Entry | Força `type = "anime"` quando congelado | MyList.jsx |
| Suggest Work modal | Fallback para primeira categoria ativa | SuggestWorkModal.jsx |
| Works page tabs | `ACTIVE_CATEGORY_TABS` | Works.jsx |
| Works `handleAddExternal` | Toast `CATEGORY_FROZEN` + não prossegue | Works.jsx |
| CatalogSync admin manga | Botões desabilitados + log `CATEGORY_FROZEN` | CatalogSync.jsx |
| Sync AniList | Layer 1 + Layer 2 (`!isCategoryActive`) | anilistCatalogSync |
| Sync MAL/Jikan | Layer 1 + Layer 2 (`!isCategoryActive`) | malCatalogSync |

---

## 8. DADOS PRESERVADOS

### Contagens de dados congelados (auditado 2026-09-07)

| Categoria | DynamicWork | WorkRelease | AnimeEntry | ExternalMapping |
|-----------|-------------|-------------|-----------|----------------|
| **Manga** | 375 | 1 | 6 | (em provider mal) |
| **Movie** | 43 | 6 | 0 | 0 |
| **Live-action** | 0 | 0 | 0 | 0 |
| **Multi (anime+manga)** | 44 | — | — | — |

### Confirmação: ZERO deleções

- ✅ Nenhum DynamicWork, WorkRelease, AnimeEntry, ExternalMapping, CardOverride deletado
- ✅ Nenhuma rota, componente, ou enum value removido

---

## 9. COMPORTAMENTO DO ADMIN

| Ferramenta | Comportamento |
|------------|---------------|
| CatalogManager | Preservado; admin pode ver dados congelados |
| CatalogSync — Animes | ✅ Funciona normalmente |
| CatalogSync — Mangás (Jikan) | ❌ Botão desabilitado quando manga congelada |
| CatalogSync — Mangás (Híbrida) | ❌ Botão desabilitado quando manga congelada |
| CatalogSync — Tudo (Jikan) | Pula fase de manga automaticamente com log `CATEGORY_FROZEN` |
| CardOverride | Preservado |
| FranchiseMerger | Preservado |
| Criar obra (Works page) | `handleAddExternal` mostra toast `CATEGORY_FROZEN` se type congelado |

---

## 10. TESTES EXECUTADOS

### Validação da lógica de freeze (9 cenários)

| Input | `isCategoryActive` | `isCategoryFrozen` | Pass |
|-------|---------------------|---------------------|------|
| `'all'` | `true` | `false` | ✅ |
| `'anime'` | `true` | `false` | ✅ |
| `'manga'` | `false` | `true` | ✅ |
| `'movie'` | `false` | `true` | ✅ |
| `'liveaction'` | `false` | `true` | ✅ |
| `undefined` | `false` | `false` | ✅ |
| `null` | `false` | `false` | ✅ |
| `''` | `false` | `false` | ✅ |
| `'unknown'` | `false` | `false` | ✅ |

### Validação de rotas /obras

| URL | Esperado | Status |
|-----|----------|--------|
| `/obras` | Catálogo anime | ✅ `isCategoryFrozen('all')` = false |
| `/obras?categoria=all` | Catálogo anime | ✅ `getByCategory('all')` retorna catálogo ativo |
| `/obras?categoria=anime` | Catálogo anime | ✅ `isCategoryFrozen('anime')` = false |
| `/obras?categoria=manga` | FrozenCategory | ✅ `isCategoryFrozen('manga')` = true |
| `/obras?categoria=movie` | FrozenCategory | ✅ `isCategoryFrozen('movie')` = true |
| `/obras?categoria=liveaction` | FrozenCategory | ✅ `isCategoryFrozen('liveaction')` = true |

### Validação de dados

| Teste | Resultado |
|-------|-----------|
| Nenhum anime desapareceu | ✅ `hasActiveCategory(['anime'])` = true |
| Nenhum manga/movie/liveaction no catálogo ativo | ✅ `filterActiveWorks` remove obras sem categoria ativa |
| Obras multi-categoria (anime+manga) | ✅ Permanecem ativas (têm anime) |

---

## 11. RISCOS E AMBIGUIDADES

### Risco 1: Obras multi-categoria (anime + manga)

44 DynamicWork têm tanto `anime` quanto `manga`. Permanecem **ativas** porque `hasActiveCategory` retorna true se pelo menos uma categoria for ativa.

### Risco 2: ObraProfile de manga-only

Se um usuário acessar `/obra/some-manga-only-slug` via URL direta, a obra não estará no catálogo filtrado. A página pode mostrar "não encontrado". Aceitável — a obra existe no banco mas está congelada.

### Risco 3: AnimeEntry de manga em XP/Ranking

As 6 AnimeEntry de manga continuam no banco e contam para XP. Intencional — o progresso do usuário em manga é preservado.

### Risco 4: Admin pode criar obra manga via API direta

O admin ainda pode criar DynamicWork com `categories: ["manga"]` via painel administrativo ou API direta. `handleAddExternal` na página Works bloqueia com toast `CATEGORY_FROZEN`, mas o admin direto pela entidade não tem guard. Aceitável — a obra seria preservada mas não apareceria no produto ativo.

### Risco 5: TMDB

TMDB bloqueado para movie/liveaction congelados em `useTMDBPoster`, `ObraProfile`, e `hybridSearch`. `TrendingSection` usa `fetchTMDBTrending` mas o fallback é filtrado por `filterActiveWorks`. Resultados TMDB de não-anime não estão no catálogo AniZoku, então não aparecem no produto ativo.

---

## 12. INSTRUÇÃO PARA REATIVAR MANGA/MOVIE/LIVE-ACTION

### Passo único

Editar **um array** em dois arquivos:

**`src/lib/scopeConfig.js`:**
```js
export const ACTIVE_CATEGORIES = ['anime', 'manga'];
```

**`base44/shared/scopeConfig.ts`:**
```ts
export const ACTIVE_CATEGORIES = ['anime', 'manga'];
```

### O que acontece automaticamente

- `FROZEN_CATEGORIES` rederiva para `['movie', 'liveaction']`
- `ANIME_ONLY_MODE` rederiva para `false`
- Catálogo volta a incluir obras de manga
- `getByCategory("manga")` retorna resultados
- Tabs de Mangás reaparecem em Works e Trending
- AnimeEntry de manga reaparece na Minha Lista
- `hybridSearch` volta a buscar manga
- Sync volta a processar releases de manga
- `SuggestWorkModal` volta a permitir sugerir manga
- Botões de sync manga no admin reabilitam
- TMDB volta a funcionar para movie/liveaction (se reativados)

### O que NÃO precisa ser feito

- ❌ Não recriar dados (tudo preservado)
- ❌ Não recriar rotas (tudo preservado)
- ❌ Não recriar componentes (tudo preservado)
- ❌ Não modificar Supabase DDL (schema preparado)
- ❌ Não remover guards (verificam `isCategoryActive`/`isCategoryFrozen` dinamicamente)

---

## 13. ADMIN FREEZE AUDIT

### Resumo

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

### Por aba

| Aba | Lê frozen? | Escreve frozen? | API externa frozen? | Status |
|-----|-----------|-----------------|---------------------|--------|
| Catálogo Dinâmico | ✅ | ❌ BLOCKED | ❌ BLOCKED | SAFE |
| Catálogo | ✅ | ❌ BLOCKED (disabled) | N/A | SAFE |
| Sincronização | ✅ | ❌ BLOCKED | ❌ BLOCKED | SAFE |
| Sugestões | ✅ | ❌ BLOCKED | N/A | SAFE |
| Moderação | N/A | N/A | N/A | N/A |
| Manutenção | ✅ | ❌ BLOCKED (filtrado) | N/A | SAFE |
| Unificar Obras | ✅ | ❌ BLOCKED (manga-only excluído) | ✅ Jikan (anime only) | SAFE |
| Notícias | ✅ | ✅ (editorial) | N/A | N/A |
| Aparência | N/A | N/A | N/A | N/A |
| Banners | N/A | N/A | N/A | N/A |
| Arte de Fãs | ✅ | ✅ (comunidade) | N/A | N/A |
| Editor de Card | ✅ | ❌ BLOCKED (disabled) | N/A | SAFE |

### Defense-in-Depth

Cada aba que toca catálogo tem guards em múltiplas camadas:
1. **UI:** botões disabled + badges "FROZEN"
2. **Handler:** early return antes de chamar library
3. **Mutation:** throw antes de writes (SuggestionsPanel)
4. **Library:** return antes de fetch/write (catalogAutoSync, jikan)
5. **Backend:** Layer 1 grouping + Layer 2 pre-write (anilistCatalogSync, malCatalogSync)

Relatório detalhado: `src/lib/adminAnimeOnlyAudit.md`

---

## 14. GO / NO-GO

### ✅ **GO** — AniZoku operacionalmente ANIME ONLY

- ✅ Bug do `'all'` corrigido: `/obras` e `/obras?categoria=all` mostram catálogo anime
- ✅ Arquitetura derivada: `ACTIVE_CATEGORIES` é a única fonte de verdade
- ✅ Freeze reversível, centralizado, com proteção de sync em duas camadas
- ✅ Zero deleções confirmadas
- ✅ Zero writes em categorias congeladas (Layer 1 + Layer 2 via `!isCategoryActive`)
- ✅ TMDB bloqueado para movie/liveaction congelados
- ✅ CatalogSync admin desabilita sync de manga quando congelada
- ✅ Todos os dados preservados para reativação futura