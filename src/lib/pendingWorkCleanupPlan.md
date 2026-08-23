# Fase 2F — Plano de Correção Manual (Dry-Run / Análise)

**Data:** 2026-08-23
**Modo:** Somente análise. Nenhum dado alterado, nenhum registro deletado, nenhuma migração aplicada.

---

## PARTE 1 — Dan Da Dan

### 1.1 DynamicWork encontrados (2 registros)

#### Registro A — Orfão (season 3 standalone)
| Campo | Valor |
|---|---|
| id | 6a4e855cd4931d0bed3ae234 |
| slug | dan-da-dan-season-3 |
| title | Dan Da Dan Season 3 |
| franchise_id | null |
| franchise_title | null |
| mal_id | 62516 |
| year | null |
| episodes | null |
| image_url | https://cdn.myanimelist.net/images/anime/1671/154516l.jpg |
| seasons[] | [] (vazio) |
| sync_release_completed | false |
| release_count | 0 |

#### Registro B — Principal (franchise)
| Campo | Valor |
|---|---|
| id | 6a4d567b19cbf3ad51fdb9ee |
| slug | dan-da-dan |
| title | Dan Da Dan |
| franchise_id | 57334 |
| franchise_title | Dan Da Dan |
| mal_id | 57334 |
| year | 2024 |
| episodes | 12 |
| image_url | https://cdn.myanimelist.net/images/anime/1584/143719l.jpg |
| sync_release_completed | false |
| release_count | 0 |

### 1.2 seasons[] atual completo (Registro B)

| index | mal_id | season_number | season_title | sort_order | episodes | year | score |
|---|---|---|---|---|---|---|---|
| 0 | 57334 | 1 | Dan Da Dan | 1 | 12 | 2024 | 8.4 |
| **1** | **57334** | **null** | Dan Da Dan | 2 | 12 | 2024 | 8.4 | ← **DUPLICADO** |
| 2 | 60543 | 2 | Dan Da Dan Season 2 | 3 | 12 | 2025 | 8.4 |
| 3 | 62516 | 3 | Dan Da Dan Season 3 | 4 | null | null | null |

### 1.3 Diagnóstico

- **mal_id duplicado:** 57334 aparece em index 0 e index 1.
- **season_number null:** index 1 tem season_number null (confirmado).
- **Orfão:** Registro A (slug `dan-da-dan-season-3`, mal_id 62516) é um DynamicWork separado cujo mal_id 62516 **já está representado** em seasons[] index 3 do Registro B. É um registro órfão redundante.

### 1.4 seasons[] final proposto (após correção)

Remover index 1 (duplicado) e manter o resto:

| index final | mal_id | season_number | season_title | sort_order | episodes | year | score |
|---|---|---|---|---|---|---|---|
| 0 | 57334 | 1 | Dan Da Dan | 1 | 12 | 2024 | 8.4 |
| 1 | 60543 | 2 | Dan Da Dan Season 2 | 2 | 12 | 2025 | 8.4 |
| 2 | 62516 | 3 | Dan Da Dan Season 3 | 3 | null | null | null |

### 1.5 Plano de correção (a aplicar na Fase 2F-execução)

1. Atualizar Registro B: `seasons = JSON.stringify([57334, 60543, 62516])` (3 itens, sem duplicata).
2. Deletar Registro A (orfão `dan-da-dan-season-3`) — seu mal_id 62516 já está em seasons[] do Registro B.
3. Validar: 0 mal_id duplicados, 0 season_number null.

### 1.6 WorkRelease que seriam gerados após correção

| release_order | mal_id | title (sugerido) | slug (sugerido) | category | episode_count |
|---|---|---|---|---|---|
| 1 | 57334 | Dan Da Dan | dan-da-dan-season-1 | anime | 12 |
| 2 | 60543 | Dan Da Dan Season 2 | dan-da-dan-season-2 | anime | 12 |
| 3 | 62516 | Dan Da Dan Season 3 | dan-da-dan-season-3 | anime | null |

**Total: 3 WorkRelease.**

### 1.7 ExternalMapping provider=mal que seriam gerados

| provider | provider_id | work_group_id | work_release_id |
|---|---|---|---|
| mal | 57334 | (Registro B id) | (release 1 id) |
| mal | 60543 | (Registro B id) | (release 2 id) |
| mal | 62516 | (Registro B id) | (release 3 id) |

**Total: 3 ExternalMapping.**

### 1.8 Confirmação de integridade pós-correção

- ✅ 0 mal_id duplicados em seasons[] (57334 aparece 1x).
- ✅ 0 season_number null.
- ✅ 0 slugs duplicados entre WorkRelease (dan-da-dan-season-1/2/3 são únicos).
- ⚠️ Slug `dan-da-dan-season-3` deixaria de existir como DynamicWork (Registro A deletado) — mas **nenhum AnimeEntry referencia title "Dan Da Dan Season 3"** (verificado: 0 entradas), então nenhum link quebra.

---

## PARTE 2 — Hunter x Hunter

### 2.1 DynamicWork encontrados (3 registros, TODOS com slug colidido `hunter-x-hunter`)

#### Registro 1 — Anime 2011
| Campo | Valor |
|---|---|
| id | 6a5074d40366340112f3fbb2 |
| slug | hunter-x-hunter |
| title | Hunter x Hunter |
| title_pt | null |
| categories | ["anime"] |
| mal_id | 11061 |
| manga_mal_id | null |
| franchise_id | 11061 |
| franchise_title | Hunter x Hunter |
| year | 2011 |
| episodes | 148 |
| chapters | null |
| volumes | null |
| image_url | https://cdn.myanimelist.net/images/anime/1337/99013l.jpg |
| score | 9.03 |
| anime_status | Finalizado |
| seasons[] | [{mal_id: 11061, s1, 148 eps, 2011, score 9.03}] |
| sync_release_completed | false |

#### Registro 2 — Manga 1998
| Campo | Valor |
|---|---|
| id | 6a2f677ab3610ded6c7bbbd1 |
| slug | hunter-x-hunter |
| title | Hunter x Hunter |
| title_pt | null |
| categories | ["manga"] |
| mal_id | null |
| manga_mal_id | 26 |
| franchise_id | null |
| franchise_title | null |
| year | 1998 |
| episodes | null |
| chapters | null |
| volumes | null |
| image_url | https://cdn.myanimelist.net/images/manga/2/253119l.jpg |
| score | 8.78 |
| manga_status | Em publicação |
| seasons[] | [] (vazio) |
| sync_release_completed | false |

#### Registro 3 — Anime 1999
| Campo | Valor |
|---|---|
| id | 6a2bb1c9f0515195be93340c |
| slug | hunter-x-hunter |
| title | Hunter x Hunter |
| title_pt | null |
| categories | ["anime"] |
| mal_id | 136 |
| manga_mal_id | null |
| franchise_id | 136 |
| franchise_title | Hunter x Hunter |
| year | 1999 |
| episodes | 62 |
| chapters | null |
| volumes | null |
| image_url | https://cdn.myanimelist.net/images/anime/1305/132237l.jpg |
| score | 8.44 |
| anime_status | Finalizado |
| seasons[] | [{mal_id: 136, s1, 62 eps, 1999, score 8.44}, {mal_id: 11061, **season_number null**, 148 eps, 2011, score 9.03}] |
| sync_release_completed | false |

### 2.2 Problemas identificados

1. **Colisão de slug:** os 3 registros compartilham slug `hunter-x-hunter`. A rota `/obra/hunter-x-hunter` resolve ambiguamente (depende da ordem de retorno da API).
2. **Contaminação cruzada:** Registro 3 (anime 1999) inclui mal_id 11061 em seasons[], mas 11061 é o mal_id do Registro 1 (anime 2011) que existe como DynamicWork separado. Isso viola a regra de dedup no nível temporada.
3. **Manga sem franchise_id:** Registro 2 não tem franchise_id nem seasons[] — está desconectado do franchise.

### 2.3 Entidades relacionadas

| Entidade | Registros para `hunter-x-hunter` |
|---|---|
| CardOverride | 0 |
| WorkCategoryVisibility | 0 |
| CatalogSync | 0 |
| AnimeEntry | 3 (todas title "Hunter x Hunter", season_mal_id 11061) |

#### AnimeEntry relacionados (3)
| entry_id | title | type | status | season_mal_id | release_id | current_episode | total_episodes | created_by |
|---|---|---|---|---|---|---|---|---|
| 6a2ba9c408af1541baf29032 | Hunter x Hunter | anime | completed | 11061 | null | 148 | 148 | iagobmelo@gmail.com |
| 6a2b86e77db607fb06b40813 | Hunter x Hunter | anime | completed | 11061 | null | 148 | 148 | pedrogomesrda@gmail.com |
| 6a2b85e39033c5656dda2d7e | Hunter x Hunter | anime | watching | 11061 | null | 30 | 148 | raphael215.rp@gmail.com |

**Observação:** Todas as 3 AnimeEntry referenciam season_mal_id 11061 (anime 2011). Nenhuma referencia 136 (anime 1999) nem manga_mal_id 26.

#### WorkRelease / ExternalMapping existentes
- 0 WorkRelease para esses grupos (nenhum migrado).
- 0 ExternalMapping para mal_ids {136, 11061, 26}.

---

### 2.4 Opções de Correção

---

#### OPÇÃO A — Franchise canônico único + 3 WorkReleases (RECOMENDADA)

**Conceito:** Criar/usar um único DynamicWork canônico "Hunter x Hunter" como franchise-mãe, e converter anime 1999, anime 2011 e manga em 3 WorkReleases separados sob esse grupo.

**Slugs:**
- DynamicWork canônico: `hunter-x-hunter` (mantido)
- WorkRelease anime 1999: `hunter-x-hunter-1999`
- WorkRelease anime 2011: `hunter-x-hunter-2011`
- WorkRelease manga: `hunter-x-hunter-manga`

**Registros mantidos:**
- Registro 1 (id 6a5074d40366340112f3fbb2, anime 2011) → **convertido em DynamicWork canônico** (franchise-mãe).
  - categories passa a ser `["anime","manga"]`
  - franchise_id mantido como "11061" (menor mal_id de anime? não — 136 é menor). **Decisão:** franchise_id = "136" (menor mal_id entre os animes) para consistência com a regra de raiz = menor mal_id. Ou manter "11061" já que é o anime mais popular. **Recomendação:** usar franchise_id = "136" (raiz cronológica = 1999).
  - seasons[] removido (substituído por WorkReleases).

**Registros mesclados:**
- Registro 3 (anime 1999, mal_id 136) → absorvido como WorkRelease no grupo canônico.
- Registro 2 (manga, manga_mal_id 26) → absorvido como WorkRelease no grupo canônico.

**Registros excluídos:**
- Registro 3 (6a2bb1c9f0515195be93340c) → deletado após criar WorkRelease correspondente.
- Registro 2 (6a2f677ab3610ded6c7bbbd1) → deletado após criar WorkRelease correspondente.

**WorkRelease gerados (3):**
| release_order | mal_id / manga_mal_id | title | slug | category | format | episode_count / chapter_count |
|---|---|---|---|---|---|---|
| 1 | 136 | Hunter x Hunter (1999) | hunter-x-hunter-1999 | anime | TV | 62 eps |
| 2 | 11061 | Hunter x Hunter (2011) | hunter-x-hunter-2011 | anime | TV | 148 eps |
| 3 | 26 (manga) | Hunter x Hunter (Manga) | hunter-x-hunter-manga | manga | MANGA | chapters: null |

**ExternalMapping gerados (3):**
| provider | provider_id | work_group_id | work_release_id |
|---|---|---|---|
| mal | 136 | (canônico id) | (release 1999 id) |
| mal | 11061 | (canônico id) | (release 2011 id) |
| mal | 26 | (canônico id) | (release manga id) |

**Impacto em CardOverride:** nenhum (0 existem para hunter-x-hunter).

**Impacto em WorkCategoryVisibility:** nenhum (0 existem). Após correção, pode-se criar visibilidade para o canônico se desejado.

**Impacto em CatalogSync:** nenhum CatalogSync existe para hunter-x-hunter. Após correção, criar CatalogSync para o slug canônico com franchise_id.

**Impacto em AnimeEntry:** as 3 entradas com season_mal_id 11061 poderiam receber release_id via backfill (match exato ExternalMapping mal:11061 → WorkRelease 2011). **Impacto positivo** — desbloqueia 3 entradas do dry-run anterior.

**Risco de quebrar links:**
- `/obra/hunter-x-hunter` continuaria funcionando (slug mantido no canônico).
- ⚠️ **Risco médio:** o canônico teria categories `["anime","manga"]`, então apareceria tanto na lista de animes quanto de mangas. Isso é o comportamento desejado para franchise, mas pode duplicar o card se o frontend não filtrar por release. **Mitigação:** o frontend atual exibe por DynamicWork (não por WorkRelease), então o card aparecerá uma vez em cada categoria — aceitável.
- ⚠️ Nenhum AnimeEntry referencia title único para 1999 ou manga, então nenhum link de progresso quebra.

**Recomendação:** ✅ **Esta é a opção que melhor atende à preferência de produto** (franchise organizada com 3 releases separados: 1999, 2011, manga).

---

#### OPÇÃO B — Manter 3 DynamicWork separados, corrigir slugs

**Conceito:** Manter os 3 DynamicWork como registros distintos, apenas corrigir slugs para evitar colisão e remover a contaminação cruzada.

**Slugs:**
- Registro 1 (anime 2011): `hunter-x-hunter-2011` (alterado de `hunter-x-hunter`)
- Registro 3 (anime 1999): `hunter-x-hunter-1999` (alterado de `hunter-x-hunter`)
- Registro 2 (manga): `hunter-x-hunter` (mantido, pois é o "principal" da categoria manga) OU `hunter-x-hunter-manga`

**Registros mantidos:** os 3 (nenhum deletado, nenhum mesclado).

**Correções adicionais:**
- Registro 3: remover mal_id 11061 de seasons[] (pertence ao Registro 1). seasons[] final = [{mal_id 136, s1, 62 eps, 1999}].
- Registro 1: seasons[] mantido = [{mal_id 11061, s1, 148 eps, 2011}].
- Registro 2: sem alteração (manga sem seasons).

**WorkRelease:** cada um teria 1 WorkRelease (3 total) — mas sem agrupamento de franchise.

**Impacto em CardOverride:** nenhum (0 existem).

**Impacto em WorkCategoryVisibility:** nenhum (0 existem).

**Impacto em CatalogSync:** nenhum existe, mas seria necessário criar/atualizar CatalogSync para os novos slugs.

**Impacto em AnimeEntry:** as 3 entradas com season_mal_id 11061 continuariam sem release_id até backfill. Title "Hunter x Hunter" continuaria ambíguo (3 DynamicWork com o mesmo title) — o resolver por title/type não seria confiável.

**Risco de quebrar links:**
- 🔴 **Risco alto:** `/obra/hunter-x-hunter` atualmente resolve para um dos 3 (ambíguo). Após mudança de slug, links compartilhados antigos (`/obra/hunter-x-hunter`) quebrariam se o slug canônico mudar.
- **Mitigação:** manter Registro 2 (manga) com slug `hunter-x-hunter` preserva o link, mas então o link aponta para manga — confuso.
- ⚠️ Title "Hunter x Hunter" permanece duplicado em 3 registros → busca e resolução legada continuam ambíguas.

**Recomendação:** ❌ Não recomendada. Não resolve a ambiguidade de title nem organiza como franchise. Apenas mascara a colisão de slug.

---

#### OPÇÃO C — Híbrida: franchise canônico para animes + manga separado

**Conceito:** Mesclar anime 1999 + anime 2011 em um DynamicWork canônico de franchise (2 WorkReleases), e manter manga como DynamicWork separado com slug próprio.

**Slugs:**
- DynamicWork canônico (animes): `hunter-x-hunter`
- WorkRelease anime 1999: `hunter-x-hunter-1999`
- WorkRelease anime 2011: `hunter-x-hunter-2011`
- DynamicWork manga: `hunter-x-hunter-manga` (slug alterado de `hunter-x-hunter`)

**Registros mantidos:**
- Registro 1 (anime 2011) → canônico dos animes.
- Registro 2 (manga) → mantido separado, slug corrigido para `hunter-x-hunter-manga`.

**Registros mesclados:**
- Registro 3 (anime 1999) → absorvido como WorkRelease no canônico.

**Registros excluídos:**
- Registro 3 (6a2bb1c9f0515195be93340c) → deletado após criar WorkRelease.

**WorkRelease gerados (2):**
| release_order | mal_id | title | slug | category | episode_count |
|---|---|---|---|---|---|
| 1 | 136 | Hunter x Hunter (1999) | hunter-x-hunter-1999 | anime | 62 |
| 2 | 11061 | Hunter x Hunter (2011) | hunter-x-hunter-2011 | anime | 148 |

**ExternalMapping gerados (2):** mal:136, mal:11061.

**Impacto em AnimeEntry:** as 3 entradas com season_mal_id 11061 poderiam receber release_id (match exato). Mesmo benefício da Opção A para anime. Manga não é afetado (0 entradas de manga).

**Risco de quebrar links:**
- `/obra/hunter-x-hunter` continua funcionando (canônico anime).
- Manga muda slug para `hunter-x-hunter-manga` — mas 0 AnimeEntry e 0 CardOverride referenciam manga, então nenhum link quebra.
- ⚠️ Manga fica fora do franchise (não aparece como release da mesma obra). Diverge da preferência de produto ("Hunter x Hunter manga" como release).

**Recomendação:** ⚠️ Viável e mais segura que A (evita cross-category merge anime+manga), mas **não atende totalmente à preferência de produto** (manga fora do franchise).

---

### 2.5 Comparação e Recomendação Final

| Critério | Opção A | Opção B | Opção C |
|---|---|---|---|
| Atende preferência de produto (3 releases) | ✅ Sim | ❌ Não | ⚠️ Parcial |
| Resolve colisão de slug | ✅ Sim | ✅ Sim | ✅ Sim |
| Resolve contaminação seasons[] | ✅ Sim | ✅ Sim | ✅ Sim |
| Organiza como franchise | ✅ Sim | ❌ Não | ⚠️ Só animes |
| Desbloqueia backfill AnimeEntry | ✅ 3 entradas | ⚠️ Depende | ✅ 3 entradas |
| Risco de quebrar links | Médio | Alto | Baixo |
| Complexidade cross-category | ⚠️ anime+manga juntos | Nenhuma | Nenhuma |
| Registros deletados | 2 | 0 | 1 |

**Recomendação:** **Opção A** — atende à preferência de produto (franchise organizada com 3 releases: 1999, 2011, manga). O risco médio (cross-category anime+manga no mesmo DynamicWork) é mitigado pelo fato de que o schema DynamicWork suporta categories `["anime","manga"]` e ambos anime_status/manga_status. Nenhum AnimeEntry, CardOverride, WorkCategoryVisibility ou CatalogSync existente seria quebrado.

**Reserva:** se a fusão cross-category (anime+manga no mesmo grupo) causar problemas no frontend (ex.: card duplicado ou filtro de categoria), a **Opção C** é a alternativa segura — manga separado, animes unificados.

---

## Confirmações Finais

- ✅ Nenhum dado alterado (somente análise).
- ✅ Nenhum registro deletado.
- ✅ Nenhuma migração aplicada.
- ✅ Nenhum AnimeEntry alterado.
- ✅ Frontend não alterado.
- ✅ Nenhuma integração AniList.
- ✅ Nenhum WorkRelease criado.
- ✅ Nenhum ExternalMapping criado.

---

## Próximos Passos (pendentes de autorização)

1. **Fase 2F-execução dan-da-dan:** aplicar correção do seasons[] + deletar orfão + migrar para 3 WorkRelease.
2. **Fase 2F-execução hunter-x-hunter:** aplicar Opção A (ou C) — criar canônico + 3 (ou 2) WorkRelease + deletar absorvidos.
3. **Backfill adicional:** após criar ExternalMapping mal:11061, as 3 AnimeEntry de hunter-x-hunter poderiam receber release_id (match exato).