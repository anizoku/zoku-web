# Fase 3B-3 — Relatório: Dry-Run de Criação de WorkRelease Raiz

**Data:** 2026-08-24
**Tipo:** Dry-run (simulação, sem escrita)
**Escopo:** Simular criação de WorkRelease principal para Death Note e One Piece e vinculação dos ExternalMappings existentes

---

## 1. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| WorkRelease que seriam criados | **2** (simulados) |
| ExternalMappings que seriam atualizados | **4** (simulados) |
| Colisões de slug detectadas | **0** ✅ |
| Ambiguidades de DynamicWork | **0** ✅ (canônico confirmado via mal_id) |
| WorkRelease reais criados | **0** ✅ |
| ExternalMappings reais atualizados | **0** ✅ |
| Dados gravados no banco | **0** ✅ |

### Critério de Aceitação: ✅ APROVADO PARA CRIAÇÃO REAL
0 colisões, 0 ambiguidades, DynamicWork canônico correto para ambas as obras.

---

## 2. DynamicWork Canônico Localizado

### Death Note
| Campo | Valor |
|-------|-------|
| ID canônico | `6a2bb0e39902c5843cb844da` |
| slug | death-note |
| mal_id | 1535 ✅ |
| score | 8.62 |
| image_url | https://cdn.myanimelist.net/images/anime/1079/138100l.jpg |
| sync_status | synced |

**⚠️ Slug duplicado conhecido:** Existe um segundo DynamicWork com slug `death-note` (id=`6a2f6777c11f124045d1a18a`, mal_id=null, score=8.68). O canônico foi identificado corretamente via `filter({ slug: "death-note", mal_id: 1535 })`, garantindo que o WorkRelease será vinculado ao registro correto. O duplicado não será afetado.

### One Piece
| Campo | Valor |
|-------|-------|
| ID canônico | `6a2bb0ec71e0d6c6dbac6e88` |
| slug | one-piece |
| mal_id | 21 ✅ |
| score | 8.73 |
| image_url | https://cdn.myanimelist.net/images/anime/1244/138851l.jpg |
| sync_status | synced |

**Sem duplicados.** ✅

---

## 3. ExternalMappings Existentes (validação)

### Death Note
| Mapping | ID | provider_id | work_group_id | work_release_id |
|---------|-----|------------|---------------|-----------------|
| mal | `6a8ba19fd17fe34f5a329bee` | 1535 | `6a2bb0e39902c5843cb844da` | **null** ✅ |
| anilist | `6a8ba19fd17fe34f5a329bef` | 1535 | `6a2bb0e39902c5843cb844da` | **null** ✅ |

### One Piece
| Mapping | ID | provider_id | work_group_id | work_release_id |
|---------|-----|------------|---------------|-----------------|
| mal | `6a8ba19fd17fe34f5a329bf0` | 21 | `6a2bb0ec71e0d6c6dbac6e88` | **null** ✅ |
| anilist | `6a8ba19fd17fe34f5a329bf1` | 21 | `6a2bb0ec71e0d6c6dbac6e88` | **null** ✅ |

**Todos os 4 mappings existem e estão com work_release_id=null.** ✅

---

## 4. WorkRelease Existentes (validação de ausência)

| Obra | WorkRelease existentes | Status |
|------|----------------------|--------|
| Death Note | 0 | ✅ Confirmado ausente |
| One Piece | 0 | ✅ Confirmado ausente |

---

## 5. WorkRelease Simulados

### Death Note — WorkRelease simulado
| Campo | Valor |
|-------|-------|
| _simulated_id | SIM_DN_RELEASE_001 |
| group_id | `6a2bb0e39902c5843cb844da` |
| group_slug | death-note |
| slug | **death-note-main** |
| title | Death Note |
| category | anime |
| format | TV |
| episode_count | 37 |
| season_year | 2006 |
| duration_minutes | 23 |
| is_main_entry | true |
| release_order | 1 |
| display_order | 1 |
| status | finished |
| score | 8.62 (mantido do DynamicWork) |
| cover_url | https://cdn.myanimelist.net/images/anime/1079/138100l.jpg (mantido do DynamicWork) |
| sync_status | synced |

### One Piece — WorkRelease simulado
| Campo | Valor |
|-------|-------|
| _simulated_id | SIM_OP_RELEASE_001 |
| group_id | `6a2bb0ec71e0d6c6dbac6e88` |
| group_slug | one-piece |
| slug | **one-piece-main** |
| title | One Piece |
| category | anime |
| format | TV |
| episode_count | null (ainda em exibição) |
| season_year | 1999 |
| duration_minutes | 24 |
| is_main_entry | true |
| release_order | 1 |
| display_order | 1 |
| status | releasing |
| score | 8.73 (mantido do DynamicWork) |
| cover_url | https://cdn.myanimelist.net/images/anime/1244/138851l.jpg (mantido do DynamicWork) |
| sync_status | synced |

---

## 6. ExternalMappings que Seriam Atualizados (simulação)

| Mapping ID | provider | provider_id | work_release_id atual | work_release_id simulado |
|------------|---------|------------|----------------------|--------------------------|
| `6a8ba19fd17fe34f5a329bee` | mal | 1535 | null | SIM_DN_RELEASE_001 |
| `6a8ba19fd17fe34f5a329bef` | anilist | 1535 | null | SIM_DN_RELEASE_001 |
| `6a8ba19fd17fe34f5a329bf0` | mal | 21 | null | SIM_OP_RELEASE_001 |
| `6a8ba19fd17fe34f5a329bf1` | anilist | 21 | null | SIM_OP_RELEASE_001 |

---

## 7. Validação de Colisões de Slug

| Slug simulado | Colide com WorkRelease existente? | Status |
|---------------|-----------------------------------|--------|
| `death-note-main` | ❌ Não | ✅ |
| `death-note` (alternativo) | ❌ Não | ✅ |
| `one-piece-main` | ❌ Não | ✅ |
| `one-piece` (alternativo) | ❌ Não | ✅ |

**0 colisões detectadas.** Os slugs `death-note-main` e `one-piece-main` são seguros para uso. ✅

> **Recomendação:** Usar `death-note-main` e `one-piece-main` (sufixo `-main`) em vez de `death-note` e `one-piece` para evitar confusão futura com o slug do DynamicWork pai e manter consistência com a convenção de outros releases.

---

## 8. AnimeEntry Potencialmente Afetados

### Death Note
| Métrica | Valor |
|---------|-------|
| AnimeEntry encontrados | **0** |
| Entries que poderiam receber release_id | 0 |

**Nenhum AnimeEntry de Death Note existe no banco.** Nenhum progresso de usuário seria afetado nesta fase. ✅

### One Piece
| Métrica | Valor |
|---------|-------|
| AnimeEntry encontrados | **9** |
| Entries que poderiam receber release_id depois | 9 |

| Entry ID | Title | Status | current_episode |
|---------|-------|--------|-----------------|
| `6a2c0aa74cc373431d83c30f` | One Piece | completed | 2 |
| `6a2c0aa45825ba62ab9ac4bb` | One Piece | completed | 1 |
| `6a2c0a9c85382b2b2fbb6d11` | One Piece | completed | 1 |
| `69fa04366acca087d4f00a10` | One Piece | watching | 0 |
| `69f89f820ba669af6d16ffe9` | One Piece | watching | 90 |
| `69f7d8ea7b91b9c7023a99b1` | One Piece | reading | 0 |
| `69f7d8e3957023659d3bbe68` | One Piece | completed | 1122 |
| `69f6a5d124acab3fc62d7de4` | One Piece | completed | 1122 |
| `69f6a5c43f51af209774105b` | One Piece | reading | 0 |

**⚠️ Importante:** Estes 9 AnimeEntry têm `release_id=null` atualmente. Após a criação real do WorkRelease na Fase 3B-4, estes entries poderiam receber `release_id` do novo WorkRelease via backfill. **Porém, nesta fase (3B-3 dry-run), nenhum AnimeEntry será alterado.** O backfill seria uma fase separada (3B-5).

---

## 9. Confirmação de Integridade

| Entidade | Antes | Depois | Alterada? |
|----------|-------|--------|-----------|
| DynamicWork | 797 | 797 | ❌ Não |
| ExternalMapping | 225 | 225 | ❌ Não |
| WorkRelease | 212 | 212 | ❌ Não (simulação) |
| AnimeEntry | 102 | 102 | ❌ Não |
| SyncConflict | 0 | 0 | ❌ Não |

### Regras respeitadas
- ✅ Nenhum WorkRelease criado (simulação)
- ✅ Nenhum ExternalMapping atualizado (simulação)
- ✅ Nenhum DynamicWork alterado
- ✅ Nenhum AnimeEntry alterado
- ✅ Nenhum progresso de usuário alterado
- ✅ Nenhum frontend alterado
- ✅ Nenhum SyncConflict criado
- ✅ Nenhum fuzzy matching usado
- ✅ Nenhum LLM usado
- ✅ Nenhuma relation importada
- ✅ Bleach TYBW não importado
- ✅ Nenhum dado visual atualizado

---

## 10. Riscos Identificados

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|--------|-----------|
| 1 | Slug duplicado de Death Note pode causar confusão | Certeza | Baixo | DynamicWork canônico já identificado via `mal_id=1535`; WorkRelease será vinculado ao canônico |
| 2 | 9 AnimeEntry de One Piece sem release_id | Certeza | Neutro | Backfill será feito em fase separada (3B-5); nesta fase, nenhum AnimeEntry é alterado |
| 3 | One Piece ainda em exibição (status=releasing) | Certeza | Baixo | episode_count=null reflete corretamente o status; será atualizado quando o anime terminar |
| 4 | Score e cover_url copiados do DynamicWork podem divergir do AniList | Certeza | Baixo | Intencional — nesta fase mantemos valores do DynamicWork; upsert de dados visuais será na Fase 3B-4 |
| 5 | Slug `death-note-main` vs `death-note` | Certeza | Neutro | Recomendação: usar `-main` para evitar colisão futura com slug do DynamicWork pai |

---

## 11. Plano para Criação Real (Fase 3B-4)

### Passo 1: Criar WorkRelease
```
Death Note:
  group_id: 6a2bb0e39902c5843cb844da
  group_slug: death-note
  slug: death-note-main
  title: Death Note
  category: anime, format: TV
  episode_count: 37, season_year: 2006, duration_minutes: 23
  is_main_entry: true, release_order: 1, display_order: 1
  status: finished
  score: 8.62, cover_url: (mantido do DynamicWork)
  sync_status: synced

One Piece:
  group_id: 6a2bb0ec71e0d6c6dbac6e88
  group_slug: one-piece
  slug: one-piece-main
  title: One Piece
  category: anime, format: TV
  episode_count: null, season_year: 1999, duration_minutes: 24
  is_main_entry: true, release_order: 1, display_order: 1
  status: releasing
  score: 8.73, cover_url: (mantido do DynamicWork)
  sync_status: synced
```

### Passo 2: Atualizar ExternalMappings
```
Death Note mal    → work_release_id = (novo WorkRelease.id)
Death Note anilist → work_release_id = (novo WorkRelease.id)
One Piece mal     → work_release_id = (novo WorkRelease.id)
One Piece anilist  → work_release_id = (novo WorkRelease.id)
```

### Passo 3: Atualizar DynamicWork.release_count
```
Death Note → release_count: 0 → 1
One Piece  → release_count: 0 → 1
```

### Passo 4 (futuro, Fase 3B-5): Backfill de AnimeEntry
```
9 AnimeEntry de One Piece → release_id = (novo WorkRelease.id)
0 AnimeEntry de Death Note → nenhum backfill necessário
```

---

## 12. Critério de Aceitação

> "Só avançaremos para a criação real se o dry-run mostrar 0 colisões, 0 ambiguidades e DynamicWork canônico correto para Death Note e One Piece."

### Status: ✅ APROVADO

| Critério | Status | Evidência |
|----------|--------|-----------|
| 0 colisões de slug | ✅ | 4 slugs verificados, 0 colisões |
| 0 ambiguidades | ✅ | DynamicWork canônico identificado via mal_id |
| DynamicWork canônico correto para Death Note | ✅ | id=`6a2bb0e39902c5843cb844da`, mal_id=1535 |
| DynamicWork canônico correto para One Piece | ✅ | id=`6a2bb0ec71e0d6c6dbac6e88`, mal_id=21 |
| ExternalMappings existem e estão null | ✅ | 4/4 com work_release_id=null |
| Nenhum WorkRelease existente | ✅ | 0 para ambas as obras |
| Nada foi gravado | ✅ | 212 WR, 225 EM, 102 AE — todos intactos |

---

## 13. Conclusão

**Dry-run da Fase 3B-3 executado com sucesso.** A simulação confirma que a criação de WorkRelease raiz para Death Note e One Piece é segura:
- 0 colisões de slug
- 0 ambiguidades de DynamicWork (canônico confirmado via mal_id)
- 4 ExternalMappings prontos para vinculação (work_release_id=null)
- 0 WorkRelease existentes para essas obras
- 9 AnimeEntry de One Piece identificados para backfill futuro (Fase 3B-5)
- 0 AnimeEntry de Death Note (nenhum backfill necessário)

**Aprovado para avançar à criação real (Fase 3B-4).**