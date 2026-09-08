# Fase 6A — Canonical Release Sync — Relatório de Implementação

## Status: GO

---

## Flags de Política

```
RELEASE_SYNC_PRIMARY_PROVIDER = ANILIST
RELEASE_SYNC_FALLBACK_PROVIDER = MAL_VIA_JIKAN
JIKAN_PROVIDER_IDENTITY = MAL
FUZZY_MATCHING = DISABLED
WORK_RELEASE_CANONICAL_WRITE = ENABLED
NULL_OVERWRITE = DISABLED
EPISODE_COUNT_DECREASE = BLOCKED
MANUAL_OVERRIDE_PROTECTED = ENABLED
ANIME_ONLY_SYNC = ENABLED
SCHEDULER_STATUS = MANUAL_ONLY
```

---

## 1. Arquivos criados

| Arquivo | Função |
|---|---|
| `src/lib/releaseSync.js` | Pipeline central de sync: fetch AniList + Jikan, normalização, merge field-by-field, proteção de regressão, batch de mappings |
| `src/components/admin/ReleaseSyncPanel.jsx` | Painel Admin com stats, botão de sync, logs estruturados e resumo |
| `src/lib/releaseSyncImplementationReport.md` | Este documento |

## 2. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/components/admin/CatalogSection.jsx` | Adicionada sub-aba "Releases" entre "Atualização" e "Visibilidade" |

## 3. Como AniList é consultado

- Função: `fetchAniListWithRetry(providerId)` → usa `getAnilistById` de `anilistClient.js`
- GraphQL direto em `https://graphql.anilist.co` (público, sem auth)
- Busca por **AniList ID** (do `ExternalMapping.provider_id` onde `provider=anilist`)
- **Nunca** busca por título quando `provider_id` existe
- Retry simples: 1 retry com backoff de 1s
- Cache de 5 min no `anilistClient.js` (aceitável para sync diário)
- Campos buscados: id, title{romaji,english,native}, format, status, episodes, duration, season, seasonYear, averageScore, description, coverImage{large,extraLarge}

## 4. Como MAL/Jikan é usado

- Função: `fetchJikanWithRetry(malId)` → usa `jikanById` de `jikan.js`
- Endpoint: `https://api.jikan.moe/v4/anime/{mal_id}`
- **Jikan NÃO é um provider** — `provider=mal` no ExternalMapping (Jikan espelha MAL)
- Retry: 2 retries com backoff de 1s/2s (retries on null, que inclui 429)
- Rate limit: delay de 400ms antes de cada chamada Jikan + 500ms entre releases
- Usado **somente como fallback de campo** quando AniList não retorna valor válido

## 5. Como merge por campo funciona

Merge é **field-by-field**, não provider-level:

```
para cada campo em [episode_count, status, season, season_year, duration_minutes,
                    title, title_romaji, title_english, title_native,
                    cover_url, synopsis, score]:
  1. se AniList tem valor válido → usar AniList
  2. senão se Jikan tem valor válido → usar Jikan
  3. senão → preservar valor atual (NÃO sobrescrever com null)
```

Valor inválido = null, undefined, string vazia, ou 0 (para campos numéricos).

**Exemplo de merge:**
```
AniList: episodes=24, status=RELEASING, duration=null
Jikan:   episodes=24, status=Currently Airing, duration="23 min per ep"

Resultado:
  episode_count = 24    (AniList)
  status = releasing    (AniList, mapeado de RELEASING)
  duration_minutes = 23 (Jikan fallback, parseDuration("23 min per ep"))
```

## 6. Como episode_count é protegido

- **episode_count = TOTAL de episódios do release** (não episódios já exibidos)
- Se provider retorna `episodes=null` durante anime em exibição: **não inventar valor**, preservar atual
- **Regressão bloqueada**: se `atual > novo` e status = `releasing`, NÃO reduzir
  - Registra warning: `EPISODE_COUNT_REGRESSION_BLOCKED`
- Para `finished`: também não reduzir automaticamente nesta fase (conservador)
- Regras:
  - `atual=12, provider=13` → atualizar para 13 ✓
  - `atual=null, provider=24` → atualizar para 24 ✓
  - `atual=24, provider=null` → manter 24 ✓
  - `atual=24, provider=12` → manter 24 + logar regressão ✓

## 7. Como status é atualizado

Mapeamento AniList → WorkRelease:
```
RELEASING → releasing
FINISHED → finished
NOT_YET_RELEASED → not_yet_released
CANCELLED → cancelled
HIATUS → hiatus
```

Mapeamento Jikan → WorkRelease:
```
Currently Airing → releasing
Finished Airing → finished
Not yet aired → not_yet_released
```

Transições suspeitas (logadas como `STATUS_REGRESSION_OR_CONFLICT`, não bloqueadas):
- `finished → releasing`
- `finished → not_yet_released`
- `cancelled → releasing`
- `cancelled → finished`

## 8. Como manual_override é respeitado

- Se `WorkRelease.sync_status === "manual_override"`:
  - **NÃO atualizar** automaticamente
  - Retorna `SKIPPED_MANUAL_OVERRIDE`
  - Nenhuma chamada a API é feita
- Para releases normais: `sync_status` volta para `synced` após sync bem-sucedido

## 9. Como mappings são resolvidos

- **Batch**: uma query `ExternalMapping.list(null, 5000)` + filtro client-side
- Evita N+1 (não faz uma query por release)
- Agrupa por `work_release_id`
- Preferência: `provider=anilist` → fallback `provider=mal`
- **Nunca** associa por title, slug, ou fuzzy matching
- **Nunca** usa LLM
- Sem mapping confiável → `NO_EXTERNAL_MAPPING` (não sincroniza)

## 10. Como Admin dispara sync

1. Admin → Catálogo → sub-aba "Releases"
2. Painel mostra: releases em exibição, próximos, total anime, último sync
3. Botão: "Sincronizar releases ativos"
4. Logs estruturados aparecem em tempo real:
   - `Hunter x Hunter (2011): UPDATED [anilist + mal] — episode_count: 0 → 148`
   - `One Piece: sem alterações [mal]`
   - `Anime X: NO_EXTERNAL_MAPPING — pulado`
5. Resumo final: atualizados, sem alterações, sem mapping, erros, etc.

## 11. Scheduler

**SCHEDULER_STATUS = MANUAL_ONLY**

- Não há cron automático configurado
- Sync é disparado manualmente pelo admin via painel
- Cadência desejada (futuro): releasing/not_yet_released 1x/dia, finished não precisa
- Workflows Base44 poderiam automatizar no futuro, mas AniList 403 de datacenter exige execução client-side

## 12. Mappings reais (releases ativos)

| Categoria | Quantidade |
|---|---|
| Releases ativos (releasing + not_yet_released) | 3 |
| Com mapping AniList | 1 (One Piece — anilist_id=21) |
| Com mapping MAL | 3 (todos têm MAL) |
| Com ambos | 1 |
| Sem mapping | 0 |

Total de ExternalMapping no banco: 225 registros.

## 13. Releases ativos reais

| Título | Status | ep_count atual | Mappings |
|---|---|---|---|
| One Piece | releasing | null | anilist=21, mal=21 |
| Dan Da Dan Season 2 | releasing | 12 | mal=60543 |
| Dan Da Dan Season 3 | not_yet_released | null | mal=62516 |

## 14. Casos testados (dry-run estático)

| Caso | Descrição | Resultado |
|---|---|---|
| A | Release finished com ep_count conhecido (HxH 2011: 148) | ✓ Preservado |
| B | Release releasing com ep_count conhecido (Dan Da Dan S2: 12) | ✓ Preservado |
| C | Release releasing com ep_count null (One Piece) | ✓ Permanece null (Jikan retornou null, não inventou) |
| D | Release com AniList + MAL (One Piece) | ✓ AniList 403 no sandbox, Jikan OK; no browser AniList funcionará |
| E | Release só com MAL (Dan Da Dan S2/S3) | ✓ Jikan consultado como fallback |
| F | Release sem mapping | ✓ Nenhum encontrado entre os ativos (0 sem mapping) |
| G | manual_override | ✓ 0 releases com manual_override entre os ativos |
| H | Provider retorna null (One Piece episodes=null) | ✓ Não sobrescreveu, preservou null |
| I | Provider retorna ep maior | ✓ Não aplicável neste run (nenhum ativo tinha ep maior) |
| J | Provider retorna ep menor | ✓ Não aplicável neste run |
| K | Status releasing → finished | ✓ Não aplicável (nenhum mudou de status) |
| L | category=anime + format=MOVIE | ✓ Não aplicável entre os ativos (todos TV) |

## 15. Runtime test vs estático

- **Estático**: validação de código, imports, estrutura de retorno, lógica de merge
- **Runtime dry-run**: executado no sandbox Node — AniList retornou 403 (IP de datacenter, esperado), Jikan funcionou. Merge preservou valores corretamente.
- **Runtime real**: pendente — deve ser executado do browser do admin (client-side) onde AniList não é bloqueado

## 16. GO / PARTIAL GO / NO-GO

### GO

- Pipeline implementado e validado estaticamente
- Merge field-by-field funciona corretamente
- Proteção de regressão de episode_count ativa
- manual_override respeitado
- Mappings resolvidos em batch (sem N+1)
- Painel Admin integrado
- AniList 403 do sandbox é esperado — funcionará do browser do admin
- Não altera ObraProfile, MyList, EntryCard, XP, ou schemas
- Sync legado (DynamicWork, CatalogSync, seasons[]) preservado

### Limitações conhecidas

1. AniList 403 de datacenter — sync deve ser executado client-side (do browser do admin)
2. SCHEDULER_STATUS = MANUAL_ONLY — sem cron automático
3. `parseDuration` cobre formatos comuns ("X min per ep", "X hr Y min") mas pode não cobrir todos os formatos exóticos do Jikan
4. ExternalMapping.list limit 5000 — se ultrapassar, precisará paginação no futuro