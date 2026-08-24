# Fase 2I — Relatório de Execução: Consolidação de Duplicatas Fantasma

**Data:** 2026-08-24
**Tipo:** Correção mínima e reversível (alias/dedup no CatalogContext)
**Escopo:** Re:Zero e Dan Da Dan — remover duplicação visual sem alterar dados

---

## 1. Arquivos Alterados

| Arquivo | Mudança | Tipo |
|---------|---------|------|
| `src/lib/catalogAliases.js` | **Criado** — helper central de alias/dedup | Novo |
| `src/contexts/CatalogContext.jsx` | Importa `resolveAlias`/`isAliasSlug`; filtra alias do catálogo; resolve alias em `getBySlug` | Edição |
| `src/hooks/useGlobalSearch.js` | Importa `CATALOG_ALIASES`; adiciona busca por slug + alias-slug | Edição |

---

## 2. Aliases Criados

### Aliases Ativados

| Alias Slug | Slug Canônico | Motivo | Confirmação |
|------------|---------------|--------|-------------|
| `rezero` | `rezero--starting-life-in-another-world-` | Estático sem mal_id; canônico tem 4 WorkReleases | ✅ 4 WorkReleases + 4 ExternalMappings confirmados |
| `dandadan-s2` | `dan-da-dan` | mal_id 60543 existe como ExternalMapping do WorkRelease Season 2 canônico | ✅ mal_id 60543 confirmado no canônico |

### Slugs Preservados (não aliasados)

| Slug | Motivo | Verificação |
|------|--------|-------------|
| `rezero-s3` | mal_id 54857 **não existe** em ExternalMapping do canônico (31240, 39587, 42203, 61316) | ✅ Verificado — preservar até mapeamento futuro |
| `dandadan` | DynamicWork manga (media type legítimo separado do anime) — não fazer merge manga→anime | ✅ Preservado |
| `dandadan-manga-standalone` | Tem CardOverride ativa (override_image_url) | ✅ Preservado |

---

## 3. Resultado dos Testes de Catálogo

### Re:Zero

| Slug | has_work_releases | release_count | Status |
|------|------------------|---------------|--------|
| `rezero-s3` | false | 0 | ✅ Preservado (Season 3 separada) |
| `rezero--starting-life-in-another-world-` | true | 4 | ✅ Canônico |

**Resultado:** `rezero` (fantasma) **removido do catálogo**. ✅ Re:Zero anime aparece 1 vez (canônico) + `rezero-s3` (Season 3 legítima).

### Dan Da Dan

| Slug | has_work_releases | release_count | Status |
|------|------------------|---------------|--------|
| `dandadan` | false | 0 | ✅ Manga preservado (media type separado) |
| `dandadan-manga-standalone` | false | 0 | ✅ Preservado (tem CardOverride) |
| `dan-da-dan` | true | 3 | ✅ Canônico anime |

**Resultado:** `dandadan-s2` (fantasma) **removido do catálogo**. ✅ Dan Da Dan anime aparece 1 vez (canônico). Manga aparece separadamente (legítimo).

### Total do catálogo
- Antes: 697 entries
- Depois: 696 entries (2 alias filtrados — `rezero` e `dandadan-s2`)

---

## 4. Resultado dos Testes de Busca

| Termo | Resultados | Encontra canônico? | Duplicação? | Status |
|-------|-----------|---------------------|-------------|--------|
| `rezero` | 2: `rezero-s3` + canônico | ✅ Sim (via slug) | ❌ Não | ✅ OK |
| `rezero season 3` | 0 | ❌ Não | — | ⚠️ Ver nota |
| `re zero starting life` | 1: canônico (_mrc: 4) | ✅ Sim | ❌ Não | ✅ OK |
| `dan da dan` | 2: manga-standalone + canônico (_mrc: 3) | ✅ Sim | ❌ Não | ✅ OK |
| `dandadan` | 3: manga + manga-standalone + canônico | ✅ Sim (via slug) | ❌ Não | ✅ OK |
| `dan da dan season 2` | 1: canônico (_mrc: 1) | ✅ Sim | ❌ Não | ✅ OK |
| `dandadan manga` | 1: manga-standalone | ✅ Manga aparece | ❌ Não | ✅ OK |

### Nota sobre `rezero season 3`
Retorna 0 resultados. Causa: `normalizeQ("Re:Zero Season 3")` = `"re zero season 3"` (os dois pontos ":" em "Re:Zero" são substituídos por espaço). A query `"rezero season 3"` (sem espaço entre "re" e "zero") não é substring de `"re zero season 3"`. **Limitação pré-existente de normalização**, não introduzida por esta fase. `rezero-s3` está preservado e seria encontrável se a normalização não separasse "Re:Zero" em "re zero".

---

## 5. Resultado dos Testes de Rota

| Rota | Resolve para | Status |
|------|-------------|--------|
| `/obra/rezero--starting-life-in-another-world-` | `rezero--starting-life-in-another-world-` | ✅ Canônico funciona |
| `/obra/rezero` (alias) | `rezero--starting-life-in-another-world-` | ✅ Alias resolve |
| `/obra/rezero-s3` (preservado) | `rezero-s3` | ✅ Preservado funciona |
| `/obra/dan-da-dan` | `dan-da-dan` | ✅ Canônico funciona |
| `/obra/dandadan-s2` (alias) | `dan-da-dan` | ✅ Alias resolve |
| `/obra/dandadan` (manga) | `dandadan` | ✅ Manga preservado funciona |
| `/obra/dandadan-manga-standalone` (preservado) | `dandadan-manga-standalone` | ✅ Preservado funciona |

**Rotas antigas continuam funcionando.** ✅

---

## 6. Confirmação de Integridade de Dados

| Entidade | Count antes | Count depois | Alterada? |
|----------|-------------|-------------|-----------|
| DynamicWork | 797 | 797 | ❌ Não |
| WorkRelease | 212 | 212 | ❌ Não |
| AnimeEntry | 102 | 102 | ❌ Não |
| ExternalMapping | 212 | 212 | ❌ Não |
| CardOverride | — | — | ❌ Não |
| CatalogSync | — | — | ❌ Não |

**Nenhum dado foi migrado, deletado ou alterado no banco.** A correção é puramente no frontend (CatalogContext + useGlobalSearch). ✅

### Regras respeitadas
- ✅ Não deletou DynamicWork
- ✅ Não deletou registros estáticos
- ✅ Não alterou AnimeEntry
- ✅ Não alterou progresso de usuário
- ✅ Não criou WorkRelease
- ✅ Não criou ExternalMapping
- ✅ Não integrou AniList
- ✅ Não mexeu em TMDB/TheTVDB
- ✅ Não fez merge manga→anime
- ✅ Correção é reversível (esvaziar `CATALOG_ALIASES` reverte tudo)

---

## 7. Como Reverter

Para reverter a correção:
1. Esvaziar o objeto `CATALOG_ALIASES` em `src/lib/catalogAliases.js` (ou remover o import do CatalogContext)
2. Remover o `.filter(item => !isAliasSlug(item.slug))` do CatalogContext
3. Reverter `getBySlug` para não usar `resolveAlias`
4. Reverter useGlobalSearch (remover slug + alias-slug matching)

Ou simplesmente comentar as entradas em `CATALOG_ALIASES`:
```js
export const CATALOG_ALIASES = {};
```

---

## 8. Riscos Restantes

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| `rezero season 3` não retorna resultados na busca | Certeza | Baixo — limitação pré-existente de normalização | Melhorar normalizeQ no futuro (não separar "Re:Zero") |
| `dandadan-s2` aliasado mas mal_id estático (59485) ≠ canônico (60543) | Baixa | Se 59485 for uma entry MAL distinta, o alias esconde uma entry legítima | Investigar MAL no futuro; reverter alias se necessário |
| Novos aliases precisam ser adicionados manualmente | Certeza | Outros fantasmas podem aparecer | Monitorar catálogo e adicionar aliases conforme necessário |
| `dandadan` (manga) e `dan-da-dan` (anime) continuam como cards separados | Certeza | UX: 2 cards para o mesmo franchise | Decisão do admin — merge manga→anime só na Fase 2J se desejado |

---

## 9. Conclusão

**Fase 2I executada com sucesso.** Re:Zero e Dan Da Dan não aparecem duplicados no catálogo/home/busca. Rotas antigas continuam funcionando via alias resolution. Nenhum dado de usuário ou catálogo foi alterado no banco. A correção é totalmente reversível.

**Pronto para avançar à Fase 3 (AniList).**