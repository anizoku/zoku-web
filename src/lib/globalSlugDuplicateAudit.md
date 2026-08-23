# Fase 2G — Auditoria Global de Slugs Duplicados

**Data:** 2026-08-23
**Tipo:** Auditoria somente leitura (read-only)
**Escopo:** Catálogo global de DynamicWork

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total DynamicWork analisados | 797 |
| Total de slugs únicos | 694 |
| **Total de slugs duplicados** | **102** |
| **Total de registros afetados** | **205** |

### Classificação por Categoria

| Categoria | Descrição | Quantidade |
|-----------|-----------|------------|
| **A** | anime + manga com mesmo slug | **100** |
| **F** | falso positivo / pode esperar | **2** |
| B | temporada/parte solta | 0 |
| C | filme/especial/OVA | 0 |
| D | duplicata real (mesmo mal_id) | 0 |
| E | conflito perigoso com referências | 0 (isolado) |

**Descoberta principal:** 98% das duplicatas (100 de 102) são pares anime+manga legítimos com o mesmo nome — exatamente o padrão que WorkRelease/ExternalMapping resolve. Não são erros de dados; são obras que compartilham título mas existem em categorias diferentes.

## Os 2 grupos F (manga+manga — falso positivo)

1. **three-days-of-happiness** — 2 registros manga (manga_mal_id 126479 de 2013 + manga_mal_id 100448 de 2016) — provavelmente mangás diferentes com mesmo título
2. **spice-wolf** — 2 registros manga (manga_mal_id 3299 de 2007 + manga_mal_id 9115 de 2006) — provavelmente versões diferentes (light novel vs manga)

## Casos Especiais (dentro da categoria A)

- **overlord** — 3 registros (2 manga com manga_mal_id diferentes 81667/81669 + 1 anime mal_id 29803) — manga tem duas versões (novel vs manga)
- **i-want-to-eat-your-pancreas** — manga + anime+movie (segundo registro tem categoria dupla)
- **gantz** — manga + anime, mas anime não tem mal_id

## Referências Cruzadas

| Referência | Slugs afetados | Detalhe |
|-----------|----------------|---------|
| **CardOverride** | 8 | naruto, haikyu, death-note, barakamon, banana-fish, bakuman, tokyo-revengers, assassination-classroom — todos categoria `liveaction` |
| **WorkCategoryVisibility** | 3 | toradora (animes=true, mangas=false), tokyo-ghoul (animes=true, mangas=false), assassination-classroom (animes=true, mangas=false) |
| **CatalogSync** | 83 | A maioria dos slugs anime+manga tem CatalogSync |
| **WorkRelease** | 34 | Já migrados na Fase 2C |
| **ExternalMapping** | 34 | Já migrados na Fase 2C |
| **AnimeEntry (por title)** | 21 | dr-stone (6), bleach (4), naruto (4), outros com 2 cada |

## Top 20 Duplicatas Mais Perigosas

| # | Slug | AnimeEntry | CardOverride | WorkVis | WorkRelease | Risco |
|---|------|-----------|--------------|---------|-------------|------|
| 1 | naruto | 4 | 1 (liveaction) | 0 | 0 | Alto |
| 2 | haikyu | 2 | 1 (liveaction) | 0 | 0 | Alto |
| 3 | death-note | 0 | 1 (liveaction) | 0 | 0 | Médio |
| 4 | barakamon | 0 | 1 (liveaction) | 0 | 0 | Médio |
| 5 | banana-fish | 2 | 1 (liveaction) | 0 | 0 | Alto |
| 6 | bakuman | 2 | 1 (liveaction) | 0 | 0 | Alto |
| 7 | tokyo-revengers | 2 | 1 (liveaction) | 0 | 0 | Alto |
| 8 | assassination-classroom | 2 | 0 | 1 | 0 | Alto |
| 9 | toradora | 2 | 0 | 1 | 0 | Alto |
| 10 | tokyo-ghoul | 2 | 0 | 1 | 0 | Alto |
| 11 | dr-stone | 6 | 0 | 0 | 0 | Médio |
| 12 | bleach | 4 | 0 | 0 | 0 | Médio |
| 13 | sword-art-online | 2 | 0 | 0 | 0 | Baixo |
| 14 | is-it-wrong-to-try-to-pick-up-girls-in-a-dungeon | 0 | 0 | 0 | 3 | Baixo (já migrado) |
| 15 | that-time-i-got-reincarnated-as-a-slime | 0 | 0 | 0 | 4 | Baixo (já migrado) |
| 16 | tsukimichi-moonlit-fantasy | 0 | 0 | 0 | 2 | Baixo (já migrado) |
| 17 | welcome-to-demon-school-iruma-kun | 0 | 0 | 0 | 2 | Baixo (já migrado) |
| 18 | overlord | 0 | 0 | 0 | 0 | Médio (3 registros) |
| 19 | monster | 2 | 0 | 0 | 0 | Baixo |
| 20 | dragon-ball | 2 | 0 | 0 | 0 | Baixo |

## Lista Completa dos 102 Slugs Duplicados

### Grupo 1-50
the-ghost-in-the-shell×2, smoking-behind-the-supermarket-with-you×2, chobits×2, is-it-wrong-to-try-to-pick-up-girls-in-a-dungeon×2, land-of-the-lustrous×2, toradora×2, bunny-drop×2, uzaki-chan-wants-to-hang-out×2, drifters×2, gleipnir×2, twin-star-exorcists×2, three-days-of-happiness×2, my-love-story-with-yamada-kun-at-lv999×2, hinamatsuri×2, that-time-i-got-reincarnated-as-a-slime×2, tsukimichi-moonlit-fantasy×2, attack-on-titan-no-regrets×2, bakemonogatari×2, fruits-basket×2, welcome-to-demon-school-iruma-kun×2, trigun×2, heavenly-delusion×2, barakamon×2, spice-wolf×2, darling-in-the-franxx×2, the-rising-of-the-shield-hero×2, darwins-game×2, miss-kobayashis-dragon-maid×2, **overlord×3**, ajin-demi-human×2, gangsta×2, the-case-study-of-vanitas×2, shikimoris-not-just-a-cutie×2, given×2, higehiro×2, teasing-master-takagi-san×2, redo-of-healer×2, dorohedoro×2, bakuman×2, i-want-to-eat-your-pancreas×2, 86-eighty-six×2, to-love-ru×2, zom-100×2, say-i-love-you×2, scums-wish×2, arifureta×2, claymore×2, blood-lad×2, kamisama-kiss×2, konosuba×2, dgray-man×2

### Grupo 51-102
march-comes-in-like-a-lion×2, snow-white-with-the-red-hair×2, black-lagoon×2, tsuredure-children×2, welcome-to-the-nhk×2, sword-art-online×2, banana-fish×2, monster-musume×2, inuyasha×2, another×2, dont-toy-with-me-miss-nagatoro×2, blue-lock×2, grand-blue-dreaming×2, kurokos-basketball×2, yona-of-the-dawn×2, the-god-of-high-school×2, rezero×2, komi-cant-communicate×2, oshi-no-ko×2, tower-of-god×2, the-quintessential-quintuplets×2, magi×2, dragon-ball×2, relife×2, black-butler×2, deadman-wonderland×2, monster×2, my-dress-up-darling×2, maid-sama×2, tokyo-revengers×2, made-in-abyss×2, blue-exorcist×2, assassination-classroom×2, food-wars×2, soul-eater×2, vinland-saga×2, fairy-tail×2, the-seven-deadly-sins×2, akame-ga-kill×2, spy-x-family×2, black-clover×2, kaguya-sama×2, dr-stone×2, the-promised-neverland×2, haikyu×2, bleach×2, gantz×2, death-note×2, naruto×2, tokyo-ghoul×2, one-punch-man×2

## Análise de Bloqueio

**Estes 102 slugs duplicados NÃO bloqueiam a próxima fase.** Razões:

1. **98% são anime+manga legítimos** — não são erros, são obras que compartilham título. O sistema WorkRelease/ExternalMapping já resolve isso (34 já migrados).

2. **group_id/release_id é a chave canônica** — rotas e catálogo usam `id` (DynamicWork.id) ou `slug` + categoria. O `slug` sozinho não é mais a única chave de acesso.

3. **CardOverride/WorkCategoryVisibility usam slug + categoria** — o slug duplicado não causa colisão porque a consulta filtra por categoria (ex: `card_slug = "naruto" AND category = "liveaction"`).

4. **CatalogSync usa slug** — 83 slugs têm CatalogSync, mas CatalogSync é apenas um cache de metadados; duplicar o slug entre anime/manga não quebra o sync porque cada registro DynamicWork tem seu próprio mal_id/manga_mal_id.

5. **AnimeEntry usa title (não slug)** — 21 slugs têm AnimeEntry por title, mas o title é o mesmo para anime e manga, então não há ambiguidade na prática (o usuário adiciona "Naruto" e o sistema resolve pelo tipo).

## Ação Futura Sugerida por Grupo

| Categoria | Ação | Prioridade |
|-----------|------|-----------|
| A (100 grupos) | **Agrupar em DynamicWork canônico + WorkRelease** (como fizemos em Hunter x Hunter) | Média — fazer gradualmente |
| F (2 grupos) | **Preservar por enquanto** — investigar manualmente se são obras diferentes | Baixa |
| overlord (3 registros) | **Decisão manual** — 2 manga são versões diferentes (novel vs manga) | Baixa |
| 8 slugs com CardOverride liveaction | **Preservar** — CardOverride liveaction não colide com anime/manga | Nenhuma |
| 3 slugs com WorkCategoryVisibility | **Preservar** — já configurados para mostrar só anime | Nenhuma |

## Conclusão

**Podemos seguir para a próxima fase (AniList/frontend/sync) com segurança.** Os 102 slugs duplicados são majoritariamente pares anime+manga legítimos que o sistema WorkRelease já resolve. A correção de slugs pode ser feita gradualmente, agrupando cada par em um DynamicWork canônico (como fizemos com Hunter x Hunter), sem bloquear o progresso.