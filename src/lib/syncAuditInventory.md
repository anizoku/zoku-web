# Inventário da Fase 0 — Auditoria do modelo atual

**Data:** 2026-08-23
**Escopo:** leitura apenas. Nenhum schema alterado, nenhum dado migrado.

## 1. DynamicWork (modelo principal)

| Métrica | Valor |
|---|---|
| Total de obras | 800 |
| Com `seasons[]` não-vazio | 82 |
| Com `franchise_id` setado | 82 |
| Com `related_franchise_id` setado | 16 |
| Com `is_trending = true` | 0 |
| Com `trending_rank` setado | 1 |
| Animes sem `franchise_id` (candidatos a revisão) | 343 |
| Grupos duplicados por `franchise_id` | 0 (sem duplicatas hoje) |

**Observações:**
- Os 82 works com `seasons[]` correspondem exatamente aos 82 com `franchise_id` — o merge de franchises já feito pelo `FranchiseMerger` é consistente.
- 343 animes ainda não têm `franchise_id`. Esses são obras standalone ou não-processadas pelo merger. **Não devem ser migrados cegamente na Fase 2** — precisam de revisão (alguns são genuinamente standalone, outros são temporadas órfãs).
- `is_trending` está em 0 obras — o campo existe no schema mas não está em uso real no catálogo hoje (apenas `trending_rank` em 1 obra). Confirma a decisão de trocar `trending` boolean por `trending_score`/`trending_rank`.
- **Sem duplicatas de `franchise_id`** — o modelo atual está limpo nesse aspecto.

## 2. Formato de `seasons[]` (base para o schema de WorkRelease)

Estrutura confirmada e consistente em todos os 82 works amostrados. Cada item tem exatamente estas chaves:

```
{
  mal_id:        number,      → ID MAL da temporada (chave de dedup)
  season_number: number,     → 1 para a raiz; null para títulos não-parseáveis ("Final Season")
  season_title:  string,      → título ORIGINAL preservado ("Season 2", "Final Season Part 2")
  sort_order:    number,      → ordem por mal_id (menor = 1)
  episodes:      number|null,
  year:          number|null,
  poster_url:    string|null,
  synopsis:      string|null,
  score:         number|null
}
```

**Mapeamento para WorkRelease (Fase 2):**
- `mal_id` → `ExternalMapping(provider=mal, provider_id=mal_id)`
- `season_title` → `WorkRelease.title`
- `episodes` → `WorkRelease.episode_count`
- `year` → `WorkRelease.season_year`
- `poster_url` → `WorkRelease.cover_url`
- `synopsis` → `WorkRelease.synopsis`
- `score` → `WorkRelease.score`
- `sort_order` → `WorkRelease.display_order`
- `season_number` → não mapeia diretamente (já é derivado); `WorkRelease.release_order` pode usar `sort_order`

**Campos ausentes em `seasons[]` que o WorkRelease terá (virão do AniList na Fase 3, não da migração):**
- `format` (TV/OVA/MOVIE/...), `status`, `duration_minutes`, `title_romaji`, `title_english`, `chapter_count`, `popularity`, `trending_score`

## 3. AnimeEntry (progresso do usuário)

| Métrica | Valor |
|---|---|
| Total de entries | 102 |
| Com `season_mal_id` setado | 12 |
| Sem `season_mal_id` (nulo) | 90 |
| Por tipo: anime | 98 |
| Por tipo: liveaction | 2 |
| Por tipo: manga | 2 |

**Observações:**
- Apenas 12/102 entries (≈12%) têm `season_mal_id`. A maioria absoluta usa só `title`+`type` (fallback legado). Isso confirma que o backfill de `release_id` na Fase 2 vai atingir poucos registros no curto prazo — a maioria continuará no fallback por `title`/`type` até a Fase 5.
- Volume baixo (102 entries) — migração/backfill é trivial em custo.
- **Nenhum AnimeEntry será quebrado**: o campo `release_id` é opcional e a resolução tem fallback em 4 níveis.

## 4. Referências por `slug` (chave de junção estável)

| Entidade | Registros | Chave |
|---|---|---|
| `CardOverride` | 89 | `card_slug` |
| `WorkCategoryVisibility` | 23 | `work_slug` |
| `CatalogSync` | 495 | `slug` (todos `sync_status = synced`) |

**Observações:**
- `slug` permanece como chave de junção estável — nenhuma dessas entidades precisa ser migrada. O `WorkRelease` terá `group_slug` denormalizado justamente para preservar essas referências.
- `CatalogSync` tem 495 registros (vs 800 DynamicWork) — nem toda obra tem sync record. Todos os existentes estão `synced`.

## 5. Pontos de leitura/escrita de `seasons[]` e `franchise_id` no código

### Leitura/parse de `seasons[]`
- **`src/lib/franchiseDetection.js`** → `parseSeasons()` (linha 220) e `buildSeasonsArray()` (linha 203). É o ponto central de parse.
- **`src/contexts/CatalogContext.jsx`** → `getBySlug()` mescla `seasons[]` nos campos derivados de `media` (`totalEpisodes`, exibição de temporadas). **Ponto crítico a refatorar para `getWorkReleases()`.**
- **`src/components/admin/FranchiseMerger.jsx`** → escreve `seasons[]` via `DynamicWork.update` (linha 354) e lê via `detectFranchiseGroups`.

### Leitura de `franchise_id` / `related_franchise_id`
- **`src/components/admin/FranchiseMerger.jsx`** → define `franchise_id` no merge.
- **`src/contexts/CatalogContext.jsx`** → usa `related_franchise_id` para obras relacionadas.
- **`src/components/media/RelatedWorks.jsx`** → exibe obras relacionadas (consome `related_franchise_id` via contexto).
- **`src/components/admin/FranchiseGroupCard.jsx`** → exibição do card de grupo no merger.

### Escrita de `AnimeEntry` (pontos que criarão `release_id`/`external_*` no futuro)
- **`src/pages/ObraProfile.jsx`** → `FormatBlock.handleAdd()` (linha 217) cria entries por `title`+`type`+`genre`. **Ponto principal a ajustar na Fase 2/3 para setar `release_id`/`external_*`.**
- **`src/components/media/MediaDrawer.jsx`** → criação de entry fora do ObraProfile (a confirmar).
- **`src/components/mylist/ImportList.jsx`** → importação em massa (a confirmar).
- **`src/components/admin/FranchiseMerger.jsx`** → re-pointa `season_mal_id` no merge (linha 338).

## 6. Duplicatas conhecidas / obras a revisar

- **Duplicatas por `franchise_id`:** 0 (modelo limpo).
- **Animes sem `franchise_id`:** 343 — precisam triagem antes da Fase 2. Categorias:
  - Standalone genuínos (1 temporada, sem prequels) → podem receber `franchise_id` = próprio `mal_id`.
  - Temporadas órfãs (prequel não importado) → detectar via Jikan/AniList e importar raiz.
  - Filmes/OVAs/Specials → devem receber `related_franchise_id`, não `franchise_id`.
- **`is_trending` em 0 obras** — o "Em Alta" da home não está usando `is_trending` do catálogo hoje (provavelmente usa `trending_rank` ou outro critério). Confirmar antes de migrar para `trending_score`.

## 7. Riscos identificados para a Fase 2

1. **343 animes sem `franchise_id`** — o script de migração de `seasons[]` só deve processar os 82 com `franchise_id` + `seasons[]`. Os 343 ficam de fora até triagem.
2. **`seasons[]` com `synopsis` longo** — o campo `synopsis` dentro de `seasons[]` pode ser grande (ex: Hunter x Hunter tem sinopse de ~1000 chars). Ao migrar para `WorkRelease.synopsis`, isso é seguro (campo próprio de entidade), mas confirma que não há payload gigante escondido.
3. **`season_number: null`** em títulos não-parseáveis ("Final Season Part 2") — o `WorkRelease.release_order` deve usar `sort_order` (sempre numérico), não `season_number`.
4. **Apenas 12 AnimeEntry com `season_mal_id`** — o backfill imediato da Fase 2 terá alcance limitado. O ganho real vem na Fase 5 (backfill via `external_*` + sync AniList).

## 8. Conclusão da Fase 0

O modelo atual está **estável e consistente** nos 82 works já merged. A migração para `WorkRelease` é viável e segura para esse subconjunto. Os 343 animes sem `franchise_id` são o trabalho pendente de triagem (não bloqueia a Fase 1 nem a migração dos 82).

**Pronto para Fase 1** (criar `WorkRelease`, `ExternalMapping`, `SyncConflict` vazias) sem risco ao app atual.