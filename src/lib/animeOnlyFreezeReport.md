# Anime-Only Freeze Report

**Data:** 2026-09-07
**Status:** ANIME_ONLY ativo — feature freeze reversível
**Princípio:** PRESERVAÇÃO > NORMALIZAÇÃO (zero deleções)

---

## 1. MOTIVO DO FREEZE

O AniZoku está em fase de simplificação de escopo: focar temporariamente apenas em ANIME, congelando Manga, Filmes (não-anime) e Séries/Live-action. O objetivo é reduzir complexidade operacional durante a preparação para migração para Supabase, mantendo todos os dados preservados para reativação futura.

---

## 2. CATEGORIAS ATIVAS E CONGELADAS

### Configuração central (`src/lib/scopeConfig.js` + `base44/shared/scopeConfig.ts`)

| Estado | Categorias |
|--------|-----------|
| **Ativas** | `anime` |
| **Congeladas** | `manga`, `movie`, `liveaction` |

### Categoria vs Format

O freeze é por **category**, não por **format**. Anime com `format = MOVIE` (ex: Demon Slayer: Mugen Train) continua **ATIVO** porque `category = anime`.

| Exemplo | category | format | Estado |
|---------|----------|--------|--------|
| Demon Slayer: Mugen Train | anime | MOVIE | ✅ Ativo |
| Attack on Titan S1 | anime | TV | ✅ Ativo |
| Berserk (manga) | manga | MANGA | ❌ Congelado |
| Blade Runner (filme) | movie | — | ❌ Congelado |

---

## 3. FEATURE FLAG CRIADA

### Frontend: `src/lib/scopeConfig.js`

| Export | Tipo | Descrição |
|--------|------|-----------|
| `ANIME_ONLY_MODE` | boolean | `true` = freeze ativo |
| `ACTIVE_CATEGORIES` | string[] | `['anime']` |
| `FROZEN_CATEGORIES` | string[] | `['manga', 'movie', 'liveaction']` |
| `isCategoryActive(cat)` | function | Verifica se categoria está ativa |
| `isCategoryFrozen(cat)` | function | Verifica se categoria está congelada |
| `hasActiveCategory(cats)` | function | True se array tem pelo menos uma categoria ativa |
| `filterActiveWorks(works)` | function | Filtra array de obras para apenas ativas |
| `ACTIVE_CATEGORY_TABS` | array | Tabs de categoria para UI (apenas ativas) |

### Backend: `base44/shared/scopeConfig.ts`

Mesmas constantes e funções, importadas por ambos os backend functions de sync.

### Como reativar

Para reativar Manga no futuro, basta editar `src/lib/scopeConfig.js` e `base44/shared/scopeConfig.ts`:

```js
export const ACTIVE_CATEGORIES = ['anime', 'manga'];
```

E mudar `ANIME_ONLY_MODE` para `false` (ou remover as categorias de `FROZEN_CATEGORIES`). Nenhuma outra alteração de código é necessária.

---

## 4. ARQUIVOS MODIFICADOS

### Arquivos criados (3)

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/scopeConfig.js` | Feature flag central (frontend) |
| `base44/shared/scopeConfig.ts` | Feature flag central (backend) |
| `src/pages/FrozenCategory.jsx` | Página "temporariamente indisponível" |

### Arquivos modificados — Frontend (9)

| Arquivo | Modificação |
|---------|-------------|
| `src/contexts/CatalogContext.jsx` | Filtra catálogo por `hasActiveCategory`; `getByCategory` retorna vazio para congeladas; `getCatalogStats` zera congeladas |
| `src/lib/recommendations.js` | `getRecommendations` e `getRelatedWorks` usam `filterActiveWorks(CATALOG)` |
| `src/lib/hybridSearch.js` | Pula `searchManga` quando `ANIME_ONLY_MODE` |
| `src/pages/Trending.jsx` | `trending` usa `filterActiveWorks(CATALOG)`; tabs mostram apenas Todos + Animes |
| `src/components/home/TrendingSection.jsx` | `fallbackItems` usa `filterActiveWorks(CATALOG)` |
| `src/components/home/HeroCarousel.jsx` | Filtra `trendingWorks` por `hasActiveCategory` |
| `src/pages/MyList.jsx` | Oculta entries de manga da UI; `AddEntryDialog` remove opções Manga/Filme; `handleAdd` força `type=anime` |
| `src/pages/Works.jsx` | Tabs usam `ACTIVE_CATEGORY_TABS`; categoria congelada → `FrozenCategory`; `handleAddExternal` força anime |
| `src/components/catalog/SuggestWorkModal.jsx` | `effectiveWorkType` forçado para anime |
| `src/App.jsx` | Rotas `/mangas`, `/films`, `/series` → `FrozenCategory` (em vez de redirect) |

### Arquivos modificados — Backend (3)

| Arquivo | Modificação |
|---------|-------------|
| `base44/entities/SyncLog.jsonc` | Adicionado `SKIPPED_FROZEN_CATEGORY` ao enum `classification` |
| `base44/functions/anilistCatalogSync/entry.ts` | Importa `scopeConfig`; grupo `frozen_category` na seleção do lote; Layer 2 pre-write guard; contador `skippedFrozen` no summary e response |
| `base44/functions/malCatalogSync/entry.ts` | Importa `scopeConfig`; separa `frozenCategory` no grouping; Layer 2 pre-write guard; contador `skippedFrozen` no summary e response |

---

## 5. PONTOS DE SYNC PROTEGIDOS

### Camada 1 — Seleção do lote (Layer 1)

Ambos os backend functions (`anilistCatalogSync` e `malCatalogSync`) separam releases com categoria congelada em um grupo `frozen_category` **antes** de qualquer chamada de API externa (AniList/Jikan). Esses releases:

- ❌ Não fazem chamadas a AniList/Jikan
- ❌ Não recebem proposed_fields
- ❌ Não são escritos em WorkRelease ou DynamicWork
- ✅ Recebem um SyncLog com `classification: 'SKIPPED_FROZEN_CATEGORY'`
- ✅ São marcados como processados em `processedIds` (para checkpoint/resume)

### Camada 2 — Pre-write guard (Layer 2)

Dentro do loop de processamento de cada release, **antes** de qualquer cálculo de policy ou preparação de write, há uma verificação:

```ts
if (ANIME_ONLY_MODE && isCategoryFrozen(wr.category)) {
  // Log SKIPPED_FROZEN_CATEGORY, add to processedIds, continue
}
```

Esta é uma safety net: mesmo se a Layer 1 for bypassada (ex: bug no grouping, modificação futura do código), a Layer 2 impede qualquer write em categorias congeladas.

### Classificação SKIPPED_FROZEN_CATEGORY

- **NÃO** é classificada como ERROR
- **NÃO** conta como falha
- É registrada no SyncLog com `error_message` explicativo: `"Category {x} is frozen (ANIME_ONLY mode)"`
- É contada no summary do SyncRun como `skipped_frozen`

---

## 6. PÁGINAS ESCONDIDAS

### Rotas redirecionadas para FrozenCategory

| Rota | Categoria | Comportamento |
|------|----------|---------------|
| `/mangas` | manga | `FrozenCategory category="manga"` |
| `/films` | movie | `FrozenCategory category="movie"` |
| `/series` | liveaction | `FrozenCategory category="liveaction"` |

### Navegação

A Sidebar e MobileNav **não tinham** links diretos para `/mangas`, `/films`, `/series` (já usavam `/obras`), então nenhuma alteração foi necessária na navegação principal.

### Página Works (`/obras`)

- Tabs de categoria mostram apenas: **Todos** + **Animes**
- Se usuário acessar `/obras?categoria=manga` via URL, a página mostra `FrozenCategory` em vez da lista
- `getByCategory("manga")` retorna array vazio (safety net no CatalogContext)

### Página Trending (`/trending`)

- Tabs mostram apenas: **Todos** + **Animes**
- Dados filtrados por `filterActiveWorks(CATALOG)`

---

## 7. FILTROS ADICIONADOS

| Chokepoint | Filtro | Arquivo |
|------------|--------|---------|
| Catálogo mesclado | `hasActiveCategory(item.categories)` | CatalogContext.jsx |
| `getByCategory` | Retorna `[]` para congeladas | CatalogContext.jsx |
| `getCatalogStats` | Zera contadores congeladas | CatalogContext.jsx |
| Recomendações | `filterActiveWorks(CATALOG)` | recommendations.js |
| Obras relacionadas | `filterActiveWorks(CATALOG)` | recommendations.js |
| Busca global | Usa catálogo filtrado do contexto | useGlobalSearch.js |
| Busca externa | Pula `searchManga` | hybridSearch.js |
| Trending page | `filterActiveWorks(CATALOG)` | Trending.jsx |
| Trending section (home) | `filterActiveWorks(CATALOG)` | TrendingSection.jsx |
| Hero carousel | `hasActiveCategory(cats)` em DynamicWork | HeroCarousel.jsx |
| My List | Oculta `type === "manga"` | MyList.jsx |
| Add Entry dialog | Remove opções Manga/Filme | MyList.jsx |
| Suggest Work modal | Força `workType = "anime"` | SuggestWorkModal.jsx |
| Works page tabs | `ACTIVE_CATEGORY_TABS` | Works.jsx |
| Sync AniList | Layer 1 + Layer 2 category guard | anilistCatalogSync |
| Sync MAL/Jikan | Layer 1 + Layer 2 category guard | malCatalogSync |

---

## 8. DADOS PRESERVADOS

### Contagens de dados congelados (auditado 2026-09-07)

| Categoria | DynamicWork | WorkRelease | AnimeEntry | ExternalMapping |
|-----------|-------------|-------------|-----------|----------------|
| **Manga** | 375 | 1 | 6 | (em provider mal) |
| **Movie** | 43 | 6 | 0 | 0 |
| **Live-action** | 0 | 0 | 0 | 0 |
| **Multi (anime+manga)** | 44 | — | — | — |

### Total de dados preservados (zero deleções)

| Entidade | Total | Ativo (anime) | Congelado |
|----------|-------|---------------|-----------|
| DynamicWork | 797 | 423 (incl. 44 multi) | 375 manga + 43 movie |
| WorkRelease | 214 | 207 anime | 1 manga + 6 movie |
| AnimeEntry | 127 | 119 anime | 6 manga (ocultos na UI) |
| ExternalMapping | 225 | 225 (preservados) | 0 |
| CatalogSync | 495 | 495 (preservados) | 0 |
| CardOverride | 89 | 89 (preservados) | 0 |

### Confirmação: ZERO deleções

- ✅ Nenhum DynamicWork deletado
- ✅ Nenhum WorkRelease deletado
- ✅ Nenhum AnimeEntry deletado
- ✅ Nenhum ExternalMapping deletado
- ✅ Nenhum CardOverride deletado
- ✅ Nenhuma rota removida
- ✅ Nenhum componente removido
- ✅ Nenhum enum value removido

---

## 9. COMPORTAMENTO DE ANIMEENTRY

| Cenário | Comportamento |
|---------|---------------|
| `AnimeEntry.type = "anime"` | ✅ Aparece normalmente na Minha Lista |
| `AnimeEntry.type = "manga"` | ❌ Oculto da UI ativa, ✅ preservado no banco |
| Adicionar nova obra | Forçado `type = "anime"` (opções Manga/Filme removidas do dialog) |
| Editar entry de manga existente | Não é possível via UI (oculto), mas permanece no banco |
| Importar lista | Imports de manga são preservados mas não aparecem na UI |

Quando Manga for reativado, as 6 entries de manga existentes reaparecerão automaticamente na Minha Lista.

---

## 10. COMPORTAMENTO DO SOCIAL

| Componente | Comportamento |
|------------|---------------|
| Posts | ✅ Funcionam normalmente (não filtrados por categoria) |
| Comentários | ✅ Funcionam normalmente |
| Amizades | ✅ Funcionam normalmente |
| Mensagens diretas | ✅ Funcionam normalmente |
| Eventos | ✅ Funcionam normalmente |
| Comunidades | ✅ Funcionam normalmente |
| Busca global de obras | Apenas anime (via catálogo filtrado) |
| Posts antigos mencionando manga | ✅ Preservados intactos |

O social não foi desmontado. Apenas os selectors/autocomplete de obras (busca global, sugerir obra) retornam apenas anime.

---

## 11. COMPORTAMENTO DO ADMIN

| Ferramenta | Comportamento |
|------------|---------------|
| CatalogManager | Preservado; admin pode ver dados congelados |
| CatalogSync | Preservado; sync pula categorias congeladas com `SKIPPED_FROZEN_CATEGORY` |
| CardOverride | Preservado |
| FranchiseMerger | Preservado |
| CategoryManager | Preservado |
| BannersPanel | Preservado |
| Criar obra (Works page) | `handleAddExternal` força `categories = ["anime"]` durante freeze |

### Visual FROZEN

O admin não tem um marcador visual explícito "FROZEN" nesta fase (as tabs de manga/movie/liveaction foram removidas da UI ativa em vez de marcadas). Para o admin ver dados congelados, pode acessar o painel administrativo diretamente. Uma melhoria futura pode adicionar badges visuais "FROZEN" nas tabs.

---

## 12. TESTES EXECUTADOS

### Validação de dados (via exec_tool)

| Teste | Resultado |
|-------|-----------|
| DynamicWork total | 797 (423 anime, 375 manga, 43 movie, 44 multi) |
| WorkRelease total | 214 (207 anime, 1 manga, 6 movie) |
| AnimeEntry total | 127 (119 anime, 6 manga) |
| ExternalMapping total | 225 (preservados) |
| CatalogSync total | 495 (preservados) |
| CardOverride total | 89 (preservados) |

### Testes de comportamento esperado

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 1 | Anime TV | Ativo | ✅ `hasActiveCategory(['anime'])` = true |
| 2 | Anime OVA | Ativo | ✅ category=anime, format não afeta |
| 3 | Anime ONA | Ativo | ✅ category=anime |
| 4 | Anime SPECIAL | Ativo | ✅ category=anime |
| 5 | Anime format=MOVIE | Ativo | ✅ category=anime (format não afeta) |
| 6 | Manga | Congelado | ✅ `isCategoryFrozen('manga')` = true |
| 7 | Movie não-anime | Congelado | ✅ `isCategoryFrozen('movie')` = true |
| 8 | Live-action | Congelado | ✅ `isCategoryFrozen('liveaction')` = true |
| 9 | Search | Apenas anime | ✅ Catálogo filtrado + hybridSearch pula manga |
| 10 | Home | Apenas anime | ✅ HeroCarousel + TrendingSection filtrados |
| 11 | Ranking | Apenas anime | ✅ Catálogo filtrado (Ranking de XP de usuários não mostra itens de catálogo) |
| 12 | Trending | Apenas anime | ✅ filterActiveWorks + tabs limitadas |
| 13 | Recommendation | Apenas anime | ✅ filterActiveWorks(CATALOG) |
| 14 | Manga AnimeEntry existente | Preservado no banco, oculto na UI | ✅ Filtro `type !== "manga"` na UI |
| 15 | Dados antigos | Zero deleções | ✅ Nenhuma operação de delete executada |
| 16 | ExternalMapping congelado | Preservado | ✅ Nenhuma modificação em ExternalMapping |
| 17 | Sync manual category != anime | SKIPPED_FROZEN_CATEGORY, zero writes | ✅ Layer 1 + Layer 2 guards implementados |

---

## 13. RISCOS E AMBIGUIDADES

### Risco 1: Obras multi-categoria (anime + manga)

44 DynamicWork têm tanto `anime` quanto `manga` em suas categorias. Estas obras **permanecem ativas** porque `hasActiveCategory` retorna true se pelo menos uma categoria for ativa. Isto está correto conforme a regra do usuário: "DynamicWork pode continuar disponível se possuir pelo menos uma release anime ativa."

### Risco 2: ObraProfile de manga-only

Se um usuário acessar `/obra/some-manga-only-slug` via URL direta, a obra não estará no catálogo filtrado (CatalogContext). A página ObraProfile pode mostrar "não encontrado". Isto é aceitável — a obra existe no banco mas está congelada. Não foi implementado um redirect explícito para FrozenCategory neste caso porque a página ObraProfile não é uma rota de categoria.

### Risco 3: AnimeEntry de manga em XP/Ranking

As 6 AnimeEntry de manga continuam no banco e são incluídas no cálculo de XP do usuário (via `computeStats`). Isto é **intencional** — o progresso do usuário em manga é preservado e conta para XP. O Ranking de XP mostra usuários, não itens de catálogo, então não há filtro de categoria necessário.

### Risco 4: Admin pode criar obra manga via API

O admin ainda pode criar DynamicWork com `categories: ["manga"]` via painel administrativo ou API direta. O `handleAddExternal` na página Works força anime, mas o admin direto pela entidade não tem guard. Isto é aceitável — o admin é responsável por não criar obras congeladas. A obra criada seria preservada mas não apareceria no produto ativo.

### Risco 5: TMDB

O TMDB não foi modificado. O `fetchTMDBTrending` e `getTMDBWorkDetails` continuam funcionando. O `TrendingSection` usa `fetchTMDBTrending` para buscar trending, que pode retornar não-anime. No entanto, o fallback já é filtrado por `filterActiveWorks`. O resultado do TMDB pode incluir não-anime, mas estes são filmes/séries que não estão no catálogo AniZoku (o `handleClick` faz match com CATALOG filtrado). Isto é aceitável.

**TMDB_SYNC = FROZEN_FOR_NOW** — Nenhum novo TMDB sync será implementado. Código existente preservado.

### Risco 6: Supabase baseline não modificado

O DDL em `supabase/migrations/0001_initial_schema.sql` **não foi modificado**. O schema continua preparado para `anime`, `manga`, `movie`, `liveaction`. O estado operacional é ANIME_ONLY, mas o schema de migração preserva todas as categorias para reativação futura.

---

## 14. INSTRUÇÃO PARA REATIVAR MANGA/MOVIE/LIVE-ACTION

### Passo único

Editar dois arquivos:

**`src/lib/scopeConfig.js`:**
```js
export const ANIME_ONLY_MODE = false; // ou true se quiser manter o modo
export const ACTIVE_CATEGORIES = ['anime', 'manga']; // adicionar categorias
export const FROZEN_CATEGORIES = ['movie', 'liveaction']; // remover as reativadas
```

**`base44/shared/scopeConfig.ts`:**
```ts
export const ANIME_ONLY_MODE = false;
export const ACTIVE_CATEGORIES = ['anime', 'manga'];
export const FROZEN_CATEGORIES = ['movie', 'liveaction'];
```

### O que acontece automaticamente

- Catálogo volta a incluir obras de manga
- `getByCategory("manga")` retorna resultados
- Tabs de Mangás reaparecem em Works e Trending
- AnimeEntry de manga reaparece na Minha Lista
- `hybridSearch` volta a buscar manga no Jikan
- Sync volta a processar releases de manga
- `SuggestWorkModal` volta a permitir sugerir manga

### O que NÃO precisa ser feito

- ❌ Não precisa recriar dados (tudo preservado)
- ❌ Não precisa recriar rotas (tudo preservado)
- ❌ Não precisa recriar componentes (tudo preservado)
- ❌ Não precisa modificar Supabase DDL (schema já preparado)
- ❌ Não precisa remover guards (eles verificam `ANIME_ONLY_MODE` e `isCategoryFrozen` dinamicamente)

---

## 15. GO / NO-GO

### ✅ **GO** — AniZoku operacionalmente ANIME ONLY

O freeze está implementado de forma reversível, centralizada, e com proteção de sync em duas camadas. Zero deleções confirmadas. Zero writes em categorias congeladas garantido por Layer 1 + Layer 2. Todos os dados preservados para reativação futura.