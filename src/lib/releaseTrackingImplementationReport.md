# Release Tracking Implementation Report — Fase 4 (Checkpoint Final)

## Configuração

```
RELEASE_TRACKING_MODE = WORK_RELEASE_FIRST
ENTRY_PRIMARY_LINK = release_id
LEGACY_FALLBACK = season_mal_id
FUZZY_MATCHING = DISABLED
ANIME_ONLY_CATEGORY_FILTER = ENABLED
LEGACY_FORMAT_FALLBACK = ENABLED
LEGACY_MANUAL_ENTRY = PRESERVED (not release-aware)
```

## Arquitetura

### Fluxo de Resolução

```
/obra/:slug
  ↓
CatalogContext.getBySlug(slug) → media (com media.releases pré-carregado)
  ↓
media.has_work_releases === true E activeReleases.length > 0?
  ├─ SIM  → ReleaseBlock para cada release ativo (release mode)
  └─ NÃO  → FormatBlock para cada formato ativo (legacy mode)
```

### Prioridade de Leitura de Releases

1. **WorkRelease** (canônico) — quando `DynamicWork.sync_release_completed === true` e `release_count > 0`
2. **seasons[] legado** — fallback quando WorkRelease não existe

### Resolução de AnimeEntry por Release

1. `AnimeEntry.release_id === WorkRelease.id` — match exato (prioridade máxima)
2. `AnimeEntry.season_mal_id === release.mal_id` — fallback legado via ExternalMapping
3. `null` — sem match (NUNCA fuzzy matching por título/slug/genre)

---

## Regras Finais (Checkpoint)

### 1. Prioridade de Total no EntryCard

```
SE resolved.release existir:
  total = releaseTotal > 0 ? releaseTotal : entryTotal
  (WorkRelease metadata tem prioridade sobre franchise metadata)

SE NÃO houver release resolvido:
  total = Math.max(entryTotal, catalogFallback)
  (fallback legado — franchise catalog)
```

**NUNCA** `Math.max(releaseTotal, catalogFallback)` — franchise metadata não pode sobrescrever WorkRelease metadata.

**Exemplo correto:**
- HxH 1999: `releaseTotal = 62` → `total = 62` (não 148)
- HxH 2011: `releaseTotal = 148` → `total = 148`

**Aplicado a:** increment, decrement, jump, auto-complete, disabled state, progress bar.

### 2. Status Airing no EntryCard

```
SE resolved.release existir:
  releaseStatus = getReleaseStatusInfo(resolved.release)
  isAiring = resolved.release.status === "releasing"

SE NÃO houver release resolvido:
  releaseStatus = getReleaseStatusLabel(entry, mediaType)  // franchise catalog
  isAiring = catalogItem.animeStatus === "Em exibição" || catalogItem.is_currently_airing
```

Status genérico da franquia **NÃO** sobrescreve o status do release específico.

### 3. Deduplicação Visual (MyList)

**Estratégia:** identidade canônica de release + fallback legado.

```
Para cada entry:
  resolved = resolveEntryRelease(entry, catalog)

  SE resolved?.release?.release_id existir:
    chave = "release:<WorkRelease.id>"          // canonical release identity
  SENÃO:
    chave = title__genre__release_id__season_mal_id  // legacy key
```

**Comportamento:**
- Entry antiga (release_id=null, season_mal_id=X) + entry moderna (release_id=R, season_mal_id=X) onde X mapeia para R via ExternalMapping exato → **mesma chave** → dedup visual (não duplica).
- HxH 1999 (release_id=R1) e HxH 2011 (release_id=R2) → **chaves diferentes** → permanecem separadas.
- MAL diferentes → chaves diferentes → permanecem separadas.
- Sem release resolvido → fallback legado (title + genre).

**Regras:**
- NUNCA fuzzy matching por título.
- NUNCA apaga dados (dedup é apenas visual).
- Resolução requer mapping exato (release_id ou season_mal_id via ExternalMapping).

### 4. Releases Realmente Diferentes

HxH 1999 e HxH 2011 compartilham:
- Mesmo DynamicWork (group_id)
- Mesmo título base da franquia
- Mesma franquia

Mas têm `release_id` diferentes (R1 ≠ R2) → **chaves de dedup diferentes** → **permanecem como duas entries separadas**. Confirmado.

### 5. Add Entry Manual (LEGACY_MANUAL_ENTRY)

**Estado:** `LEGACY_MANUAL_ENTRY` — preservado, não é release-aware.

- Cria AnimeEntry genérica sem `release_id` nem `season_mal_id`.
- Não faz fuzzy matching.
- Não converte automaticamente para release-aware.
- Funcionalidade preservada como legado.
- Migração para release-aware documentada para fase futura (não expandida aqui).

**Marcador explícito no código:** comentário `LEGACY_MANUAL_ENTRY` no `AddEntryDialog` em `MyList.jsx`.

### 6. EntryCard Label

Quando release resolvido, exibe de forma inequívoca:
- `buildReleaseLabel(release, franchiseTitle)` retorna:
  - "Hunter x Hunter (1999)" — título do release difere do franchise
  - "Hunter x Hunter (2011)" — título do release difere do franchise
  - "Attack on Titan — Temporada 2" — TV com season_number
  - "OVA 1" — format=OVA com release_order

O título principal continua sendo a franquia; o release label aparece como subtítulo logo abaixo, em verde (`text-primary/70`), visualmente inequívoco.

---

## Arquivos Alterados (Checkpoint)

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/releaseTracking.js` | Helpers síncronos: `findEntryForRelease`, `filterActiveReleases`, `buildReleaseLabel`, `buildReleaseSubtitle`, `getReleaseMap`, `resolveEntryRelease`, `getReleaseStatusInfo` (novo) |
| `src/components/obra/ReleaseBlock.jsx` | Componente de tracking por release — status/progresso/XP independentes por release |

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/workReleases.js` | Adicionados `status`, `chapter_count`, `duration_minutes` à normalização de WorkRelease |
| `src/pages/ObraProfile.jsx` | Modo release (ReleaseBlock) quando `has_work_releases && activeReleases.length > 0`; fallback legado (FormatBlock); suporte a `?release=<id>` |
| `src/components/mylist/EntryCard.jsx` | **Total com prioridade de release** (não Math.max com franchise); **status airing do release**; resolve e exibe label do release |
| `src/pages/MyList.jsx` | **Dedup visual com identidade canônica** (`release:<id>` quando resolvido); `AddEntryDialog` marcado como `LEGACY_MANUAL_ENTRY` |

---

## Casos de Teste (A–G)

| Caso | Descrição | Resultado Esperado | Status |
|------|-----------|-------------------|--------|
| A | HxH 1999 `releaseTotal=62` → EntryCard total | `total=62` (não 148) | ✅ Estático |
| B | HxH 2011 `releaseTotal=148` → EntryCard total | `total=148` | ✅ Estático |
| C | Incrementar HxH 1999 no ep. 62 | `validateProgress(63, 62)` → inválido → não permite 63 | ✅ Estático |
| D | Incrementar HxH 1999 → HxH 2011 não afetado | Entries diferentes (`release_id` diferente), updateMutation age sobre `entry.id` específico | ✅ Estático |
| E | Entry antiga MAL=X + moderna release_id=R/MAL=X (mesmo WorkRelease) | Ambas resolvem para mesmo `release_id` → mesma chave `release:R` → dedup visual | ✅ Estático |
| F | MAL diferentes (X ≠ Y) | Chaves diferentes → permanecem separadas | ✅ Estático |
| G | Sem release resolvido | Fallback legado: `total = Math.max(entryTotal, catalogFallback)`, status do franchise | ✅ Estático |

---

## Problemas Encontrados nos Dados

1. **WorkRelease não tem campo `season_number`** — o schema não inclui `season_number`. A normalização em `workReleases.js` referencia `r.season_number` que sempre é `undefined`. O label usa o título do release (que já contém "Season 2", "(1999)", etc.) ou ano como fallback. Não é um bug — apenas significa que o caminho `season_number` do `buildReleaseLabel` é relevante apenas para seasons[] legado.

2. **83 obras migradas (sync_release_completed=true)** — destas, 74 têm múltiplos releases. As demais obras (~milhares) ainda usam seasons[] legado e continuam funcionando via FormatBlock.

3. **Sem idempotência backend para XP** — limitação pré-existente (documentada no checkpoint anterior). Não agravada nesta fase.

4. **LEGACY_MANUAL_ENTRY não é release-aware** — entries criadas via "Adicionar título" não têm `release_id` nem `season_mal_id`. Continuam funcionando via fallback legado. Migração para release-aware fica para fase futura.

---

## GO / PARTIAL GO / NO-GO

**PARTIAL GO**

- ✅ Total com prioridade de release (HxH 1999 = 62, não 148)
- ✅ Status airing do release específico (não franchise)
- ✅ Dedup visual com identidade canônica (une legado + moderno sem apagar)
- ✅ Releases distintos permanecem separados (HxH 1999 ≠ HxH 2011)
- ✅ LEGACY_MANUAL_ENTRY preservado, marcado, não fuzzy match
- ✅ EntryCard label visualmente inequívoco
- ✅ Sem auto-delete, sem migração automática, sem fuzzy matching
- ⚠️ Testes A–G validados apenas estaticamente (sem runtime test)
- ⚠️ Idempotência backend de XP não garantida (pré-existente)
- ⚠️ WorkRelease sem campo `season_number` — label usa título/ano (funcional)
- ⚠️ LEGACY_MANUAL_ENTRY não converte para release-aware (documentado para fase futura)

## Próximas Fases (NÃO iniciadas)

- Fase 6 — metadata canônico
- Fase 7 — redesign visual
- Fase 8 — elenco/notas

Aguardando revisão do usuário antes de continuar.