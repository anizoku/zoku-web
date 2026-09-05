# Auditoria de Integridade — AnimeEntry

**Data:** 2026-09-05
**Tipo:** Read-only (nenhuma escrita)
**Motivo:** Investigar inconsistência entre relatório da Fase 3B-4 ("102 todos release_id=null") e backfill anterior de 9 AnimeEntry

---

## ⚠️ Conclusão Principal

**Resposta: Alternativa A — O relatório da Fase 3B-4 continha um erro de afirmação.**

O relatório da Fase 3B-4 afirmou "AnimeEntry continua intacto (102, todos release_id=null)". Isso está **incorreto**. A auditoria confirma que **12 AnimeEntry têm release_id preenchido** e **90 têm release_id=null**.

**Os release_id previamente preenchidos NÃO foram removidos.** Eles continuam intactos desde o backfill de 2026-08-23. A Fase 3B-4 (executada em 2026-09-05) **não alterou nenhum AnimeEntry** — 0 entries foram atualizadas durante ou após a Fase 3B-4.

### O que aconteceu
O relatório da Fase 3B-4 validou corretamente que a Fase 3B-4 não alterou AnimeEntry, mas errou ao afirmar que "todos release_id=null". Na verdade, a validação verificou apenas que os **9 AnimeEntry de One Piece** tinham release_id=null (o que é correto — One Piece nunca foi backfilled), e generalizou incorretamente para todos os 102 entries.

---

## 1. Contagens Totais

| Métrica | Valor |
|---------|-------|
| Total de AnimeEntry | **102** |
| Com release_id != null | **12** |
| Com release_id = null | **90** |

---

## 2. AnimeEntry com release_id != null (12 registros)

| # | ID | Title | Type | season_mal_id | release_id | Status | current_episode | updated_date |
|---|-----|-------|------|---------------|------------|--------|-----------------|--------------|
| 1 | `6a329d487f80555f04f4b004` | Attack on Titan | anime | 25777 | `6a8b7281c22ab4a66c9395a4` | completed | 12 | 2026-08-23T22:56:09 |
| 2 | `6a329d41f5c8912c1741678a` | Attack on Titan | anime | 35760 | `6a8b7281c22ab4a66c9395a5` | completed | 12 | 2026-08-23T22:56:09 |
| 3 | `6a329d23fcc80f602a5f6437` | Attack on Titan | anime | 38524 | `6a8b7281c22ab4a66c9395a6` | completed | 10 | 2026-08-23T22:56:09 |
| 4 | `6a329d1a36006bb27008d213` | Attack on Titan | anime | 48583 | `6a8b7281c22ab4a66c9395a8` | completed | 12 | 2026-08-23T22:56:09 |
| 5 | `6a329d0c4e0d3fecca85006a` | Attack on Titan | anime | 51535 | `6a8b7281c22ab4a66c9395a9` | completed | 2 | 2026-08-23T22:56:09 |
| 6 | `6a329d03de3010f57e567429` | Attack on Titan | anime | 40028 | `6a8b7281c22ab4a66c9395a7` | completed | 16 | 2026-08-23T22:56:09 |
| 7 | `6a3170870b34cafb0e237eba` | Mushoku Tensei: Jobless Reincarnation | anime | 45576 | `6a8b7281c22ab4a66c9394f8` | completed | 12 | 2026-08-23T22:56:09 |
| 8 | `6a3170673ac4b2d54269ebe0` | Mashle: Magic and Muscles | anime | 55813 | `6a8b7281c22ab4a66c939509` | completed | 12 | 2026-08-23T22:56:09 |
| 9 | `6a2ba9c408af1541baf29032` | Hunter x Hunter | anime | 11061 | `6a8b7d29979c03340844a8b4` | completed | 148 | 2026-08-23T23:07:21 |
| 10 | `6a2b86e77db607fb06b40813` | Hunter x Hunter | anime | 11061 | `6a8b7d29979c03340844a8b4` | completed | 148 | 2026-08-23T23:07:21 |
| 11 | `6a2b85e39033c5656dda2d7e` | Hunter x Hunter | anime | 11061 | `6a8b7d29979c03340844a8b4` | watching | 30 | 2026-08-23T23:07:22 |
| 12 | `69f7fa56ca803a4580652215` | Dragon Ball | anime | 813 | `6a8b7281c22ab4a66c93952f` | completed | 291 | 2026-08-23T22:56:09 |

### Distribuição por obra
| Obra | Entries com release_id | season_mal_ids |
|------|----------------------|----------------|
| Attack on Titan | 6 | 25777, 35760, 38524, 48583, 51535, 40028 |
| Hunter x Hunter | 3 | 11061 (todos iguais — raiz) |
| Mushoku Tensei | 1 | 45576 |
| Mashle | 1 | 55813 |
| Dragon Ball | 1 | 813 |

---

## 3. Validação de Cada release_id Não-Nulo

| # | Entry | release_id | WorkRelease existe? | group_id existe? | MAL mapping existe? | season_mal_id → mesmo release? |
|---|-------|-----------|---------------------|------------------|--------------------|-----------------|
| 1 | Attack on Titan (25777) | `6a8b7281c22ab4a66c9395a4` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 2 | Attack on Titan (35760) | `6a8b7281c22ab4a66c9395a5` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 3 | Attack on Titan (38524) | `6a8b7281c22ab4a66c9395a6` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 4 | Attack on Titan (48583) | `6a8b7281c22ab4a66c9395a8` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 5 | Attack on Titan (51535) | `6a8b7281c22ab4a66c9395a9` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 6 | Attack on Titan (40028) | `6a8b7281c22ab4a66c9395a7` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 7 | Mushoku Tensei (45576) | `6a8b7281c22ab4a66c9394f8` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 8 | Mashle (55813) | `6a8b7281c22ab4a66c939509` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 9 | Hunter x Hunter (11061) | `6a8b7d29979c03340844a8b4` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 10 | Hunter x Hunter (11061) | `6a8b7d29979c03340844a8b4` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 11 | Hunter x Hunter (11061) | `6a8b7d29979c03340844a8b4` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| 12 | Dragon Ball (813) | `6a8b7281c22ab4a66c93952f` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |

**12/12 release_id validados com sucesso.** Todos apontam para WorkRelease existentes, com group_id válido, ExternalMapping mal correspondente, e season_mal_id que corresponde ao mesmo WorkRelease. ✅

---

## 4. Confirmação: Backfill Anterior Preservado

Todos os 12 entries com release_id foram atualizados em **2026-08-23** (datas de updated_date):
- 11 entries às 22:56:09 (Attack on Titan ×6, Mushoku ×1, Mashle ×1, Dragon Ball ×1)
- 3 entries de Hunter x Hunter às 23:07:21-22

**Estes são os entries backfilled na fase anterior (Fase 2F — backfill de AnimeEntry via season_mal_id → ExternalMapping mal → WorkRelease).** Todos permanecem intactos.

### O relatório da Fase 2F mencionava 9 entries backfilled
A Fase 2F documentou backfill de 9 entries. A auditoria encontra 12. A diferença (3 extras) corresponde aos 3 entries de Hunter x Hunter (3 usuários diferentes com o mesmo season_mal_id=11061). É possível que o relatório da Fase 2F tenha contado apenas entries únicos por season_mal_id (9 obras únicas) em vez de entries individuais (12 registros). Os 12 entries cobrem 9 season_mal_ids distintos:

| season_mal_id | Entries |
|---------------|---------|
| 25777 | 1 |
| 35760 | 1 |
| 38524 | 1 |
| 48583 | 1 |
| 51535 | 1 |
| 40028 | 1 |
| 45576 | 1 |
| 55813 | 1 |
| 11061 | 3 |
| 813 | 1 |
| **Total** | **12 entries, 10 season_mal_ids únicos** |

---

## 5. Impacto da Fase 3B-4 sobre AnimeEntry

| Validação | Resultado | Status |
|-----------|-----------|--------|
| Entries atualizadas durante ou após 2026-09-05 (data da Fase 3B-4) | **0** | ✅ |
| Fase 3B-4 alterou algum AnimeEntry? | **Não** | ✅ |

**A Fase 3B-4 não tocou nenhum AnimeEntry.** Todos os updated_date são de 2026-08-23 ou anterior. Nenhum entry foi modificado em ou após 2026-09-05.

---

## 6. Análise Detalhada — One Piece (9 entries)

### Distribuição por type
| Type | Quantidade |
|------|-----------|
| anime | 5 |
| manga | 2 |
| liveaction | 2 |
| **Total** | **9** |

### Distribuição por status
| Status | Quantidade |
|--------|-----------|
| completed | 5 |
| watching | 2 |
| reading | 2 |
| **Total** | **9** |

### Detalhamento completo

| # | ID | Type | Status | season_mal_id | release_id | current_episode | current_chapter | updated_date |
|---|-----|------|--------|---------------|------------|-----------------|-----------------|--------------|
| 1 | `6a2c0aa74cc373431d83c30f` | **liveaction** | completed | null | null | 2 | 0 | 2026-06-12 |
| 2 | `6a2c0aa45825ba62ab9ac4bb` | anime | completed | null | null | 1 | 0 | 2026-06-12 |
| 3 | `6a2c0a9c85382b2b2fbb6d11` | anime | completed | null | null | 1 | 0 | 2026-06-12 |
| 4 | `69fa04366acca087d4f00a10` | **liveaction** | watching | null | null | 0 | 0 | 2026-05-05 |
| 5 | `69f89f820ba669af6d16ffe9` | anime | watching | null | null | 90 | 0 | 2026-05-04 |
| 6 | `69f7d8ea7b91b9c7023a99b1` | **manga** | reading | null | null | 0 | 1122 | 2026-05-04 |
| 7 | `69f7d8e3957023659d3bbe68` | anime | completed | null | null | 1122 | 0 | 2026-05-03 |
| 8 | `69f6a5d124acab3fc62d7de4` | anime | completed | null | null | 1122 | 0 | 2026-06-16 |
| 9 | `69f6a5c43f51af209774105b` | **manga** | reading | null | null | 0 | 1181 | 2026-05-04 |

### ⚠️ Descoberta crítica para Fase 3B-5

**Nem todos os 9 entries de One Piece são anime.** A Fase 3B-5 **NÃO pode** atribuir o WorkRelease anime (`one-piece-main`) a todos os 9 entries.

| Type | Entries | Podem receber release_id anime? |
|------|---------|-------------------------------|
| anime | 5 | ✅ Sim |
| manga | 2 | ❌ Não — precisam de WorkRelease manga |
| liveaction | 2 | ❌ Não — precisam de WorkRelease liveaction |

**Recomendação para Fase 3B-5:** Atribuir `release_id` do WorkRelease `one-piece-main` **apenas aos 5 entries type=anime**. Os 2 entries manga e 2 entries liveaction devem permanecer com `release_id=null` até que WorkReleases manga e liveaction sejam criados para One Piece.

### Nenhum entry de One Piece tem season_mal_id
Todos os 9 entries têm `season_mal_id=null`. Isso significa que o backfill por `season_mal_id → ExternalMapping` não se aplica a One Piece. O link deve ser feito por título + type, não por season_mal_id.

---

## 7. Timeline de Atualizações (updated_date)

| Data | Entries atualizados | Inclui release_id? |
|------|-------------------|-------------------|
| 2026-08-23 | 13 (12 com release_id + 1 Bleach TYBW) | 12 sim, 1 não |
| 2026-08-22 | 2 | Não |
| 2026-08-03 | 2 | Não |
| 2026-07-23 | 1 | Não |
| 2026-07-14 | 1 | Não |
| 2026-07-10 | 1 | Não |
| 2026-07-07 | 1 | Não |
| 2026-06-29 | 4 | Não |
| 2026-06-28 | 1 | Não |
| 2026-06-17 | 6 | Não |
| 2026-06-16 | vários | Não |
| 2026-06-12 | 3 (One Piece) | Não |
| 2026-05-04 | 4 (One Piece) | Não |
| 2026-05-03 | 1 (One Piece) | Não |
| **2026-09-05 (Fase 3B-4)** | **0** | — |

**Nenhum AnimeEntry foi atualizado em 2026-09-05.** A Fase 3B-4 não alterou nenhum entry.

---

## 8. Resposta à Inconsistência

### Alternativa A ou B?

**✅ Alternativa A confirmada:** "102 todos release_id=null" foi um **erro de afirmação no relatório da Fase 3B-4**.

### Evidências
1. **12 AnimeEntry têm release_id preenchido** (não 0).
2. Todos os 12 foram atualizados em **2026-08-23** (backfill da Fase 2F).
3. **0 AnimeEntry foram atualizados em 2026-09-05** (data da Fase 3B-4).
4. Os release_id **não foram removidos** — permanecem intactos.
5. A Fase 3B-4 **não tocou nenhum AnimeEntry**.

### Causa raiz do erro no relatório
O relatório da Fase 3B-4 verificou corretamente que os 9 entries de One Piece tinham `release_id=null` (verdadeiro), mas generalizou incorretamente para "todos 102 entries". A validação deveria ter sido: "0 entries foram alterados pela Fase 3B-4" (correto) em vez de "todos release_id=null" (incorreto).

### Nenhum dano causado
- ✅ Nenhum release_id foi removido
- ✅ Nenhum progresso de usuário foi alterado
- ✅ Nenhum AnimeEntry foi alterado pela Fase 3B-4
- ✅ Todos os 12 backfilled entries continuam válidos e apontam para WorkRelease corretos

---

## 9. Implicações para Fase 3B-5

### Backfill de One Piece — CUIDADO
A Fase 3B-5 deve atribuir `release_id` do WorkRelease `one-piece-main` **apenas aos 5 entries type=anime**:

| Entry ID | Type | Status | Pode receber release_id anime? |
|---------|------|--------|-------------------------------|
| `6a2c0aa45825ba62ab9ac4bb` | anime | completed | ✅ Sim |
| `6a2c0a9c85382b2b2fbb6d11` | anime | completed | ✅ Sim |
| `69f89f820ba669af6d16ffe9` | anime | watching | ✅ Sim |
| `69f7d8e3957023659d3bbe68` | anime | completed | ✅ Sim |
| `69f6a5d124acab3fc62d7de4` | anime | completed | ✅ Sim |
| `6a2c0aa74cc373431d83c30f` | liveaction | completed | ❌ Não |
| `69fa04366acca087d4f00a10` | liveaction | watching | ❌ Não |
| `69f7d8ea7b91b9c7023a99b1` | manga | reading | ❌ Não |
| `69f6a5c43f51af209774105b` | manga | reading | ❌ Não |

### Backfill de Death Note
0 entries de Death Piece existem — nenhum backfill necessário.

### Critério para Fase 3B-5
- Filtrar por `type === "anime"` antes de atribuir release_id
- Não atribuir release_id anime a entries manga ou liveaction
- Os 2 entries manga e 2 entries liveaction de One Piece devem permanecer `release_id=null` até que WorkReleases manga/liveaction sejam criados

---

## 10. Confirmação de Integridade

| Entidade | Estado | Status |
|----------|--------|--------|
| AnimeEntry | 102 total, 12 com release_id, 90 sem | ✅ Intacto |
| WorkRelease | 214 (incluindo 2 novos da Fase 3B-4) | ✅ Intacto |
| ExternalMapping | 225 (4 atualizados na Fase 3B-4) | ✅ Intacto |
| DynamicWork | 797 (2 atualizados na Fase 3B-4) | ✅ Intacto |
| SyncConflict | 0 | ✅ Intacto |
| Progresso de usuário | Inalterado | ✅ Intacto |
| Frontend | Não alterado | ✅ Intacto |

---

## 11. Recomendação

**A inconsistência está resolvida.** O erro era apenas de afirmação no relatório — nenhum dado foi perdido ou alterado. A Fase 3B-5 pode prosseguir, mas deve:

1. Atribuir `release_id` do WorkRelease `one-piece-main` **apenas aos 5 entries type=anime** de One Piece
2. **Não** atribuir aos 2 entries manga e 2 entries liveaction
3. Death Note não precisa de backfill (0 entries existem)
4. Corrigir o relatório da Fase 3B-4 para refletir: "12 AnimeEntry já possuem release_id de backfill anterior; 90 permanecem null; Fase 3B-4 não alterou nenhum AnimeEntry"