# Fase 2I — Plano de Consolidação de Duplicatas Fantasma (Dry-Run)

**Data:** 2026-08-24
**Tipo:** Dry-run somente leitura (nenhum dado alterado)
**Escopo:** Re:Zero e Dan Da Dan — registros fantasma/estáticos que causam cards duplicados

---

## 1. Registros Envolvidos

### 1.1 Re:Zero

#### Static CATALOG (catalog.js)

| # | Slug | Title | Categories | mal_id | Manga_mal_id | Notas |
|---|------|-------|-----------|--------|-------------|-------|
| S1 | `rezero` | Re:Zero − Starting Life in Another World | `["anime"]` | null | null | Fantasma principal — sem mal_id, sem releases |
| S2 | `rezero-s3` | Re:Zero Season 3 | `["anime"]` | 54857 | null | Entry separada de Season 3 (não é duplicata do franchise) |

#### DynamicWork

| # | ID | Slug | Title | Categories | mal_id | manga_mal_id | franchise_id | sync_release_completed | release_count | seasons[] | popularity_rank | image_url | created_date | updated_date |
|---|-----|------|-------|-----------|--------|-------------|-------------|------------------------|---------------|-----------|----------------|-----------|--------------|--------------|
| D1 | `6a4d539357d49aa63f387503` | `rezero--starting-life-in-another-world-` | Re:ZERO -Starting Life in Another World- | `["anime"]` | 31240 | null | "31240" | ✅ true | 4 | 4 | 23 | cdn.myanimelist.net/.../128039l.jpg | 2026-07-07 | 2026-08-23 |
| D2 | `6a2f67b1989e52f83b5589d1` | `rezero--starting-life-in-another-world-` | Re:ZERO -Starting Life in Another World- | `["manga"]` | null | 74697 | null | ❌ false | 0 | 0 | 212 | cdn.myanimelist.net/.../129447l.jpg | 2026-06-15 | 2026-06-15 |

**⚠️ D1 e D2 têm o MESMO slug** (`rezero--starting-life-in-another-world-`). D1 é anime (migrado), D2 é manga (não migrado). `deduplicateCatalog` mantém apenas o primeiro (D1, popularity_rank 23 < 212). D2 está oculto no catálogo.

#### WorkRelease (4 releases — todos no grupo D1)

| ID | Slug | Title | Category | Format | season_year | mal_id (via ExternalMapping) |
|----|------|-------|----------|--------|-------------|------------------------------|
| `6a8b7281c22ab4a66c9394dc` | rezero-...-season-1 | Re:ZERO -Starting Life in Another World- | anime | TV | 2016 | 31240 |
| `6a8b7281c22ab4a66c9394dd` | rezero-...-season-2 | Re:ZERO ... Season 2 | anime | TV | 2020 | 39587 |
| `6a8b7281c22ab4a66c9394de` | rezero-...-season-2-part-2 | Re:ZERO ... Season 2 Part 2 | anime | TV | 2021 | 42203 |
| `6a8b7281c22ab4a66c9394df` | rezero-...-season-4 | Re:ZERO ... Season 4 | anime | TV | 2026 | 61316 |

#### ExternalMapping (4 — todos no grupo D1)

| ID | work_group_id | work_release_id | provider | provider_id | provider_type |
|----|--------------|-----------------|----------|-------------|---------------|
| `6a8b72816a21c194c7f1650a` | D1 | season-1 | mal | 31240 | anime |
| `6a8b72816a21c194c7f1650b` | D1 | season-2 | mal | 39587 | anime |
| `6a8b72816a21c194c7f1650c` | D1 | season-2-part-2 | mal | 42203 | anime |
| `6a8b72816a21c194c7f1650d` | D1 | season-4 | mal | 61316 | anime |

---

### 1.2 Dan Da Dan

#### Static CATALOG (catalog.js)

| # | Slug | Title | Categories | mal_id | manga_mal_id | Notas |
|---|------|-------|-----------|--------|-------------|-------|
| S1 | `dandadan` | DAN DA DAN | `["anime","manga"]` | null | null | Fantasma principal — sobrescrito pelo DynamicWork manga |
| S2 | `dandadan-s2` | DAN DA DAN Season 2 | `["anime"]` | 59485 | null | Entry separada de Season 2 |
| S3 | `dandadan-manga-standalone` | DAN DA DAN (Mangá) | `["manga"]` | null | 152085 | Entry separada de mangá (tem CardOverride) |

#### DynamicWork

| # | ID | Slug | Title | Categories | mal_id | manga_mal_id | franchise_id | sync_release_completed | release_count | seasons[] | popularity_rank | image_url | created_date | updated_date |
|---|-----|------|-------|-----------|--------|-------------|-------------|------------------------|---------------|-----------|----------------|-----------|--------------|--------------|
| D1 | `6a2f67815feb69001275bc65` | `dandadan` | Dandadan | `["manga"]` | null | 135496 | null | ❌ false | 0 | 0 | 41 | cdn.myanimelist.net/.../248746l.jpg | 2026-06-15 | 2026-06-15 |
| D2 | `6a4d567b19cbf3ad51fdb9ee` | `dan-da-dan` | Dan Da Dan | `["anime"]` | 57334 | null | "57334" | ✅ true | 3 | 3 | 195 | cdn.myanimelist.net/.../143719l.jpg | 2026-07-07 | 2026-08-23 |

**D1 e D2 têm slugs DIFERENTES** (`dandadan` vs `dan-da-dan`). D1 é manga, D2 é anime migrado. Ambos aparecem no catálogo.

#### WorkRelease (3 releases — todos no grupo D2)

| ID | Slug | Title | Category | Format | season_year | mal_id (via ExternalMapping) |
|----|------|-------|----------|--------|-------------|------------------------------|
| `6a8b7cd238aae161e3d81d73` | dan-da-dan-season-1 | Dan Da Dan | anime | TV | 2024 | 57334 |
| `6a8b7cd238aae161e3d81d74` | dan-da-dan-season-2 | Dan Da Dan Season 2 | anime | TV | 2025 | 60543 |
| `6a8b7cd238aae161e3d81d75` | dan-da-dan-season-3 | Dan Da Dan Season 3 | anime | TV | null | 62516 |

#### ExternalMapping (3 — todos no grupo D2)

| ID | work_group_id | work_release_id | provider | provider_id | provider_type |
|----|--------------|-----------------|----------|-------------|---------------|
| `6a8b7cd2ddf2252d460c4f82` | D2 | season-1 | mal | 57334 | anime |
| `6a8b7cd2ddf2252d460c4f83` | D2 | season-2 | mal | 60543 | anime |
| `6a8b7cd2ddf2252d460c4f84` | D2 | season-3 | mal | 62516 | anime |

---

## 2. Referências Cruzadas

### 2.1 Re:Zero

| Entidade | Registros encontrados | Detalhe |
|----------|---------------------|---------|
| CardOverride | **0** | Nenhum override para `rezero`, `rezero--starting-life-in-another-world-`, ou `rezero-s3` |
| WorkCategoryVisibility | **0** | Nenhuma regra de visibilidade |
| CatalogSync | **1** | `slug: "rezero-s3"` (mal_id 54857) — para a entry estática Season 3, **não afeta** o fantasma `rezero` |
| AnimeEntry | **0** | Nenhum progresso de usuário para Re:Zero |
| WorkRelease | **4** | Todos no grupo D1 (anime migrado) |
| ExternalMapping | **4** | Todos no grupo D1 (anime migrado) |

### 2.2 Dan Da Dan

| Entidade | Registros encontrados | Detalhe |
|----------|---------------------|---------|
| CardOverride | **1** | `card_slug: "dandadan-manga-standalone"`, category: "manga", override_image_url definida — para a entry estática S3, **não afeta** `dandadan` ou `dan-da-dan` |
| WorkCategoryVisibility | **0** | Nenhuma regra de visibilidade |
| CatalogSync | **2** | `dandadan-s2` (mal_id 59485) e `dandadan` (mal_id 57334, manga_mal_id 75013) |
| AnimeEntry | **3** | Todas com title "DAN DA DAN", type "anime", status "completed". **Nenhuma tem season_mal_id ou release_id.** |
| WorkRelease | **3** | Todos no grupo D2 (anime migrado) |
| ExternalMapping | **3** | Todos no grupo D2 (anime migrado) |

#### Detalhe dos 3 AnimeEntry de Dan Da Dan

| ID | Title | Type | Status | current_episode | total_episodes | season_mal_id | release_id |
|----|-------|------|--------|-----------------|----------------|---------------|------------|
| `6a329d8c9bafb9fdd689a804` | DAN DA DAN | anime | completed | 12 | 12 | null | null |
| `69f6a3f27236bdf17d457386` | DAN DA DAN | anime | completed | 24 | 25 | null | null |
| `69f5776c37e211e04ab2cecb` | DAN DA DAN | anime | completed | 25 | 25 | null | null |

**Estas 3 entries não têm ligação direta com WorkRelease ou DynamicWork por ID.** Foram criadas quando usuários adicionaram "DAN DA DAN" do catálogo estático. O link é por título (case-insensitive). Nenhum progresso seria perdido se o catálogo mudar — as entries permanecem intactas.

---

## 3. Análise da Duplicação no Catálogo

### Re:Zero — 3 entries visíveis no catálogo

| # | Slug | Origem | has_work_releases | release_count | Categorias |
|---|------|--------|------------------|---------------|-----------|
| 1 | `rezero` | Estático (S1) | ❌ false | 0 | anime |
| 2 | `rezero--starting-life-in-another-world-` | DynamicWork (D1) | ✅ true | 4 | anime |
| 3 | `rezero-s3` | Estático (S2) | ❌ false | 0 | anime |

**Duplicata real:** #1 (`rezero`) vs #2 (`rezero--starting-life-in-another-world-`) — mesmo franchise, slugs diferentes, ambas anime.
**#3 (`rezero-s3`)** é uma entry legítima de Season 3 separada (mal_id 54857, não está nos WorkReleases atuais).

### Dan Da Dan — 4 entries visíveis no catálogo

| # | Slug | Origem | has_work_releases | release_count | Categorias |
|---|------|--------|------------------|---------------|-----------|
| 1 | `dandadan` | DynamicWork manga (D1) sobrescreve estático (S1) | ❌ false | 0 | manga |
| 2 | `dan-da-dan` | DynamicWork anime (D2) | ✅ true | 3 | anime |
| 3 | `dandadan-s2` | Estático (S2) | ❌ false | 0 | anime |
| 4 | `dandadan-manga-standalone` | Estático (S3) | ❌ false | 0 | manga |

**Duplicata real:** #1 (`dandadan` manga) vs #2 (`dan-da-dan` anime) — mesmo franchise, slugs diferentes, categorias diferentes.
**#3 e #4** são entries legítimas separadas (Season 2 e Mangá standalone).

---

## 4. Ações Propostas por Registro

### Re:Zero

| Registro | Ação proposta | Risco |
|----------|--------------|-------|
| Estático `rezero` (S1) | **Remover do CATALOG** (catalog.js) | Baixo — 0 referências, 0 AnimeEntry, 0 CardOverride |
| DynamicWork D1 (anime migrado) | **Manter como canônico** | — |
| DynamicWork D2 (manga, mesmo slug) | **Manter** — já oculto por dedup de slug | Baixo — se ordem mudar, pode sombrear D1. Recomenda-se deletar D2 no futuro (Fase 2J) |
| Estático `rezero-s3` (S2) | **Manter** — entry legítima de Season 3 | — |
| CatalogSync `rezero-s3` | **Manter** — referência válida para S2 | — |
| WorkRelease (4) | **Manter** | — |
| ExternalMapping (4) | **Manter** | — |
| Rota `/obra/rezero` | **Adicionar redirect** → `/obra/rezero--starting-life-in-another-world-` | Baixo — apenas se houver bookmarks antigos |

### Dan Da Dan

| Registro | Ação proposta | Risco |
|----------|--------------|-------|
| Estático `dandadan` (S1) | **Remover do CATALOG** (catalog.js) | Baixo — já sobrescrito pelo DynamicWork D1. Remover evita confusão. |
| DynamicWork D1 (manga, slug `dandadan`) | **Opção A:** Migrar para WorkRelease dentro de D2 e deletar D1. **Opção B:** Manter como manga separado. | Médio — ver análise de opções abaixo |
| DynamicWork D2 (anime migrado, slug `dan-da-dan`) | **Manter como canônico** | — |
| Estático `dandadan-s2` (S2) | **Manter** — entry legítima de Season 2 | — |
| Estático `dandadan-manga-standalone` (S3) | **Manter** — tem CardOverride ativa | — |
| CardOverride `dandadan-manga-standalone` | **Manter** — referência válida para S3 | — |
| CatalogSync `dandadan` (mal_id 57334) | **Reavaliar** — mal_id 57334 é do anime, mas slug `dandadan` é do manga. Pode ser removido se D1 for deletado. | Médio |
| CatalogSync `dandadan-s2` | **Manter** — referência válida para S2 | — |
| AnimeEntry (3 records) | **Não mexer** — nenhum tem season_mal_id ou release_id. Progresso do usuário permanece intacto. | — |
| WorkRelease (3) | **Manter** | — |
| ExternalMapping (3) | **Manter** | — |
| Rota `/obra/dandadan` | **Se D1 deletado:** adicionar redirect → `/obra/dan-da-dan`. **Se D1 mantido:** rota continua funcionando. | — |

---

## 5. Avaliação das Duas Abordagens

### Opção A — Correção de Dados (remover/merge de registros)

#### A-Re:Zero

**O que muda:**
- Remover entry estática `rezero` do arquivo `catalog.js`
- Adicionar redirect de rota `/obra/rezero` → `/obra/rezero--starting-life-in-another-world-`

**Risco:** Baixo
- 0 CardOverride, 0 WorkCategoryVisibility, 0 AnimeEntry, 0 CatalogSync para `rezero`
- Único risco: bookmarks antigos de `/obra/rezero` quebram sem redirect

**Impacto:**
- CatalogContext: `rezero` some do catálogo. `rezero--starting-life-in-another-world-` permanece como único card do franchise anime.
- Busca: buscar "rezero" encontra `rezero--starting-life-in-another-world-` (por título) e `rezero-s3` (por título).
- WorkRelease: inalterado
- AnimeEntry: inalterado (0 entries)

**Resolve o card duplicado?** ✅ Sim — `rezero` some, `rezero--starting-life-in-another-world-` permanece.

**Preserva rotas antigas?** ✅ Com redirect, `/obra/rezero` → `/obra/rezero--starting-life-in-another-world-`.

#### A-Dan Da Dan

**O que muda (sub-opção A1 — merge completo):**
1. Criar WorkRelease de manga dentro do grupo D2 (`dan-da-dan`): category "manga", format "MANGA", title "Dan Da Dan (Mangá)"
2. Criar ExternalMapping: work_group_id D2, provider "mal", provider_id "135496", provider_type "manga"
3. Deletar DynamicWork D1 (`dandadan`)
4. Remover entry estática `dandadan` do `catalog.js`
5. Adicionar redirect `/obra/dandadan` → `/obra/dan-da-dan`
6. Atualizar `release_count` de D2: 3 → 4
7. Marcar D2 com `sync_release_completed: true` (já está)

**O que muda (sub-opção A2 — apenas remover estático):**
1. Remover entry estática `dandadan` do `catalog.js`
2. O DynamicWork D1 (manga, slug `dandadan`) permanece visível como card de manga
3. O DynamicWork D2 (anime, slug `dan-da-dan`) permanece visível como card de anime
4. **A duplicata manga vs anime persiste** — apenas a confusão do estático sobrescrito é resolvida

**Risco A1 (merge completo):** Médio
- Requer criar WorkRelease + ExternalMapping (dados novos)
- Deletar DynamicWork D1 — se algo der errado, o manga some do catálogo
- CatalogSync `dandadan` (mal_id 57334) fica órfão — deve ser removido ou reatribuído
- Os 3 AnimeEntry não são afetados (não têm season_mal_id/release_id)

**Risco A2 (só remover estático):** Baixo
- Apenas remove uma entry do catalog.js
- D1 (manga) e D2 (anime) continuam como cards separados

**Impacto A1:**
- CatalogContext: `dandadan` some, `dan-da-dan` agora tem 4 releases (3 anime + 1 manga)
- Busca: "dan da dan" encontra `dan-da-dan` com 4 releases
- Manga aparece na categoria manga via WorkRelease (category "manga")
- AnimeEntry: inalterado

**Impacto A2:**
- CatalogContext: `dandadan` (manga D1) permanece, `dan-da-dan` (anime D2) permanece
- **Duplicata não resolvida** — apenas limpa o estático

**Resolve o card duplicado?**
- A1: ✅ Sim — merge em 1 card com 4 releases
- A2: ❌ Não — manga e anime continuam separados

**Preserva rotas antigas?**
- A1: Com redirect, `/obra/dandadan` → `/obra/dan-da-dan` ✅
- A2: `/obra/dandadan` continua funcionando (D1 existe) ✅

---

### Opção B — Correção no CatalogContext (dedup/alias sem deletar dados)

**O que muda:**
- Adicionar um mapa de aliases no CatalogContext:
```js
const SLUG_ALIASES = {
  "rezero": "rezero--starting-life-in-another-world-",
  // Para Dan Da Dan, alias dandadan → dan-da-dan mescla manga no anime
  "dandadan": "dan-da-dan",
};
```
- No `deduplicateCatalog`, quando encontrar um slug no alias map, redirecionar para o slug canônico (pular o fantasma)
- Ou: no `useMemo` do catálogo, filtrar entries cujo slug está no alias map

**Risco:** Baixo
- Não deleta nenhum dado
- Reversível (basta remover o alias map)
- Pode afetar a busca se não for tratado corretamente

**Impacto:**
- CatalogContext: entries fantasma são filtradas/aliasadas
- `getBySlug("rezero")` retornaria o entry canônico (`rezero--starting-life-in-another-world-`)
- `/obra/rezero` funcionaria (getBySlug encontra o alias)
- Busca: resultados não duplicam
- Dados (DynamicWork, WorkRelease, etc.): inalterados

**Resolve o card duplicado?** ✅ Sim — o fantasma é filtrado no catálogo.

**Preserva rotas antigas?** ✅ Sim — `getBySlug("rezero")` retorna o canônico via alias.

**Limitação para Dan Da Dan:**
- Alias `dandadan` → `dan-da-dan` mescla o manga no anime. O manga DynamicWork (D1) seria oculto.
- Se o admin quiser manter o manga como card separado, o alias não deve ser aplicado.
- **Alternativa B2:** Alias apenas `rezero` → `rezero--starting-life-in-another-world-` (não alias `dandadan`). Para Dan Da Dan, aceitar manga e anime como cards separados (são media types diferentes).

---

## 6. Comparação e Recomendação

| Critério | Opção A (Dados) | Opção B (CatalogContext) |
|----------|----------------|--------------------------|
| Resolve duplicata Re:Zero | ✅ | ✅ |
| Resolve duplicata Dan Da Dan | ✅ (A1 merge) / ❌ (A2 só estático) | ✅ (alias) / ❌ (B2 sem alias) |
| Risco de quebrar rotas | Médio (precisa redirect) | Baixo (alias resolve) |
| Risco de perder dados | Médio (deletar DynamicWork) | Nenhum |
| Reversível | Difícil (dados deletados) | Fácil (remover alias map) |
| Esforço | Alto (merge + redirect + cleanup) | Baixo (adicionar mapa) |
| Preserva AnimeEntry | ✅ | ✅ |
| Preserva WorkRelease | ✅ | ✅ |
| Preserva ExternalMapping | ✅ | ✅ |
| Limpa dados órfãos | ✅ (remove fantasmas) | ❌ (mantém fantasmas ocultos) |
| Impacto na busca | ✅ (sem duplicação) | ✅ (sem duplicação) |

### Recomendação

**Recomenda-se uma abordagem híbrida (B + A parcial):**

1. **Re:Zero — Opção B (alias no CatalogContext):**
   - Adicionar alias `rezero` → `rezero--starting-life-in-another-world-`
   - Risco baixo, reversível, resolve o card duplicado, preserva rotas
   - Não deletar o estático do catalog.js ainda (pode fazer na Fase 2J)

2. **Dan Da Dan — Opção B2 (alias apenas se desejado merge):**
   - Se o objetivo é 1 card único (modelo Hunter x Hunter): alias `dandadan` → `dan-da-dan`
   - Se o objetivo é manter manga e anime separados: **não aplicar alias** — aceitar como cards legítimos de media types diferentes
   - Em ambos os casos, remover o estático `dandadan` do catalog.js é opcional (já está sobrescrito)

3. **Deletar D2 de Re:Zero (manga órfão, mesmo slug):**
   - O DynamicWork `6a2f67b1989e52f83b5589d1` (manga, mesmo slug do anime, não migrado) é um resquício da Fase 2G
   - Deletar é seguro: 0 WorkRelease, 0 ExternalMapping, 0 AnimeEntry, 0 CardOverride
   - Recomenda-se deletar para evitar sombreamento futuro se a ordem de popularity_rank mudar

4. **Não mexer em AnimeEntry** — os 3 records de Dan Da Dan não têm season_mal_id/release_id e não são afetados.

5. **Não mexer em CardOverride/WorkCategoryVisibility** — nenhum referencia os fantasmas `rezero` ou `dandadan`/`dan-da-dan`.

---

## 7. Riscos Restantes

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Alias no CatalogContext afeta busca de forma inesperada | Baixa | Busca pode não encontrar fantasma | Testar busca após mudança |
| Redirect de rota `/obra/rezero` não cobre todos os casos | Baixa | 404 em bookmark antigo | Alias no getBySlug resolve sem redirect de rota |
| Deletar D2 (Re:Zero manga órfão) afeta algo não mapeado | Muito baixa | Manga some (já está oculto) | Confirmar 0 referências antes de deletar |
| Dan Da Dan manga vs anime como cards separados persiste | Certeza (se não fizer merge) | UX confusa | Decidir se é aceitável ou se precisa merge na Fase 2J |
| CatalogSync `dandadan` (mal_id 57334) fica órfão se D1 deletado | Média | Sync sem efeito | Remover ou reatribuir na Fase 2J |

---

## 8. Próximos Passos (após aprovação)

1. **Implementar Opção B para Re:Zero** — adicionar alias map no CatalogContext
2. **Decidir Dan Da Dan** — alias (merge) ou aceitar como separado
3. **Deletar D2 de Re:Zero** (manga órfão, mesmo slug) — seguro
4. **Testar busca e rotas** após mudança
5. **Fase 2J (futuro):** Limpeza completa — remover estáticos do catalog.js, merge Dan Da Dan manga→anime, cleanup CatalogSync órfãos

---

## 9. Conclusão

A duplicação de Re:Zero e Dan Da Dan vem de **slugs diferentes entre o catálogo estático e o DynamicWork migrado**. A correção mais segura e reversível é adicionar um **alias map no CatalogContext** (Opção B), que filtra os fantasmas sem deletar dados. Para Dan Da Dan, a decisão de mergir manga+anime em 1 card (como Hunter x Hunter) ou manter separados fica a cargo do admin — ambas as opções são viáveis.

**Nenhum dado deve ser alterado nesta fase (dry-run).** Nenhum AnimeEntry, WorkRelease, ExternalMapping, CardOverride ou progresso de usuário está em risco com a Opção B.