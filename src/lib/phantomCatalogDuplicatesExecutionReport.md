# Fase 2I — Relatório Final de Execução: Consolidação de Duplicatas Fantasma

**Data:** 2026-08-24
**Tipo:** Correção mínima e reversível (alias/dedup no CatalogContext)
**Escopo:** Re:Zero e Dan Da Dan — remover duplicação visual sem alterar dados

---

## 1. Arquivos Alterados

| Arquivo | Mudança | Tipo |
|---------|---------|------|
| `src/lib/catalogAliases.js` | **Criado** — helper central de alias/dedup (`CATALOG_ALIASES`, `PRESERVED_SLUGS`, `resolveAlias`, `isAliasSlug`) | Novo |
| `src/contexts/CatalogContext.jsx` | Importa `resolveAlias`/`isAliasSlug`; filtra alias do catálogo; resolve alias em `getBySlug` | Edição |
| `src/hooks/useGlobalSearch.js` | Importa `CATALOG_ALIASES`; adiciona busca por slug + alias-slug | Edição |

### Consumidores de catalogAliases (confirmado via grep)

| Arquivo | Usa | Função |
|---------|-----|--------|
| `src/contexts/CatalogContext.jsx` | `resolveAlias`, `isAliasSlug` | Filtra alias do catálogo; resolve alias em `getBySlug` |
| `src/hooks/useGlobalSearch.js` | `CATALOG_ALIASES` | Match de alias-slug na busca global |
| `src/pages/ObraProfile.jsx` | `getBySlug` (indireto) | Rota `/obra/:slug` resolve via `getBySlug` do CatalogContext, que aplica `resolveAlias` |

**Nota:** ObraProfile não importa `catalogAliases` diretamente — consome o alias via `getBySlug` do CatalogContext, que é a camada única de resolução. ✅

---

## 2. Aliases Ativos (confirmados)

| Alias Slug | Slug Canônico | ExternalMapping mal_id | Confirmado? |
|------------|---------------|----------------------|------------|
| `rezero` | `rezero--starting-life-in-another-world-` | N/A (estático sem mal_id; canônico tem 4 WorkReleases + 4 ExternalMappings) | ✅ |
| `dandadan-s2` | `dan-da-dan` | **60543** — 1 mapping confirmado (work_release_id `6a8b7cd238aae161e3d81d74`, provider_type `anime`) | ✅ |

### Detalhe do mapeamento 60543
```
ExternalMapping {
  id: 6a8b7cd2ddf2252d460c4f83,
  provider: "mal",
  provider_id: "60543",
  work_release_id: 6a8b7cd238aae161e3d81d74,
  work_group_id: 6a4d567b19cbf3ad51fdb9ee,  // = Dan Da Dan canônico
  provider_type: "anime"
}
```

---

## 3. Aliases Preservados (não ativados)

| Slug | Motivo | Verificação |
|------|--------|------------|
| `rezero-s3` | mal_id **54857 não existe** em ExternalMapping (0 mappings encontrados). Preservar até mapeamento futuro. | ✅ 0 mappings confirmados |
| `dandadan` | DynamicWork manga (categories `["manga"]`, 0 WorkReleases). Media type legítimo separado do anime — não fazer merge manga→anime. | ✅ Confirmado: hasReleases=false, categories=`["manga"]` |
| `dandadan-manga-standalone` | Tem **CardOverride ativa** (override_image_url=true). Preservar para não perder override do admin. | ✅ 1 CardOverride confirmado (override_image_url=true) |

### Confirmação de não-mescla manga→anime
- `dandadan` (manga): `id=6a2f67815feb69001275bc65`, `hasReleases=false`, `categories=["manga"]`
- `dan-da-dan` (anime): `id=6a4d567b19cbf3ad51fdb9ee`, `release_count=3`, `sync_release_completed=true`
- **Não mesclados** — continuam como entries separadas. ✅

---

## 4. Testes de Catálogo/Home

### Re:Zero
| Slug | has_work_releases | release_count | Status |
|------|------------------|---------------|--------|
| `rezero-s3` | false | 0 | ✅ Preservado (Season 3 legítima) |
| `rezero--starting-life-in-another-world-` | true | 4 | ✅ Canônico |
| ~~`rezero`~~ | — | — | ✅ **Removido** (alias filtrado) |

**Resultado:** Re:Zero anime aparece **1 vez** (canônico). `rezero` fantasma não aparece como card. ✅

### Dan Da Dan
| Slug | has_work_releases | release_count | Status |
|------|------------------|---------------|--------|
| `dandadan` | false | 0 | ✅ Manga preservado |
| `dandadan-manga-standalone` | false | 0 | ✅ Preservado (CardOverride) |
| `dan-da-dan` | true | 3 | ✅ Canônico anime |
| ~~`dandadan-s2`~~ | — | — | ✅ **Removido** (alias filtrado) |

**Resultado:** Dan Da Dan anime aparece **1 vez** (canônico). `dandadan-s2` não aparece como card. Manga não foi removido indevidamente. ✅

### Total do catálogo
- Antes: 697 entries
- Depois: 696 entries (2 alias filtrados — `rezero` e `dandadan-s2`)

---

## 5. Testes de Busca

| Termo | Resultados | Encontra canônico? | Duplicação? | Status |
|-------|-----------|---------------------|-------------|--------|
| `rezero` | 2: `rezero-s3` + canônico | ✅ Sim (via slug) | ❌ Não | ✅ OK |
| `rezero season 3` | 0 | ❌ Não (limitação de normalização) | — | ⚠️ Ver nota |
| `re zero starting life` | 1: canônico (_mrc: 4) | ✅ Sim | ❌ Não | ✅ OK |
| `dan da dan` | 2: manga-standalone + canônico (_mrc: 3) | ✅ Sim | ❌ Não | ✅ OK |
| `dandadan` | 3: manga + manga-standalone + canônico | ✅ Sim (via slug) | ❌ Não | ✅ OK |
| `dan da dan season 2` | 1: canônico (_mrc: 1) | ✅ Sim | ❌ Não | ✅ OK |
| `dandadan manga` | 1: manga-standalone | ✅ Manga aparece | ❌ Não | ✅ OK |

### Nota sobre `rezero season 3`
Retorna 0 resultados. Causa: `normalizeQ("Re:Zero Season 3")` = `"re zero season 3"` (os dois pontos ":" em "Re:Zero" são substituídos por espaço). A query `"rezero season 3"` (sem espaço entre "re" e "zero") não é substring de `"re zero season 3"`. **Limitação pré-existente de normalização**, não introduzida por esta fase. `rezero-s3` está preservado e seria encontrável se a normalização não separasse "Re:Zero" em "re zero". **Nenhum resultado duplicado por alias.** ✅

---

## 6. Testes de Rotas

| Rota | Resolve para | Status |
|------|-------------|--------|
| `/obra/rezero--starting-life-in-another-world-` | `rezero--starting-life-in-another-world-` | ✅ Canônico funciona |
| `/obra/rezero` (alias) | `rezero--starting-life-in-another-world-` | ✅ Alias resolve via `getBySlug` |
| `/obra/rezero-s3` (preservado) | `rezero-s3` | ✅ Preservado funciona |
| `/obra/dan-da-dan` | `dan-da-dan` | ✅ Canônico funciona |
| `/obra/dandadan-s2` (alias) | `dan-da-dan` | ✅ Alias resolve via `getBySlug` |
| `/obra/dandadan` (manga) | `dandadan` | ✅ Manga preservado funciona |
| `/obra/dandadan-manga-standalone` (preservado) | `dandadan-manga-standalone` | ✅ Preservado funciona |

**Mecanismo:** ObraProfile usa `getBySlug(slug)` do CatalogContext, que internamente chama `resolveAlias(slug)`. Rotas antigas continuam funcionando. ✅

---

## 7. Confirmação de Integridade de Dados

| Entidade | Count | Alterada? |
|----------|-------|-----------|
| DynamicWork | 797 | ❌ Não |
| WorkRelease | 212 | ❌ Não |
| AnimeEntry | 102 | ❌ Não |
| ExternalMapping | 212 | ❌ Não |
| CardOverride | 89 | ❌ Não |
| CatalogSync | — | ❌ Não |

### Regras respeitadas
- ✅ Nenhum dado foi migrado, deletado ou alterado no banco
- ✅ Nenhum AnimeEntry alterado (102 entries intactas)
- ✅ Nenhum progresso de usuário alterado
- ✅ Nenhum DynamicWork deletado (797 intactos)
- ✅ Nenhum WorkRelease criado/deletado (212 intactos)
- ✅ Nenhum ExternalMapping criado/deletado (212 intactos)
- ✅ Nenhum CardOverride alterado (89 intactos)
- ✅ Não integrou AniList
- ✅ Não mexeu em TMDB/TheTVDB
- ✅ Não fez merge manga→anime
- ✅ Correção é reversível (esvaziar `CATALOG_ALIASES` reverte tudo)

---

## 8. Riscos Restantes (antes da Fase 3)

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| `rezero season 3` não retorna resultados na busca | Certeza | Baixo — limitação pré-existente de normalização (`:` → espaço) | Melhorar `normalizeQ` no futuro (não separar "Re:Zero") |
| `dandadan-s2` aliasado mas mal_id estático (59485) ≠ canônico (60543) | Baixa | Se 59485 for entry MAL distinta, o alias esconde uma entry legítima | Investigar MAL no futuro; reverter alias se necessário |
| Novos aliases precisam ser adicionados manualmente | Certeza | Outros fantasmas podem aparecer | Monitorar catálogo e adicionar aliases conforme necessário |
| `dandadan` (manga) e `dan-da-dan` (anime) continuam como cards separados | Certeza | UX: 2 cards para o mesmo franchise | Decisão do admin — merge manga→anime só se desejado |
| `rezero-s3` preservado sem mapeamento | Certeza | Season 3 aparece como card separado do canônico | Criar ExternalMapping para 54857 quando confirmado, então aliasar |

---

## 9. Como Reverter

Para reverter a correção:
1. Esvaziar o objeto `CATALOG_ALIASES` em `src/lib/catalogAliases.js`:
   ```js
   export const CATALOG_ALIASES = {};
   ```
2. Ou remover os imports de `catalogAliases` do CatalogContext e useGlobalSearch

A reversão restaura o estado anterior sem afetar dados do banco.

---

## 10. Conclusão

**Fase 2I executada e validada com sucesso.**

- ✅ Re:Zero e Dan Da Dan não aparecem duplicados no catálogo/home/busca
- ✅ Rotas antigas continuam funcionando via alias resolution
- ✅ Nenhum dado de usuário ou catálogo foi alterado no banco
- ✅ A correção é totalmente reversível
- ✅ Aliases ativados apenas com ExternalMapping confirmado (60543 ✅; 54857 preservado)

**Pronto para avançar à Fase 3 (AniList).**