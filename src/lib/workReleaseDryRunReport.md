# Fase 2B — Dry-Run: Migração seasons[] → WorkRelease

**Data:** 2026-08-23
**Modo:** Simulação somente leitura. Nada foi gravado no banco.

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| DynamicWork analisados | 800 |
| DynamicWork elegíveis (seasons[] + franchise_id) | 82 |
| WorkRelease que seriam criados | 213 |
| ExternalMapping que seriam criados | 213 |
| **Erros bloqueantes** | **9** |
| **Avisos (não-bloqueantes)** | **13** |

**Veredito:** ❌ Não é seguro avançar para Fase 2C sem resolver os 9 erros bloqueantes. Nenhum dado foi alterado.

---

## Erros Bloqueantes (9)

### Bloqueantes por slug de WorkRelease duplicado (7)
Causa raiz: múltiplas seasons[] dentro do mesmo grupo compartilham o mesmo `season_number` (ex: "Season 2" e "Season 2 Part 2" ambas com `season_number=2`). O slug gerado `${group_slug}-${season_number}` colide.

| # | Grupo | Slug colidido | Causa |
|---|---|---|---|
| 1 | dan-da-dan | `dan-da-dan-2` | 2 seasons com season_number=2 |
| 2 | rezero--starting-life-in-another-world- | `rezero-starting-life-in-another-world-2` | "Season 2" + "Season 2 Part 2" ambas sn=2 |
| 3 | mushoku-tensei-jobless-reincarnation | `mushoku-tensei-jobless-reincarnation-2` | 2 seasons com sn=2 |
| 4 | mashle-magic-and-muscles | `mashle-magic-and-muscles-3` | 2 seasons com sn=3 |
| 5 | that-time-i-got-reincarnated-as-a-slime | `that-time-i-got-reincarnated-as-a-slime-2` | 2 seasons com sn=2 |
| 6 | attack-on-titan | `attack-on-titan-3` | 2 seasons com sn=3 |

**Correção proposta (Fase 2C):** Slug deve incorporar um discriminador de parte quando `season_number` se repetir. Opções:
- (A) `${group_slug}-${season_number}-${part_index}` quando há duplicação de sn.
- (B) `${group_slug}-${mal_id}` (garante unicidade, mas menos legível).
- (C) Detectar "Part 2" no `season_title` e incrementar sn ou adicionar sufixo `-part-2`.

### Bloqueante por mal_id duplicado dentro do grupo (1)
| # | Grupo | mal_id | Detalhe |
|---|---|---|---|
| 7 | dan-da-dan | 57334 | Season 1 e Season 2 ambas com mal_id 57334. A raiz (franchise_id=57334) foi reusada como season 2 — erro de dados. |

**Correção:** Revisar `seasons[]` de dan-da-dan manualmente. A season 2 deveria ter mal_id 60543 (que aparece como season 3). Provável troca de mal_id entre season 2 e 3.

### Bloqueante por DynamicWork duplicado (1)
| # | Slug | IDs | Detalhe |
|---|---|---|---|
| 8 | hunter-x-hunter | `6a5074d40366340112f3fbb2`, `6a2bb1c9f0515195be93340c` | Existem 2 registros DynamicWork com slug `hunter-x-hunter`. Ambas elegíveis. Geraria ExternalMapping `mal:11061` duplicado. |

**Correção:** Deduplicar os 2 registros hunter-x-hunter antes da migração (mesclar seasons[] ou remover o duplicado).

---

## Avisos Não-Bloqueantes (13)

### sort_order ≠ season_number (12)
Estes grupos têm `sort_order` e `season_number` dessincronizados em pelo menos uma season. Não bloqueia (a migração pode usar `sort_order` para `release_order` e `season_number` para exibição), mas indica dados inconsistentes.

| Grupo | season_index | sort_order | season_number |
|---|---|---|---|
| dan-da-dan | 2 | 3 | 2 |
| dan-da-dan | 3 | 4 | 3 |
| rezero--starting-life-in-another-world- | 2 | 3 | 2 |
| welcome-to-demon-school-iruma-kun | 1 | 2 | 4 |
| grand-blue-dreaming | 1 | 2 | 3 |
| mushoku-tensei-jobless-reincarnation | 2 | 3 | 2 |
| mushoku-tensei-jobless-reincarnation | 3 | 4 | 3 |
| tsukimichi-moonlit-fantasy | 1 | 2 | 3 |
| mashle-magic-and-muscles | 1 | 2 | 3 |
| gintama | 2 | 3 | 4 |
| that-time-i-got-reincarnated-as-a-slime | 2 | 3 | 2 |
| attack-on-titan | 3 | 4 | 3 |

**Nota:** `welcome-to-demon-school-iruma-kun` tem season_index 1 com season_number=4 (pulou 2 e 3) — pode indicar seasons faltando no catálogo.

### mal_id em múltiplos grupos (1)
| mal_id | Grupos |
|---|---|
| 11061 | hunter-x-hunter, hunter-x-hunter |

Este é o mesmo caso do bloqueante #8 (DynamicWork duplicado), não um conflito real entre franchises distintos.

---

## 5 Exemplos de Mapeamento Simulados

### Exemplo 1: hunter-x-hunter (single season)
```
group_slug: hunter-x-hunter | franchise_id: 11061 | seasons: 1
└─ Release: slug=hunter-x-hunter, title="Hunter x Hunter", category=anime, format=TV, sn=1, ep=148, year=2011, score=9.03, mal_id=11061
└─ Mapping: provider=mal, provider_id=11061, type=anime
⚠️ Excluir da migração auto (registro duplicado)
```

### Exemplo 2: dan-da-dan (4 seasons, COM erros)
```
group_slug: dan-da-dan | franchise_id: 57334 | seasons: 4
├─ Release 1: slug=dan-da-dan-1, sn=1, ep=12, year=2024, mal_id=57334
├─ Release 2: slug=dan-da-dan-2, sn=2, ep=12, year=2024, mal_id=57334 ❌ mal_id duplicado c/ release 1
├─ Release 3: slug=dan-da-dan-2, sn=2, ep=12, year=2025, mal_id=60543 ❌ slug duplicado c/ release 2
└─ Release 4: slug=dan-da-dan-3, sn=3, ep=null, year=2024, mal_id=62516
⚠️ Excluir da migração auto (requer correção manual de seasons[])
```

### Exemplo 3: Re:ZERO (4 seasons, COM erro de slug)
```
group_slug: rezero--starting-life-in-another-world- | franchise_id: 31240 | seasons: 4
├─ Release 1: slug=rezero-...-1, sn=1, ep=25, year=2016, mal_id=31240
├─ Release 2: slug=rezero-...-2, sn=2, ep=13, year=2020, mal_id=39587
├─ Release 3: slug=rezero-...-2, sn=2, ep=12, year=2021, mal_id=42203 ❌ slug duplicado ("Season 2 Part 2")
└─ Release 4: slug=rezero-...-4, sn=4, ep=19, year=2026, mal_id=61316
⚠️ Excluir da migração auto (slug colide)
```

### Exemplo 4: Kakegurui (2 seasons, limpo)
```
group_slug: kakegurui | franchise_title: Kakegurui | seasons: 2
├─ Release 1: slug=kakegurui-1, sn=1, ep=12, year=2017, mal_id=34933, score=7.21
└─ Release 2: slug=kakegurui-2, sn=2, ep=12, year=2019, mal_id=37086, score=7.18
└─ Mappings: mal:34933, mal:37086
✅ Pronto para migração
```

### Exemplo 5: Welcome to Demon School! Iruma-kun (2 seasons, com aviso)
```
group_slug: welcome-to-demon-school-iruma-kun | seasons: 2
├─ Release 1: slug=welcome-...-1, sn=1, ep=23, year=2019, mal_id=39196, score=7.74
└─ Release 2: slug=welcome-...-4, sn=4, ep=24, year=2026, mal_id=60310, score=8.14
⚠️ season_number pula de 1 para 4 (seasons 2 e 3 faltando no catálogo)
⚠️ sort_order(2) != season_number(4)
✅ Migração OK (slug único), mas revisar seasons faltantes
```

---

## DynamicWork a Excluir da Migração Automática (Fase 2C)

Estes grupos NÃO devem ser migrados automaticamente e exigem correção manual antes:

| Grupo | Motivo | Ação necessária |
|---|---|---|
| `hunter-x-hunter` | 2 registros DynamicWork duplicados | Deduplicar registros (mesclar ou remover um) |
| `dan-da-dan` | mal_id 57334 duplicado dentro do grupo + slug duplicado | Corrigir seasons[] (mal_id trocado entre s2/s3) |
| `rezero--starting-life-in-another-world-` | slug duplicado (Season 2 + Part 2) | Adicionar discriminador de parte no slug |
| `mushoku-tensei-jobless-reincarnation` | slug duplicado | Mesmo que acima |
| `mashle-magic-and-muscles` | slug duplicado | Mesmo que acima |
| `that-time-i-got-reincarnated-as-a-slime` | slug duplicado | Mesmo que acima |
| `attack-on-titan` | slug duplicado | Mesmo que acima |

**Total: 7 grupos excluídos** → 75 grupos limpos prontos para migração automática.

---

## Validações Executadas (checklist)

| # | Validação | Resultado |
|---|---|---|
| 1 | Todo item de seasons[] tem mal_id | ❌ Falha em dan-da-dan (implícito — mal_id reusado) |
| 2 | mal_id duplicado dentro do mesmo grupo | ❌ 1 caso (dan-da-dan, mal_id 57334) |
| 3 | mal_id duplicado entre grupos diferentes | ✅ Nenhum conflito real (hunter-x-hunter é registro duplicado) |
| 4 | Slug de WorkRelease duplicado | ❌ 6 casos |
| 5 | seasons[] inválido ou vazio | ✅ Todos os 82 elegíveis têm seasons[] válido |
| 6 | sort_order e season_number coerentes | ⚠️ 12 dessincronizações (não-bloqueante) |
| 7 | Release sem title | ✅ Todos têm title (fallback para franchise_title) |
| 8 | release_count simulado bate com seasons[] | ✅ 213 = soma de seasons[] dos 82 grupos |
| 9 | ExternalMapping mal duplicado | ❌ 2 casos (hunter-x-hunter dup + dan-da-dan) |
| 10 | Registro não deveria ser migrado auto | ❌ 7 grupos identificados |

---

## Recomendação para Fase 2C

Antes de executar a migração real, resolver:

1. **Deduplicar hunter-x-hunter** (2 registros DynamicWork).
2. **Corrigir seasons[] de dan-da-dan** (mal_id trocado entre season 2 e 3).
3. **Definir estratégia de slug para "Part 2"** — recomendado: quando `season_number` se repete, gerar slug como `${group_slug}-${season_number}-part-${part_index}` (ex: `rezero-...-2-part-2`).
4. Aplicar a correção de slug aos 5 grupos afetados (rezero, mushoku, mashle, slime, attack-on-titan).

Após essas correções, re-rodar o dry-run. Se 0 bloqueantes → avançar para Fase 2C com os 75+ grupos limpos.

**Nenhum dado foi gravado. WorkRelease, ExternalMapping e SyncConflict permanecem vazias.**