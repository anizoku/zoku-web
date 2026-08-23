# Fase 2B (rev 2) — Dry-Run: Migração seasons[] → WorkRelease

**Data:** 2026-08-23
**Modo:** Simulação somente leitura. Nada foi gravado no banco.
**Alteração desta revisão:** Nova regra de geração de slug + exclusão de dan-da-dan e hunter-x-hunter.

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| DynamicWork analisados | 800 |
| DynamicWork elegíveis (após exclusões) | 79 |
| Grupos excluídos da migração automática | 3 (dan-da-dan + 2 hunter-x-hunter anime) |
| WorkRelease que seriam criados | 206 |
| ExternalMapping que seriam criados | 206 |
| **Erros bloqueantes** | **0** ✅ |
| Avisos (não-bloqueantes) | 10 |

**Veredito:** ✅ Os 79 grupos elegíveis estão limpos e prontos para a Fase 2C. Os 3 grupos excluídos precisam de correção manual antes de serem incluídos.

---

## Nova Regra de Geração de Slug

```
1. Normalizar season_title: remover prefixo do franchise_title
2. Se resultado vazio ou igual ao franchise_title:
   - Se grupo tem 1 season → slug = group_slug
   - Se grupo tem múltiplas seasons → slug = group_slug + "-season-" + season_number
3. Senão → slug = group_slug + "-" + slugify(season_title normalizado)
4. Se ainda houver colisão dentro do mesmo grupo → anexar "-" + mal_id
5. Slug final deve ser único
```

**Exemplos gerados pela nova regra:**
- `attack-on-titan-season-2` (title "Season 2")
- `attack-on-titan-final-season` (title "Final Season")
- `attack-on-titan-final-season-part-2` (title "Final Season Part 2")
- `rezero--starting-life-in-another-world--season-2` (title "Season 2")
- `rezero--starting-life-in-another-world--season-2-part-2` (title "Season 2 Part 2")
- `kakegurui-1` (title "Kakegurui" → strip prefix → fallback season-1)

**Resultado:** 0 slugs duplicados entre os 79 grupos elegíveis. ✅

---

## Relatório 1: dan-da-dan (EXCLUÍDO)

**Motivo da exclusão:** mal_id 57334 aparece em 2 seasons diferentes (index 0 e 1).

**DynamicWork:**
- id: `6a4d567b19cbf3ad51fdb9ee`
- franchise_id: `57334`
- franchise_title: `Dan Da Dan`

| index | season_number | season_title | sort_order | episodes | year | mal_id |
|---|---|---|---|---|---|---|
| 0 | 1 | Dan Da Dan | 1 | 12 | 2024 | **57334** |
| 1 | **null** | Dan Da Dan | 2 | 12 | 2024 | **57334** ❌ |
| 2 | 2 | Dan Da Dan Season 2 | 3 | 12 | 2025 | 60543 |
| 3 | 3 | Dan Da Dan Season 3 | 4 | null | null | 62516 |

**Diagnóstico:**
- Season index 1 tem `season_number: null` e `mal_id: 57334` (igual à season 0).
- A season 2 (index 2) tem `season_title: "Dan Da Dan Season 2"` e `mal_id: 60543`.
- **Problema:** A season index 1 parece ser um duplicata errada da season 0 (mesmo mal_id, mesmo title, season_number null). Provavelmente deveria ser a Season 2 com mal_id 60543, e a season index 2 deveria ter outro mal_id.

**Ação recomendada:**
- Verificar no MAL: mal_id 57334 = Dan Da Dan (2024), mal_id 60543 = Dan Da Dan Season 2 (2025).
- A season index 1 (mal_id 57334, sn null) deve ser **removida** — é duplicata da season 0.
- Após remover, seasons[] fica: [s1=57334, s2=60543, s3=62516] — coerente.
- Re-rodar dry-run para confirmar.

---

## Relatório 2: hunter-x-hunter (EXCLUÍDO)

**Motivo da exclusão:** 3 registros DynamicWork com mesmo slug; mal_id 11061 aparece em 2 registros diferentes.

| Campo | Registro A | Registro B | Registro C |
|---|---|---|---|
| **id** | `6a5074d40366340112f3fbb2` | `6a2f677ab3610ded6c7bbbd1` | `6a2bb1c9f0515195be93340c` |
| **slug** | hunter-x-hunter | hunter-x-hunter | hunter-x-hunter |
| **title** | Hunter x Hunter | Hunter x Hunter | Hunter x Hunter |
| **categories** | `["anime"]` | `["manga"]` | `["anime"]` |
| **mal_id** | 11061 | null | 136 |
| **franchise_id** | 11061 | *(vazio)* | 136 |
| **franchise_title** | Hunter x Hunter | *(vazio)* | Hunter x Hunter |
| **episodes** | 148 | null | 62 |
| **score** | 9.03 | 8.78 | 8.44 |
| **year** | 2011 | 1998 | 1999 |
| **seasons[]** | 1 item: {mal_id:11061, sn:1, ep:148} | *(vazio)* | 2 items: {mal_id:136, sn:1, ep:62}, {mal_id:11061, sn:null, ep:148} |
| **created_date** | 2026-07-10 | 2026-06-15 | 2026-06-12 |
| **updated_date** | 2026-07-10 | 2026-06-15 | 2026-07-07 |

**Diagnóstico:**
- **Registro B** (manga, 1998, sem franchise_id, seasons vazio): é a entrada de mangá. Não é elegível para migração (sem seasons[]). Provavelmente correta como registro separado — mas o slug colide. **Deveria ter slug diferente** (ex: `hunter-x-hunter-manga`).
- **Registro A** (anime 2011, mal_id 11061, 148 eps): standalone com 1 season.
- **Registro C** (anime 1999, mal_id 136, 62 eps): tem 2 seasons, sendo a segunda {mal_id:11061, sn:null, ep:148} — que é o anime 2011 (Registro A).

**Conflito:** mal_id 11061 existe tanto no Registro A (como season única) quanto no Registro C (como segunda season). São o mesmo anime (Hunter x Hunter 2011).

**Ação recomendada (2 opções):**
- **Opção 1 (mesclar):** Remover a segunda season do Registro C (mal_id 11061) e deixar o Registro A como o release separado do anime 2011. O Registro C fica só com a season 1999 (mal_id 136).
- **Opção 2 (consolidar):** Deletar o Registro A e manter o Registro C com ambas as seasons (1999 + 2011), já que o Registro C já tem o 11061 em seasons[].

**Para o mangá (Registro B):** renomear slug para `hunter-x-hunter-manga` para evitar colisão de slug.

---

## Validações do Novo Dry-Run

| # | Validação | Resultado |
|---|---|---|
| 1 | Todo item de seasons[] tem mal_id | ✅ Passou (79 grupos) |
| 2 | mal_id duplicado dentro do mesmo grupo | ✅ 0 ocorrências |
| 3 | mal_id duplicado entre grupos diferentes | ✅ 0 ocorrências |
| 4 | Slug de WorkRelease duplicado | ✅ 0 ocorrências |
| 5 | seasons[] inválido ou vazio | ✅ Todos válidos |
| 6 | sort_order ≠ season_number | ⚠️ 10 dessincronizações (não-bloqueante) |
| 7 | Release sem title | ✅ Todos têm title |
| 8 | release_count simulado bate com seasons[] | ✅ 206 = soma de seasons[] |
| 9 | ExternalMapping provider+provider_id duplicado | ✅ 0 ocorrências |
| 10 | Registro não deveria ser migrado auto | ✅ 3 grupos já excluídos |

---

## Avisos Não-Bloqueantes (10)

sort_order ≠ season_number (não bloqueia — `sort_order` vira `release_order`, `season_number` é exibido):

| Grupo | season_index | sort_order | season_number |
|---|---|---|---|
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

---

## Grupos Prontos para Fase 2C (79)

Todos com 0 erros bloqueantes. Amostra (primeiros 18):

| # | slug | franchise_title | seasons |
|---|---|---|---|
| 1 | rezero--starting-life-in-another-world- | Re:ZERO | 4 |
| 2 | kakegurui | Kakegurui | 2 |
| 3 | welcome-to-demon-school-iruma-kun | Iruma-kun | 2 |
| 4 | high-school-dxd | High School DxD | 2 |
| 5 | bungo-stray-dogs | Bungo Stray Dogs | 3 |
| 6 | fatezero | Fate/Zero | 2 |
| 7 | grand-blue-dreaming | Grand Blue | 2 |
| 8 | 86-eighty-six | 86 Eighty-Six | 2 |
| 9 | komi-cant-communicate | Komi | 2 |
| 10 | saga-of-tanya-the-evil | Tanya the Evil | 2 |
| 11 | cyberpunk-edgerunners | Cyberpunk: Edgerunners | 2 |
| 12 | the-quintessential-quintuplets | Quintessential Quintuplets | 2 |
| 13 | mushoku-tensei-jobless-reincarnation | Mushoku Tensei | 4 |
| 14 | made-in-abyss-dawn-of-the-deep-soul | Made in Abyss | 2 |
| 15 | tsukimichi-moonlit-fantasy | Tsukimichi | 2 |
| 16 | dr-stone-new-world | Dr. Stone: New World | 2 |
| 17 | mashle-magic-and-muscles | Mashle | 3 |
| 18 | that-time-i-got-reincarnated-as-a-slime | Slime | 3 |

*(+ 61 grupos adicionais — total 79)*

---

## Grupos Excluídos da Migração Automática (3)

| Grupo | Motivo | Ação necessária |
|---|---|---|
| dan-da-dan | mal_id 57334 duplicado em seasons[0] e [1]; season[1] com season_number null | Remover season duplicada (index 1) |
| hunter-x-hunter (anime 2011) | mal_id 11061 conflita com registro 1999 | Decidir mescla ou consolidação |
| hunter-x-hunter (anime 1999) | mal_id 11061 em seasons[] conflita com registro 2011 | Decidir mescla ou consolidação |
| hunter-x-hunter (manga) | slug colide; sem seasons[] (não elegível) | Renomear slug para hunter-x-hunter-manga |

---

## 5 Exemplos de Mapeamento (nova regra de slug)

### Exemplo 1: Re:ZERO (4 seasons)
```
rezero--starting-life-in-another-world--season-1 | sn=1 | mal_id=31240 | ep=25 | 2016
rezero--starting-life-in-another-world--season-2 | sn=2 | mal_id=39587 | ep=13 | 2020
rezero--starting-life-in-another-world--season-2-part-2 | sn=2 | mal_id=42203 | ep=12 | 2021
rezero--starting-life-in-another-world--season-4 | sn=4 | mal_id=61316 | ep=19 | 2026
```
✅ Sem colisão — "Season 2" e "Season 2 Part 2" geram slugs distintos.

### Exemplo 2: Kakegurui (2 seasons)
```
kakegurui-season-1 | sn=1 | mal_id=34933 | ep=12 | 2017
kakegurui-season-2 | sn=2 | mal_id=37086 | ep=12 | 2019
```

### Exemplo 3: Mushoku Tensei (4 seasons)
```
mushoku-tensei-jobless-reincarnation-season-1 | sn=1
mushoku-tensei-jobless-reincarnation-season-2 | sn=2
mushoku-tensei-jobless-reincarnation-season-2-part-2 | sn=2 (Part 2)
mushoku-tensei-jobless-reincarnation-season-3 | sn=3
```
✅ Sem colisão.

### Exemplo 4: Attack on Titan (4+ seasons)
```
attack-on-titan-season-1
attack-on-titan-season-2
attack-on-titan-season-3
attack-on-titan-final-season | (title "Final Season")
attack-on-titan-final-season-part-2 | (title "Final Season Part 2")
```
✅ Sem colisão.

### Exemplo 5: Komi Can't Communicate (2 seasons)
```
komi-cant-communicate-season-1 | sn=1
komi-cant-communicate-season-2 | sn=2
```

---

## Critério de Aceitação

✅ **0 erros bloqueantes** para os 79 grupos que serão migrados.
✅ Nova regra de slug resolve todas as colisões de "Part 2" / "Final Season".
✅ dan-da-dan e hunter-x-hunter excluídos até correção manual.
✅ Nenhum dado gravado no banco.

**Pronto para Fase 2C** (migração real dos 79 grupos) quando você autorizar.