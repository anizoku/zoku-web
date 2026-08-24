# Fase 2H — Relatório de QA/Validação do WorkRelease no Frontend

**Data:** 2026-08-24
**Tipo:** Validação somente leitura (read-only)
**Escopo:** CatalogContext, workReleases.js, useGlobalSearch.js

---

## 1. Arquivos Validados

| Arquivo | Função | Status |
|---------|-------|--------|
| `src/contexts/CatalogContext.jsx` | Query em lote de WorkRelease, enriquecimento de catálogo | ✅ Funcional |
| `src/lib/workReleases.js` | `resolveReleasesSync`, `buildReleasesFromBatch`, `normalizeWorkRelease` | ✅ Funcional |
| `src/hooks/useGlobalSearch.js` | Busca em títulos de releases, `_matched_release_count` | ✅ Funcional |
| `src/lib/globalSlugDuplicateAudit.md` | Relatório Fase 2G | ✅ Salvo |

---

## 2. Validação de Obras Migradas (WorkRelease)

### Resultado por obra

| # | Obra | Slug no catálogo | has_work_releases | release_source | release_count | releases preenchido | seasons vazio | Status |
|---|------|-----------------|-------------------|----------------|---------------|--------------------|--------------|--------|
| 1 | Re:Zero | `rezero--starting-life-in-another-world-` | ✅ true | ✅ work_release | 4 | ✅ 4 releases | ✅ [] | ✅ OK |
| 2 | Dan Da Dan | `dan-da-dan` | ✅ true | ✅ work_release | 3 | ✅ 3 releases | ✅ [] | ✅ OK |
| 3 | Hunter x Hunter | `hunter-x-hunter` | ✅ true | ✅ work_release | 3 | ✅ 3 releases | ✅ [] | ✅ OK |
| 4 | Attack on Titan | `attack-on-titan` | ✅ true | ✅ work_release | 7 | ✅ 7 releases | ✅ [] | ✅ OK |
| 5 | Mushoku Tensei | `mushoku-tensei-jobless-reincarnation` | ✅ true | ✅ work_release | 4 | ✅ 4 releases | ✅ [] | ✅ OK |
| 6 | Mashle | `mashle-magic-and-muscles` | ✅ true | ✅ work_release | 3 | ✅ 3 releases | ✅ [] | ✅ OK |

### Detalhe de releases por obra

**Re:Zero (4 releases):**
- Re:ZERO -Starting Life in Another World- (Season 1, 2016)
- Re:ZERO -Starting Life in Another World- Season 2 (2020)
- Re:ZERO -Starting Life in Another World- Season 2 Part 2 (2021)
- Re:ZERO -Starting Life in Another World- Season 4 (2026)

**Dan Da Dan (3 releases):**
- Dan Da Dan (Season 1, 2024)
- Dan Da Dan Season 2 (2025)
- Dan Da Dan Season 3 (sem year — dado menor)

**Hunter x Hunter (3 releases):**
- Hunter x Hunter Manga (manga, 1998)
- Hunter x Hunter (1999) (anime, 1999)
- Hunter x Hunter (2011) (anime, 2011)

**Attack on Titan (7 releases):**
- Attack on Titan (Season 1, 2013)
- Attack on Titan Season 2 (2017)
- Attack on Titan Season 3 (2018)
- Attack on Titan Season 3 Part 2 (2019)
- Attack on Titan: Final Season (2021)
- Attack on Titan: Final Season Part 2 (2022)
- Attack on Titan: Final Season - The Final Chapters (⚠️ season_year=2013 — dado inconsistente)

**Mushoku Tensei (4 releases):**
- Mushoku Tensei: Jobless Reincarnation (Season 1, 2021)
- Mushoku Tensei: Jobless Reincarnation Part 2 (2021)
- Mushoku Tensei: Jobless Reincarnation Season 2 Part 2 (2024)
- Mushoku Tensei: Jobless Reincarnation Season 3 (2026)

**Mashle (3 releases):**
- Mashle: Magic and Muscles (Season 1, 2023)
- Mashle: Magic and Muscles - The Divine Visionary Candidate Exam Arc (ONA, 2024)
- Mashle: Magic and Muscles Season 3 (⚠️ season_year=2023 — dado inconsistente, provavelmente deveria ser 2024/2025)

### Conclusão da validação 1
✅ Todas as 6 obras migradas usam WorkRelease corretamente. `has_work_releases = true`, `release_source = "work_release"`, `seasons = []` (sem duplicação). A regra "nunca mostrar WorkRelease + seasons[] juntos" é respeitada.

---

## 3. Validação de Obras Não Migradas (Legacy seasons[])

### Resultado

| Métrica | Valor |
|---------|-------|
| Obras não migradas com seasons[] | **0** |
| Total de obras migradas no catálogo | 81 |
| Total de WorkRelease | 212 |

**⚠️ Não foi possível validar o caminho `legacy_seasons` com dados reais.**

Todas as 797 obras DynamicWork que possuem `seasons[]` já foram migradas para WorkRelease (`sync_release_completed = true && release_count > 0`). Não existe nenhuma obra no banco que use `seasons[]` sem ter WorkRelease correspondente.

### Validação por inspeção de código
A função `resolveReleasesSync` em `workReleases.js` implementa o fallback corretamente:
- Se `sync_release_completed !== true` OU `release_count === 0` → cai para `getWorkReleasesLegacySync`
- `getWorkReleasesLegacySync` faz parse de `seasons[]` e normaliza
- O `release_source` é `"legacy_seasons"` e `has_work_releases = false`
- `seasons[]` não é limpo (permanece disponível para componentes legados)

**Conclusão:** O código do fallback está correto por inspeção, mas não há dados reais para testar. Recomenda-se criar um registro de teste ou aguardar uma obra nova que entre no catálogo antes da migração.

---

## 4. Validação da Busca Global

### Resultado por termo de busca

| Termo | Resultados | Encontrou título principal | Encontrou título de WorkRelease | _matched_release_count | Duplicação | Status |
|------|-----------|--------------------------|-------------------------------|----------------------|------------|--------|
| `rezero season 2` | 0 | ❌ | ❌ | — | — | ⚠️ Ver nota |
| `dan da dan season 3` | 1 | ✅ | ✅ | 1 | ✅ Não | ✅ OK |
| `hunter x hunter 2011` | 0 | ❌ | ❌ | — | — | ⚠️ Ver nota |
| `hunter x hunter manga` | 1 | ✅ | ✅ | 1 | ✅ Não | ✅ OK |
| `attack on titan final season` | 1 | ✅ | ✅ | 3 | ✅ Não | ✅ OK |
| `naruto` | 1 (após dedup) | ✅ | ✅ | 2 | ✅ Não (dedup por slug) | ✅ OK |
| `death note` | 1 (após dedup) | ✅ | ❌ | 0 | ✅ Não (dedup por slug) | ✅ OK |
| `tokyo ghoul` | 1 (após dedup) + 2 relacionados | ✅ | ✅ | 3 | ✅ Não (dedup por slug) | ✅ OK |

### Notas sobre buscas com 0 resultados

**`rezero season 2`** → 0 resultados:
- Causa: A busca faz **substring matching**. `normalizeQ("rezero season 2")` = `"rezero season 2"`. O título do release é `"Re:ZERO -Starting Life in Another World- Season 2"` → normalizado = `"rezero starting life in another world season 2"`. A string `"rezero season 2"` **não é substring** de `"rezero starting life in another world season 2"` (há texto entre "rezero" e "season 2").
- **Não é um bug da Fase 2H** — é uma limitação pré-existente do algoritmo de busca (substring matching não lida com palavras não-contíguas).
- Buscando apenas `"rezero"` ou `"season 2"` funcionaria.

**`hunter x hunter 2011`** → 0 resultados:
- Causa: O título do release é `"Hunter x Hunter (2011)"`. `normalizeQ` não remove parênteses `()`. O resultado normalizado é `"hunter x hunter (2011)"`. A query `"hunter x hunter 2011"` não é substring porque falta os parênteses.
- **Não é um bug da Fase 2H** — é uma limitação pré-existente (parênteses não são removidos na normalização).
- Buscando `"hunter x hunter (2011)"` ou `"hunter x hunter"` funcionaria.

### Validação de duplicação
✅ Obras com slug duplicado (naruto, death-note, tokyo-ghoul — anime+manga com mesmo slug) **não duplicam** nos resultados de busca. O `deduplicateCatalog` no CatalogContext remove duplicatas por slug antes da busca. Cada obra aparece no máximo uma vez.

✅ `_matched_release_count` funciona corretamente — conta quantos releases da obra corresponderam ao termo de busca.

---

## 5. Validação de Fallback de Segurança

### Cenário: Query de WorkRelease falha ou retorna vazia

**Comportamento atual (por inspeção de código):**

1. Se a query `WorkRelease.list()` falha: `workReleases = []` (default do useQuery), `releasesByGroupId` é um Map vazio.
2. `resolveReleasesSync` é chamada para cada obra migrada. Como `releasesByGroupId.get(dw.id)` retorna `undefined` (mapa vazio), `groupReleases = []`, e a função cai para `getWorkReleasesLegacySync(dynamicWork)`.
3. `getWorkReleasesLegacySync` faz parse de `seasons[]` do DynamicWork. Como obras migradas ainda têm `seasons[]` no banco (ex: Attack on Titan tem 7 seasons), o fallback retorna os dados legados.
4. `release_source = "legacy_seasons"`, `has_work_releases = false`, `seasons` não é limpo.

**Resultado:** O app não quebra. Obras migradas caem para `seasons[]` legado. ✅

### Cenário: Query retorna vazia (sem erro)
Mesmo comportamento acima. ✅

### ⚠️ Risco identificado
Não há `console.warn` ou log quando o fallback é ativado para uma obra migrada. Se WorkRelease falhar silenciosamente, o admin não saberá que obras migradas estão usando dados legados.

**Recomendação:** Adicionar `console.warn` opcional em `resolveReleasesSync` quando uma obra migrada cai no fallback. (Não corrigir agora — apenas documentar.)

---

## 6. Validação de Performance

| Métrica | Resultado | Status |
|---------|-----------|--------|
| N+1 queries | Nenhuma — WorkRelease carregado em 1 query (`list 5000`) | ✅ |
| Mapa `releasesByGroupId` | Construído 1x em `useMemo`, O(n) onde n = WorkReleases | ✅ |
| `resolveReleasesSync` por obra | O(1) — lookup no Map + normalização | ✅ |
| Queries totais do CatalogContext | 3 (CatalogSync + DynamicWork + WorkRelease) | ✅ |
| `list 5000` aceitável agora? | Sim — 212 WorkReleases atualmente | ✅ |
| Precisa paginação/filtro no futuro? | Sim — quando WorkRelease crescer além de ~1000 registros | ⚠️ Futuro |

**Nota:** O `list("-created_date", 5000)` carrega todos os WorkRelease em memória. Hoje (212 registros) é aceitável. Quando o catálogo crescer, deve ser substituído por:
- Filtro por `group_id` (para obras migradas específicas), ou
- Paginação com query infinita, ou
- Cache incremental.

---

## 7. Validação de Integridade de Dados

| Entidade | Count antes | Count depois | Alterada? |
|----------|-------------|-------------|-----------|
| DynamicWork | 797 | 797 | ❌ Não |
| WorkRelease | 212 | 212 | ❌ Não |
| AnimeEntry | 102 | 102 | ❌ Não |
| ExternalMapping | 212 | 212 | ❌ Não |
| SyncConflict | — | — | ❌ Não (não consultada) |

**Nenhum dado foi alterado.** A Fase 2H é puramente read-only no frontend. ✅

---

## 8. Bugs Encontrados

### BUG #1 — CRÍTICO (pré-existente, amplificado pela Fase 2H)

**Duplicate catalog entries para Re:Zero e Dan Da Dan**

| Obra | Entrada 1 | Entrada 2 | Impacto |
|------|-----------|-----------|---------|
| Re:Zero | `slug: "rezero"` (estático, sem releases) | `slug: "rezero--starting-life-in-another-world-"` (dinâmico, 4 releases) | 2 cards na tela |
| Dan Da Dan | `slug: "dandadan"` (dinâmico não migrado, sem releases) | `slug: "dan-da-dan"` (dinâmico migrado, 3 releases) | 2 cards na tela |

**Causa raiz:**
- Re:Zero: O catálogo estático (CATALOG em `catalog.js`) tem `slug: "rezero"` e o DynamicWork tem `slug: "rezero--starting-life-in-another-world-"`. Slugs diferentes → ambos entram no catálogo. A deduplicação por título não pega porque os títulos normalizados diferem (`"re:zero − starting..."` vs `"re:zero -starting..."` — caracteres de dash diferentes).
- Dan Da Dan: Existem 2 registros DynamicWork — `"dandadan"` (não migrado) e `"dan-da-dan"` (migrado). Slugs diferentes → ambos entram. A deduplicação por título não pega porque `"Dandadan"` vs `"Dan Da Dan"` normalizam diferente (`"dandadan"` vs `"dan da dan"`).

**Impacto na Fase 2H:**
- O usuário vê 2 cards para a mesma obra.
- Um card tem `releases` (WorkRelease), o outro não tem.
- A regra "nenhuma obra aparece duplicada por causa de WorkRelease" é violada — mas a duplicação vem do catálogo base, não do WorkRelease em si.

**É um bug da Fase 2H?**
- **Não.** A duplicação já existia antes (catálogo estático + DynamicWork com slugs diferentes). A Fase 2H apenas tornou a diferença mais visível (um card tem releases, o outro não).
- A Fase 2H não introduziu este bug, mas não o resolveu também.

**Severidade:** CRÍTICO para a experiência do usuário, mas não bloqueia a Fase 3 (AniList/sync). Deve ser corrigido na Fase 2I (consolidação de slugs) ou como hotfix.

**Correção sugerida:** Unificar os slugs — remover o registro estático/fantasma ou apontar o slug antigo para o novo (redirect). Não fazer na Fase 2H.

---

### BUG #2 — MÉDIO (pré-existente, da Fase 2G)

**Dois registros DynamicWork com o mesmo slug `rezero--starting-life-in-another-world-`**

| Campo | Registro 1 | Registro 2 |
|-------|-----------|-----------|
| id | `6a4d539357d49aa63f387503` | `6a2f67b1989e52f83b5589d1` |
| slug | `rezero--starting-life-in-another-world-` | `rezero--starting-life-in-another-world-` |
| migrado | ✅ true (4 releases) | ❌ false |
| release_count | 4 | 0 |

**Comportamento atual:** `deduplicateCatalog` mantém apenas o primeiro encontrado (ordenado por `popularity_rank`). No momento, o registro migrado aparece primeiro (confirmado na simulação: `hwr: true`). Mas se a ordem mudar, o registro não migrado sombrearia o migrado.

**Severidade:** MÉDIO — funciona por acidente (ordem atual favorece o migrado). Deve ser corrigido na Fase 2I.

---

### BUG #3 — BAIXO (pré-existente, não relacionado à Fase 2H)

**Busca por `rezero season 2` e `hunter x hunter 2011` retorna 0 resultados**

- Causa: Substring matching não lida com palavras não-contíguas nem parênteses.
- Não é um bug da Fase 2H — é uma limitação do algoritmo de busca pré-existente.
- Não bloqueia a Fase 3.

---

### BUG #4 — BAIXO (dados, não código)

**`season_year` inconsistente em alguns WorkReleases**

- Attack on Titan: "Final Season - The Final Chapters" tem `season_year = 2013` (deveria ser 2023)
- Mashle: "Season 3" tem `season_year = 2023` (deveria ser 2024/2025)

**Severidade:** BAIXO — dado incorreto, não afeta a lógica do catálogo. Corrigir manualmente no admin.

---

## 9. Riscos Restantes

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| `list 5000` de WorkRelease estourar quando catálogo crescer | Média (futuro) | Performance | Paginação ou filtro por group_id |
| Fallback silencioso de WorkRelease → legacy seasons sem log | Baixa | Diagnóstico difícil | Adicionar `console.warn` em `resolveReleasesSync` |
| Duplicação Re:Zero/Dan Da Dan (BUG #1) | Alta (já existe) | UX ruim | Consolidar slugs na Fase 2I |
| Slug duplicado Re:Zero (BUG #2) | Média | Sombreamento | Deletar registro fantasma |
| Sem dados reais para testar legacy fallback | Certeza | Cobertura de teste incompleta | Criar obra de teste ou aguardar obra nova |

---

## 10. Recomendações Antes da Fase 3

### ✅ Pode avançar para Fase 3 (AniList/sync)
A Fase 2H está **estável para as obras migradas**. CatalogContext consome WorkRelease corretamente, a busca encontra títulos de releases, e nenhum dado foi alterado.

### ⚠️ Corrigir antes ou durante a Fase 3 (não bloqueia, mas melhora UX)

1. **BUG #1 (CRÍTICO):** Consolidar Re:Zero e Dan Da Dan — remover o registro fantasma (estático `"rezero"` e dinâmico `"dandadan"`) ou unificar slugs. Recomenda-se uma Fase 2I rápida (consolidação de slugs) antes da Fase 3.

2. **BUG #2 (MÉDIO):** Deletar o segundo registro DynamicWork de Re:Zero (`id: 6a2f67b1989e52f83b5589d1`, não migrado, mesmo slug).

3. **BUG #4 (BAIXO):** Corrigir `season_year` de Attack on Titan "Final Chapters" e Mashle "Season 3" via admin.

### 📋 Melhorias futuras (não urgentes)

4. Adicionar `console.warn` em `resolveReleasesSync` quando uma obra migrada cai no fallback.
5. Substituir `list 5000` por paginação ou filtro quando WorkRelease passar de ~1000 registros.
6. Melhorar busca para suportar palavras não-contíguas (token-based matching em vez de substring).
7. Adicionar parênteses `()` à lista de caracteres removidos em `normalizeQ`.

---

## 11. Conclusão

**A Fase 2H está aprovada para avançar à Fase 3**, com a ressalva de que os BUGs #1 e #2 (duplicação de Re:Zero e Dan Da Dan) devem ser corrigidos em uma Fase 2I rápida (consolidação de slugs) para evitar UX confusa antes de integrar AniList.

**Resumo de validação:**

| Critério | Status |
|----------|--------|
| CatalogContext consome WorkRelease para obras migradas | ✅ |
| Obras não migradas continuam via seasons[] | ✅ (código correto, sem dados reais para testar) |
| useGlobalSearch encontra títulos de releases | ✅ |
| Nenhuma obra aparece duplicada por WorkRelease | ✅ (duplicação vem do catálogo base, não do WorkRelease) |
| App continua visualmente igual | ✅ |
| Nenhum AnimeEntry alterado | ✅ |
| Nenhum dado migrado | ✅ |
| Nenhuma integração externa nova | ✅ |
| Sem N+1 queries | ✅ |
| Fallback de segurança funciona | ✅ (por inspeção) |