# Fase 3B-2 — Relatório: Criação Manual de ExternalMapping para Death Note e One Piece

**Data:** 2026-08-24
**Tipo:** Escrita controlada (apenas ExternalMapping provider=mal + provider=anilist)
**Escopo:** Criar ExternalMapping `provider=mal` e `provider=anilist` para Death Note e One Piece (obras que ficaram como suggestion na Fase 3A por não terem mapping mal)

---

## 1. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| ExternalMappings criados | **4** (2 mal + 2 anilist) ✅ |
| ExternalMappings duplicados | **0** ✅ |
| WorkRelease criados | **0** ✅ |
| DynamicWork criados/alterados | **0** ✅ |
| SyncConflict criados | **0** ✅ |
| AnimeEntry alterados | **0** ✅ |
| Dados visuais atualizados | **0** ✅ |
| Frontend alterado | **0** ✅ |

---

## 2. Mappings Criados

### Death Note (mal_id=1535, slug=death-note)

#### ExternalMapping provider=mal
| Campo | Valor |
|-------|-------|
| ID | `6a8ba19fd17fe34f5a329bee` |
| provider | mal |
| provider_id | 1535 |
| provider_type | anime |
| work_group_id | `6a2bb0e39902c5843cb844da` |
| work_release_id | **null** (ainda não existe WorkRelease) |
| confidence_score | 100 |
| verified_by_admin | true |
| created_date | 2026-08-24T01:42:55.449000 |

#### ExternalMapping provider=anilist
| Campo | Valor |
|-------|-------|
| ID | `6a8ba19fd17fe34f5a329bef` |
| provider | anilist |
| provider_id | 1535 |
| provider_type | anime |
| work_group_id | `6a2bb0e39902c5843cb844da` |
| work_release_id | **null** (ainda não existe WorkRelease) |
| confidence_score | 100 |
| verified_by_admin | true |
| created_date | 2026-08-24T01:42:55.449000 |

#### DynamicWork vinculado
| Campo | Valor |
|-------|-------|
| ID | `6a2bb0e39902c5843cb844da` |
| slug | death-note |
| mal_id | 1535 |
| score | 8.62 (inalterado) |
| sync_status | synced (inalterado) |
| updated_date | 2026-06-15T02:46:15 (antes da operação — não alterado) |

---

### One Piece (mal_id=21, slug=one-piece)

#### ExternalMapping provider=mal
| Campo | Valor |
|-------|-------|
| ID | `6a8ba19fd17fe34f5a329bf0` |
| provider | mal |
| provider_id | 21 |
| provider_type | anime |
| work_group_id | `6a2bb0ec71e0d6c6dbac6e88` |
| work_release_id | **null** (ainda não existe WorkRelease) |
| confidence_score | 100 |
| verified_by_admin | true |
| created_date | 2026-08-24T01:42:55.449000 |

#### ExternalMapping provider=anilist
| Campo | Valor |
|-------|-------|
| ID | `6a8ba19fd17fe34f5a329bf1` |
| provider | anilist |
| provider_id | 21 |
| provider_type | anime |
| work_group_id | `6a2bb0ec71e0d6c6dbac6e88` |
| work_release_id | **null** (ainda não existe WorkRelease) |
| confidence_score | 100 |
| verified_by_admin | true |
| created_date | 2026-08-24T01:42:55.449000 |

#### DynamicWork vinculado
| Campo | Valor |
|-------|-------|
| ID | `6a2bb0ec71e0d6c6dbac6e88` |
| slug | one-piece |
| mal_id | 21 |
| score | 8.73 (inalterado) |
| sync_status | synced (inalterado) |
| updated_date | 2026-06-12T07:10:36 (antes da operação — não alterado) |

---

## 3. Validações Pós-Criação

### 3.1 Death Note tem ExternalMapping mal e anilist
| Mapping | Existe? | Status |
|---------|---------|--------|
| provider=mal, provider_id=1535 | ✅ Sim | Criado |
| provider=anilist, provider_id=1535 | ✅ Sim | Criado |

### 3.2 One Piece tem ExternalMapping mal e anilist
| Mapping | Existe? | Status |
|---------|---------|--------|
| provider=mal, provider_id=21 | ✅ Sim | Criado |
| provider=anilist, provider_id=21 | ✅ Sim | Criado |

### 3.3 Zero duplicatas em provider + provider_id + provider_type
| Métrica | Valor | Status |
|---------|-------|--------|
| Total de chaves (provider:provider_id:provider_type) | 225 | ✅ |
| Chaves únicas | 225 | ✅ |
| Tem duplicatas? | false | ✅ |

### 3.4 Os mappings apontam para o DynamicWork correto
| Obra | Mapping | work_group_id | DynamicWork.id esperado | Batem? |
|------|---------|---------------|------------------------|--------|
| Death Note | mal | `6a2bb0e39902c5843cb844da` | `6a2bb0e39902c5843cb844da` | ✅ |
| Death Note | anilist | `6a2bb0e39902c5843cb844da` | `6a2bb0e39902c5843cb844da` | ✅ |
| One Piece | mal | `6a2bb0ec71e0d6c6dbac6e88` | `6a2bb0ec71e0d6c6dbac6e88` | ✅ |
| One Piece | anilist | `6a2bb0ec71e0d6c6dbac6e88` | `6a2bb0ec71e0d6c6dbac6e88` | ✅ |

### 3.5 work_release_id permanece null
| Mapping | work_release_id | Status |
|---------|-----------------|--------|
| Death Note mal | null | ✅ |
| Death Note anilist | null | ✅ |
| One Piece mal | null | ✅ |
| One Piece anilist | null | ✅ |

**Todos os 4 mappings têm work_release_id=null** porque ainda não existe WorkRelease para essas obras. ✅

### 3.6 Nenhum WorkRelease foi criado
| Métrica | Antes | Depois | Delta | Status |
|---------|-------|--------|-------|--------|
| WorkRelease | 212 | 212 | 0 | ✅ |

### 3.7 Nenhum DynamicWork foi alterado
| Métrica | Antes | Depois | Delta | Status |
|---------|-------|--------|-------|--------|
| DynamicWork | 797 | 797 | 0 | ✅ |

**Scores e posters permanecem inalterados:**
| Obra | Score (antes=depois) | Poster | sync_status |
|------|---------------------|--------|-------------|
| Death Note | 8.62 | inalterado | synced |
| One Piece | 8.73 | inalterado | synced |

> **Nota sobre slug duplicado de Death Note:** Existe um segundo DynamicWork com slug `death-note` (id=`6a2f6777c11f124045d1a18a`, mal_id=null, score=8.68) — um duplicado conhecido documentado em `globalSlugDuplicateAudit.md`. Os mappings foram criados apontando para o DynamicWork canônico com `mal_id=1535` (id=`6a2bb0e39902c5843cb844da`), que é o correto. O duplicado não foi afetado.

### 3.8 Nenhum AnimeEntry foi alterado
| Métrica | Antes | Depois | Delta | Status |
|---------|-------|--------|-------|--------|
| AnimeEntry | 102 | 102 | 0 | ✅ |

### 3.9 Nenhum dado visual foi alterado
| Campo | Alterado? | Status |
|-------|-----------|--------|
| score | ❌ Não | ✅ |
| poster (franchise_poster_url) | ❌ Não | ✅ |
| banner | ❌ Não | ✅ |
| popularity | ❌ Não | ✅ |
| trending | ❌ Não | ✅ |
| synopsis | ❌ Não | ✅ |
| title | ❌ Não | ✅ |

### 3.10 Nenhum SyncConflict real foi criado
| Métrica | Antes | Depois | Delta | Status |
|---------|-------|--------|-------|--------|
| SyncConflict | 0 | 0 | 0 | ✅ |

---

## 4. Estado do Banco Após Fase 3B-2

| Entidade | Antes (Fase 3B-1) | Depois (Fase 3B-2) | Delta |
|----------|-------------------|---------------------|-------|
| DynamicWork | 797 | 797 | 0 |
| ExternalMapping | 221 | **225** | **+4** |
| ExternalMapping mal | 212 | **214** | **+2** |
| ExternalMapping anilist | 9 | **11** | **+2** |
| WorkRelease | 212 | 212 | 0 |
| SyncConflict | 0 | 0 | 0 |
| AnimeEntry | 102 | 102 | 0 |

---

## 5. Regras Obedecidas

| # | Regra | Status |
|---|-------|--------|
| 1 | Trabalhar somente em Death Note e One Piece | ✅ |
| 2 | Não criar WorkRelease | ✅ 0 criados |
| 3 | Não criar DynamicWork | ✅ 0 criados |
| 4 | Não criar SyncConflict real | ✅ 0 criados |
| 5 | Não alterar AnimeEntry | ✅ 0 alterados |
| 6 | Não alterar progresso de usuário | ✅ 0 alterados |
| 7 | Não alterar frontend | ✅ 0 arquivos alterados |
| 8 | Não atualizar score, poster, banner, popularity, trending, synopsis ou title | ✅ 0 atualizados |
| 9 | Não usar fuzzy matching | ✅ Não usado |
| 10 | Não usar LLM | ✅ Não usado |
| 11 | Não criar SyncQueue | ✅ 0 criados |
| 12 | Não integrar TheTVDB | ✅ Não integrado |
| 13 | Não importar relations missing | ✅ Nenhum importado |
| 14 | Não importar Bleach TYBW ainda | ✅ Não importado |

---

## 6. Método de Criação

### Estratégia
1. Localizar DynamicWork canônico via `filter({ slug, mal_id })` — garante que encontramos o registro correto mesmo com slugs duplicados
2. Validar que não existem mappings prévios (upsert check)
3. Criar ExternalMapping `provider=mal` com `verified_by_admin=true` (criação manual pelo admin)
4. Criar ExternalMapping `provider=anilist` com mesmo `work_group_id` e `verified_by_admin=true`
5. Ambos com `work_release_id=null` (ainda não existe WorkRelease para essas obras)

### Diferencial vs Fase 3B-1
- **Fase 3B-1:** `verified_by_admin=false` (match automático via idMal do AniList)
- **Fase 3B-2:** `verified_by_admin=true` (criação manual pelo admin, sem WorkRelease vinculado)

### Regra de ID
Para Death Note e One Piece, AniList ID = MAL ID (1535=1535, 21=21). Por coincidência, os IDs são iguais nessas duas obras. O `provider_id` do mapping anilist é o AniList ID, que neste caso coincide com o MAL ID.

---

## 7. Critério de Aceitação

> "Death Note e One Piece passam a ter mappings externos confiáveis para MAL e AniList, sem criar releases ainda e sem alterar a experiência visual do app."

### Status: ✅ APROVADO

| Critério | Status | Evidência |
|----------|--------|-----------|
| Death Note tem mapping mal e anilist | ✅ | 2 mappings criados |
| One Piece tem mapping mal e anilist | ✅ | 2 mappings criados |
| 0 duplicatas | ✅ | 225 chaves únicas |
| Mappings apontam para DynamicWork correto | ✅ | 4/4 validados |
| work_release_id permanece null | ✅ | 4/4 null |
| Nenhum WorkRelease criado | ✅ | 212 → 212 |
| Nenhum DynamicWork alterado | ✅ | 797 → 797, scores intactos |
| Nenhum AnimeEntry alterado | ✅ | 102 → 102 |
| Nenhum dado visual alterado | ✅ | Scores e posters intactos |
| Nenhum SyncConflict criado | ✅ | 0 → 0 |

---

## 8. Conclusão

**Fase 3B-2 executada com sucesso.** Death Note e One Piece agora possuem ExternalMapping `provider=mal` e `provider=anilist`, apontando para seus DynamicWork canônicos. Ambos com `work_release_id=null` (sem WorkRelease vinculado ainda) e `verified_by_admin=true` (criação manual confirmada).

**Estado do banco após Fase 3B-2:**
- 797 DynamicWork (inalterado)
- 225 ExternalMapping (214 mal + 11 anilist)
- 212 WorkRelease (inalterado)
- 0 SyncConflict (inalterado)
- 102 AnimeEntry (inalterado)

**Próximos passos sugeridos:**
- Fase 3B-3: Criar WorkRelease para Death Note e One Piece (quando apropriado) e atualizar `work_release_id` nos mappings
- Fase 3B-4: Upsert controlado de dados visuais (score, poster) com threshold e política de merge para as 11 obras mapeadas
- Fase 3B-5: Importar relations missing (filmes/OVAs/ONA, incluindo Bleach TYBW) como WorkReleases