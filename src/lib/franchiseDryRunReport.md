# RELATÓRIO DE DRY-RUN — Detecção de Franchises (Jikan Relations)
Data: 2026-07-07

## Resumo Executivo
- **433 obras anime standalone** processadas (100% cacheado em CatalogSync)
- **47 grupos multi-membro** detectados (119 obras candidatas)
- **6 standalones** conectam a obras já fundidas na Fase 1
- **130/136** tipos MAL buscados com sucesso

---

## 1. TABELA COMPLETA DOS 47 GRUPOS

Legenda:
- **ROOT** = raiz do franchise (menor mal_id via prequel chain)
- **[SEASON]** = tipo TV/ONA → candidato a merge como temporada
- **[RELATED]** = tipo Movie/OVA/Special → candidato a related_franchise_id (NÃO merge)
- **[IN DB]** = raiz está no banco | **[MISSING]** = raiz precisa ser importada

### Grupo 1 — Franchise ID: 38000 (7 obras)
ROOT: mal_id=38000 | Demon Slayer: Kimetsu no Yaiba | Tipo: TV | Ano: 2019 | [IN DB]
**Candidatos a TEMPORADA (4):**
  - mal_id=55701 | Demon Slayer: Kimetsu no Yaiba Hashira Training Arc | Tipo: ? | Ano: ? → [SEASON]
  - mal_id=51019 | Demon Slayer: Kimetsu no Yaiba Swordsmith Village Arc | Tipo: TV | Ano: 2023 → [SEASON]
  - mal_id=49926 | Demon Slayer: Kimetsu no Yaiba Mugen Train Arc | Tipo: TV | Ano: 2021 → [SEASON]
  - mal_id=47778 | Demon Slayer: Kimetsu no Yaiba Entertainment District Arc | Tipo: TV | Ano: 2022 → [SEASON]
**Candidatos a RELATED_FRANCHISE_ID (2):**
  - mal_id=62546 | Demon Slayer: Kimetsu no Yaiba - The Movie 2: Infinity Castle | Tipo: Movie | Ano: ? → [RELATED]
  - mal_id=40456 | Demon Slayer: Kimetsu no Yaiba - The Movie: Mugen Train | Tipo: Movie | Ano: 2020 → [RELATED]

### Grupo 2 — Franchise ID: 14719 (6 obras)
ROOT: mal_id=14719 | JoJo's Bizarre Adventure (2012) | Tipo: TV | Ano: 2012 | [IN DB]
**Candidatos a TEMPORADA (5):**
  - mal_id=48661 | JoJo's Bizarre Adventure: Stone Ocean | Tipo: ONA | Ano: 2021 → [SEASON]
  - mal_id=37991 | JoJo's Bizarre Adventure: Golden Wind | Tipo: TV | Ano: 2018 → [SEASON]
  - mal_id=31933 | JoJo's Bizarre Adventure: Diamond Is Unbreakable | Tipo: TV | Ano: 2016 → [SEASON]
  - mal_id=26055 | JoJo's Bizarre Adventure: Stardust Crusaders - Battle in Egypt | Tipo: ? | Ano: ? → [SEASON]
  - mal_id=20899 | JoJo's Bizarre Adventure: Stardust Crusaders | Tipo: TV | Ano: 2014 → [SEASON]

### Grupo 3 — Franchise ID: 30831 (5 obras)
ROOT: mal_id=30831 | KonoSuba: God's Blessing on This Wonderful World! | Tipo: TV | Ano: 2016 | [IN DB]
**Candidatos a TEMPORADA (3):**
  - mal_id=61203 | KonoSuba: God's Blessing on This Wonderful World! 4 | Tipo: TV | Ano: ? → [SEASON]
  - mal_id=49458 | KonoSuba: God's Blessing on This Wonderful World! 3 | Tipo: TV | Ano: 2024 → [SEASON]
  - mal_id=32937 | KonoSuba: God's Blessing on This Wonderful World! 2 | Tipo: TV | Ano: 2017 → [SEASON]
**Candidatos a RELATED_FRANCHISE_ID (1):**
  - mal_id=38040 | KonoSuba: God's Blessing on This Wonderful World! - Legend of Crimson | Tipo: Movie | Ano: 2019 → [RELATED]

### Grupo 4 — Franchise ID: 35788 (4 obras)
ROOT: mal_id=35788 | Food Wars! The Third Plate | Tipo: TV | Ano: 2017 | [IN DB]
**Candidatos a TEMPORADA (3):**
  - mal_id=40902 | Food Wars! The Fifth Plate | Tipo: TV | Ano: 2020 → [SEASON]
  - mal_id=39940 | Food Wars! The Fourth Plate | Tipo: ? | Ano: ? → [SEASON]
  - mal_id=36949 | Food Wars! The Third Plate: Totsuki Train Arc | Tipo: TV | Ano: 2018 → [SEASON]

### Grupo 5 — Franchise ID: 23755 (4 obras)
ROOT: mal_id=23755 | The Seven Deadly Sins | Tipo: TV | Ano: 2014 | [IN DB]
**Candidatos a TEMPORADA (3):**
  - mal_id=39701 | The Seven Deadly Sins: Imperial Wrath of the Gods | Tipo: TV | Ano: 2019 → [SEASON]
  - mal_id=34577 | The Seven Deadly Sins: Revival of the Commandments | Tipo: TV | Ano: 2018 → [SEASON]
  - mal_id=31722 | The Seven Deadly Sins: Signs of Holy War | Tipo: TV | Ano: 2016 → [SEASON]

### Grupo 6 — Franchise ID: 38680 (3 obras)
ROOT: mal_id=38680 | Fruits Basket 1st Season | Tipo: TV | Ano: 2019 | [IN DB]
**Candidatos a TEMPORADA (2):**
  - mal_id=42938 | Fruits Basket: The Final Season | Tipo: TV | Ano: 2021 → [SEASON]
  - mal_id=40417 | Fruits Basket 2nd Season | Tipo: TV | Ano: 2020 → [SEASON]

### Grupo 7 — Franchise ID: 14813 (3 obras)
ROOT: mal_id=14813 | My Teen Romantic Comedy SNAFU | Tipo: TV | Ano: 2013 | [IN DB]
**Candidatos a TEMPORADA (2):**
  - mal_id=39547 | My Teen Romantic Comedy SNAFU Climax! | Tipo: TV | Ano: 2020 → [SEASON]
  - mal_id=23847 | My Teen Romantic Comedy SNAFU TOO! | Tipo: TV | Ano: 2015 → [SEASON]

### Grupo 8 — Franchise ID: 31478 (3 obras)
ROOT: mal_id=31478 | Bungo Stray Dogs | Tipo: TV | Ano: 2016 | [IN DB]
**Candidatos a TEMPORADA (2):**
  - mal_id=38003 | Bungo Stray Dogs 3 | Tipo: TV | Ano: 2019 → [SEASON]
  - mal_id=32867 | Bungo Stray Dogs 2 | Tipo: TV | Ano: 2016 → [SEASON]

### Grupo 9 — Franchise ID: 22319 (3 obras)
ROOT: mal_id=22319 | Tokyo Ghoul | Tipo: TV | Ano: 2014 | [IN DB]
**Candidatos a TEMPORADA (2):**
  - mal_id=36511 | Tokyo Ghoul:re | Tipo: TV | Ano: 2018 → [SEASON]
  - mal_id=27899 | Tokyo Ghoul √A | Tipo: TV | Ano: 2015 → [SEASON]

### Grupo 10 — Franchise ID: 6702 (3 obras)
ROOT: mal_id=6702 | Fairy Tail | Tipo: TV | Ano: 2009 | [IN DB]
**Candidatos a TEMPORADA (2):**
  - mal_id=35972 | Fairy Tail Final Series | Tipo: TV | Ano: 2018 → [SEASON]
  - mal_id=22043 | Fairy Tail Series 2 | Tipo: TV | Ano: 2014 → [SEASON]

### Grupo 11 — Franchise ID: 16916 (3 obras)
ROOT: mal_id=16916 | Kuroko's Basketball: Tip Off | Tipo: Special | Ano: 2013 | [MISSING — IMPORTAR RAIZ]
**Candidatos a TEMPORADA (3):**
  - mal_id=24415 | Kuroko's Basketball 3 | Tipo: TV | Ano: 2015 → [SEASON]
  - mal_id=16894 | Kuroko's Basketball 2 | Tipo: TV | Ano: 2013 → [SEASON]
  - mal_id=11771 | Kuroko's Basketball | Tipo: TV | Ano: 2012 → [SEASON]

### Grupo 12 — Franchise ID: 31757 (3 obras)
ROOT: mal_id=31757 | Kizumonogatari Part 2: Hot-Blooded | Tipo: Movie | Ano: 2016 | [MISSING — IMPORTAR RAIZ]
**Candidatos a TEMPORADA (3):**
  - mal_id=17074 | Monogatari Series: Second Season | Tipo: TV | Ano: 2013 → [SEASON]
  - mal_id=11597 | Nisemonogatari | Tipo: TV | Ano: 2012 → [SEASON]
  - mal_id=5081 | Bakemonogatari | Tipo: TV | Ano: 2009 → [SEASON]

### Grupo 13 — Franchise ID: 849 (3 obras)
ROOT: mal_id=849 | The Melancholy of Haruhi Suzumiya | Tipo: TV | Ano: 2006 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=4382 | The Melancholy of Haruhi Suzumiya (2009) | Tipo: TV | Ano: 2009 → [SEASON]
**Candidatos a RELATED_FRANCHISE_ID (1):**
  - mal_id=7311 | The Disappearance of Haruhi Suzumiya | Tipo: Movie | Ano: 2010 → [RELATED]

### Grupo 14 — Franchise ID: 223 (3 obras)
ROOT: mal_id=223 | Dragon Ball | Tipo: TV | Ano: 1986 | [IN DB]
**Candidatos a TEMPORADA (2):**
  - mal_id=813 | Dragon Ball Z | Tipo: TV | Ano: 1989 → [SEASON]
  - mal_id=225 | Dragon Ball GT | Tipo: TV | Ano: 1996 → [SEASON]

### Grupo 15 — Franchise ID: 48549 (2 obras)
ROOT: mal_id=48549 | Dr. Stone: New World | Tipo: TV | Ano: 2023 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=62568 | Dr. Stone: Science Future Part 3 | Tipo: TV | Ano: 2026 → [SEASON]

### Grupo 16 — Franchise ID: 42310 (2 obras)
ROOT: mal_id=42310 | Cyberpunk: Edgerunners | Tipo: ONA | Ano: 2022 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=61990 | Cyberpunk: Edgerunners 2 | Tipo: ONA | Ano: 2026 → [SEASON]

### Grupo 17 — Franchise ID: 269 (2 obras)
ROOT: mal_id=269 | Bleach | Tipo: TV | Ano: 2004 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=60636 | Bleach: Thousand-Year Blood War - The Calamity | Tipo: TV | Ano: 2026 → [SEASON]

### Grupo 18 — Franchise ID: 52299 (2 obras)
ROOT: mal_id=52299 | Solo Leveling | Tipo: TV | Ano: 2024 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=58567 | Solo Leveling Season 2: Arise from the Shadow | Tipo: TV | Ano: 2025 → [SEASON]

### Grupo 19 — Franchise ID: 48561 (2 obras)
ROOT: mal_id=48561 | Jujutsu Kaisen 0 | Tipo: Movie | Ano: 2021 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=57658 | Jujutsu Kaisen: The Culling Game Part 1 | Tipo: TV | Ano: 2026 → [SEASON]

### Grupo 20 — Franchise ID: 36862 (2 obras)
ROOT: mal_id=36862 | Made in Abyss: Dawn of the Deep Soul | Tipo: Movie | Ano: 2020 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=41084 | Made in Abyss: The Golden City of the Scorching Sun | Tipo: TV | Ano: 2022 → [SEASON]

### Grupo 21 — Franchise ID: 38691 (2 obras)
ROOT: mal_id=38691 | Dr. Stone | Tipo: TV | Ano: 2019 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=40852 | Dr. Stone: Stone Wars | Tipo: TV | Ano: 2021 → [SEASON]

### Grupo 22 — Franchise ID: 37999 (2 obras)
ROOT: mal_id=37999 | Kaguya-sama: Love is War | Tipo: TV | Ano: 2019 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=40591 | Kaguya-sama: Love is War? | Tipo: TV | Ano: 2020 → [SEASON]

### Grupo 23 — Franchise ID: 38101 (2 obras)
ROOT: mal_id=38101 | The Quintessential Quintuplets | Tipo: TV | Ano: 2019 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=39783 | The Quintessential Quintuplets 2 | Tipo: TV | Ano: 2021 → [SEASON]

### Grupo 24 — Franchise ID: 33352 (2 obras)
ROOT: mal_id=33352 | Violet Evergarden | Tipo: TV | Ano: 2018 | [IN DB]
**Candidatos a RELATED_FRANCHISE_ID (1):**
  - mal_id=37987 | Violet Evergarden: The Movie | Tipo: Movie | Ano: 2020 → [RELATED]

### Grupo 25 — Franchise ID: 34933 (2 obras)
ROOT: mal_id=34933 | Kakegurui | Tipo: TV | Ano: 2017 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=37086 | Kakegurui×× | Tipo: ? | Ano: ? → [SEASON]

### Grupo 26 — Franchise ID: 33255 (2 obras)
ROOT: mal_id=33255 | The Disastrous Life of Saiki K. | Tipo: TV | Ano: 2016 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=34612 | The Disastrous Life of Saiki K. 2 | Tipo: TV | Ano: 2018 → [SEASON]

### Grupo 27 — Franchise ID: 33674 (2 obras)
ROOT: mal_id=33674 | No Game, No Life: Zero | Tipo: Movie | Ano: 2017 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=19815 | No Game, No Life | Tipo: TV | Ano: 2014 → [SEASON]

### Grupo 28 — Franchise ID: 9919 (2 obras)
ROOT: mal_id=9919 | Blue Exorcist | Tipo: TV | Ano: 2011 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=33506 | Blue Exorcist: Kyoto Saga | Tipo: TV | Ano: 2017 → [SEASON]

### Grupo 29 — Franchise ID: 28171 (2 obras)
ROOT: mal_id=28171 | Food Wars! Shokugeki no Soma | Tipo: TV | Ano: 2015 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=32282 | Food Wars! The Second Plate | Tipo: TV | Ano: 2016 → [SEASON]

### Grupo 30 — Franchise ID: 28405 (2 obras)
ROOT: mal_id=28405 | Assassination Classroom: Meeting Time | Tipo: Special | Ano: 2014 | [MISSING — IMPORTAR RAIZ]
**Candidatos a TEMPORADA (2):**
  - mal_id=30654 | Assassination Classroom Second Season | Tipo: TV | Ano: 2016 → [SEASON]
  - mal_id=24833 | Assassination Classroom | Tipo: TV | Ano: 2015 → [SEASON]

### Grupo 31 — Franchise ID: 26243 (2 obras)
ROOT: mal_id=26243 | Seraph of the End: Vampire Reign | Tipo: TV | Ano: 2015 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=28927 | Seraph of the End: Battle in Nagoya | Tipo: TV | Ano: 2015 → [SEASON]

### Grupo 32 — Franchise ID: 10087 (2 obras)
ROOT: mal_id=10087 | Fate/Zero | Tipo: TV | Ano: 2011 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=356 | Fate/stay night | Tipo: TV | Ano: 2006 → [SEASON]
**Candidatos a RELATED_FRANCHISE_ID (1):**
  - mal_id=25537 | Fate/stay night: Heaven's Feel - I. Presage Flower | Tipo: Movie | Ano: 2017 → [RELATED]

### Grupo 33 — Franchise ID: 17265 (2 obras)
ROOT: mal_id=17265 | Log Horizon | Tipo: TV | Ano: 2013 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=23321 | Log Horizon 2 | Tipo: ? | Ano: ? → [SEASON]

### Grupo 34 — Franchise ID: 13601 (2 obras)
ROOT: mal_id=13601 | Psycho-Pass | Tipo: TV | Ano: 2012 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=23281 | Psycho-Pass 2 | Tipo: TV | Ano: 2014 → [SEASON]

### Grupo 35 — Franchise ID: 14513 (2 obras)
ROOT: mal_id=14513 | Magi: The Labyrinth of Magic | Tipo: TV | Ano: 2012 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=18115 | Magi: The Kingdom of Magic | Tipo: TV | Ano: 2013 → [SEASON]

### Grupo 36 — Franchise ID: 9260 (2 obras)
ROOT: mal_id=9260 | Kizumonogatari Part 1: Iron-Blooded | Tipo: Movie | Ano: 2016 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=15689 | Nekomonogatari Black | Tipo: TV Special | Ano: 2012 → [SEASON]

### Grupo 37 — Franchise ID: 11617 (2 obras)
ROOT: mal_id=11617 | High School DxD | Tipo: TV | Ano: 2012 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=15451 | High School DxD New | Tipo: TV | Ano: 2013 → [SEASON]

### Grupo 38 — Franchise ID: 10897 (2 obras)
ROOT: mal_id=10897 | Haganai: Black Hotpot Gives Girls a Bad Smell | Tipo: OVA | Ano: 2011 | [MISSING — IMPORTAR RAIZ]
**Candidatos a TEMPORADA (2):**
  - mal_id=14967 | Haganai: I don't have many friends NEXT | Tipo: TV | Ano: 2013 → [SEASON]
  - mal_id=10719 | Haganai: I don't have many friends | Tipo: TV | Ano: 2011 → [SEASON]

### Grupo 39 — Franchise ID: 9253 (2 obras)
ROOT: mal_id=9253 | Steins;Gate | Tipo: TV | Ano: 2011 | [IN DB]
**Candidatos a RELATED_FRANCHISE_ID (1):**
  - mal_id=11577 | Steins;Gate: The Movie - Load Region of Déjà Vu | Tipo: Movie | Ano: 2013 → [RELATED]

### Grupo 40 — Franchise ID: 2167 (2 obras)
ROOT: mal_id=2167 | Clannad | Tipo: TV | Ano: 2007 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=4181 | Clannad: After Story | Tipo: TV | Ano: 2008 → [SEASON]

### Grupo 41 — Franchise ID: 2759 (2 obras)
ROOT: mal_id=2759 | Evangelion: 1.0 You Are (Not) Alone | Tipo: Movie | Ano: 2007 | [IN DB]
**Candidatos a RELATED_FRANCHISE_ID (1):**
  - mal_id=3784 | Evangelion: 2.0 You Can (Not) Advance | Tipo: Movie | Ano: 2009 → [RELATED]

### Grupo 42 — Franchise ID: 1575 (2 obras)
ROOT: mal_id=1575 | Code Geass: Lelouch of the Rebellion | Tipo: TV | Ano: 2006 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=2904 | Code Geass: Lelouch of the Rebellion R2 | Tipo: TV | Ano: 2008 → [SEASON]

### Grupo 43 — Franchise ID: 934 (2 obras)
ROOT: mal_id=934 | Higurashi: When They Cry | Tipo: TV | Ano: 2006 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=1889 | Higurashi: When They Cry – Kai | Tipo: TV | Ano: 2007 → [SEASON]

### Grupo 44 — Franchise ID: 1195 (2 obras)
ROOT: mal_id=1195 | The Familiar of Zero | Tipo: TV | Ano: 2006 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=1840 | The Familiar of Zero: Knight of the Twin Moons | Tipo: TV | Ano: 2007 → [SEASON]

### Grupo 45 — Franchise ID: 20 (2 obras)
ROOT: mal_id=20 | Naruto | Tipo: TV | Ano: 2002 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=1735 | Naruto Shippuden | Tipo: TV | Ano: 2007 → [SEASON]

### Grupo 46 — Franchise ID: 889 (2 obras)
ROOT: mal_id=889 | Black Lagoon | Tipo: TV | Ano: 2006 | [IN DB]
**Candidatos a TEMPORADA (1):**
  - mal_id=1519 | Black Lagoon: The Second Barrage | Tipo: ? | Ano: ? → [SEASON]

### Grupo 47 — Franchise ID: 30 (2 obras)
ROOT: mal_id=30 | Neon Genesis Evangelion | Tipo: TV | Ano: 1995 | [IN DB]
**Candidatos a RELATED_FRANCHISE_ID (1):**
  - mal_id=32 | Neon Genesis Evangelion: The End of Evangelion | Tipo: Movie | Ano: 1997 → [RELATED]

---

## 2. ANEXAÇÕES A OBRAS JÁ CANÔNICAS (6 standalones)
Estas obras standalone têm franchise_id apontando para uma raiz já fundida (multi-season) na Fase 1:

- **My Hero Academia: More** (mal_id=63130, Tipo: TV Special) → raiz: **My Hero Academia** (mal_id=31964, 6 temporadas já fundidas)
  → Ação recomendada: ADICIONAR como temporada na raiz canônica
- **Classroom of the Elite 4th Season: Second Year, First Semester** (mal_id=59708, Tipo: TV) → raiz: **Classroom of the Elite** (mal_id=35507, 2 temporadas já fundidas)
  → Ação recomendada: ADICIONAR como temporada na raiz canônica
- **The Eminence in Shadow: Lost Echoes** (mal_id=57584, Tipo: Movie) → raiz: **The Eminence in Shadow** (mal_id=48316, 2 temporadas já fundidas)
  → Ação recomendada: related_franchise_id=48316
- **Mashle: Magic and Muscles - The Divine Visionary Candidate Exam Arc** (mal_id=55813, Tipo: TV) → raiz: **Mashle: Magic and Muscles** (mal_id=52211, 2 temporadas já fundidas)
  → Ação recomendada: ADICIONAR como temporada na raiz canônica
- **Attack on Titan: Final Season - The Final Chapters** (mal_id=51535, Tipo: TV Special) → raiz: **Attack on Titan** (mal_id=16498, 6 temporadas já fundidas)
  → Ação recomendada: ADICIONAR como temporada na raiz canônica
- **Sword Art Online the Movie: Ordinal Scale** (mal_id=31765, Tipo: Movie) → raiz: **Sword Art Online** (mal_id=11757, 4 temporadas já fundidas)
  → Ação recomendada: related_franchise_id=11757

## 3. VERIFICAÇÃO DE FRANCHISES ESPECÍFICOS

### Naruto / Shippuuden
- mal_id=20: Naruto | Tipo: TV | Ano: 2002
  - No banco: SIM | Em grupo multi: SIM (Grupo franchise_id=20)
- mal_id=1735: Naruto Shippuden | Tipo: TV | Ano: 2007
  - No banco: SIM | Em grupo multi: SIM (Grupo franchise_id=20)

### Bleach
- mal_id=269: Bleach | Tipo: TV | Ano: 2004
  - No banco: SIM | Em grupo multi: SIM (Grupo franchise_id=269)

### Code Geass
- mal_id=1575: Code Geass: Lelouch of the Rebellion | Tipo: TV | Ano: 2006
  - No banco: SIM | Em grupo multi: SIM (Grupo franchise_id=1575)
- mal_id=1803: (não buscado) | Tipo: ? | Ano: ?
  - No banco: NÃO | Em grupo multi: NÃO

### Tokyo Ghoul
- mal_id=22319: Tokyo Ghoul | Tipo: TV | Ano: 2014
  - No banco: SIM | Em grupo multi: SIM (Grupo franchise_id=22319)
- mal_id=27899: Tokyo Ghoul √A | Tipo: TV | Ano: 2015
  - No banco: SIM | Em grupo multi: SIM (Grupo franchise_id=22319)

### Noragami
- mal_id=20507: (não buscado) | Tipo: ? | Ano: ?
  - No banco: SIM | Em grupo multi: NÃO
- mal_id=30503: (não buscado) | Tipo: ? | Ano: ?
  - No banco: SIM | Em grupo multi: NÃO

## 4. CASOS AMBÍGUOS PARA DECISÃO

### Grupo 1 — [DEMON_SLAYER] — Franchise ID: 38000
ROOT: Demon Slayer: Kimetsu no Yaiba (mal_id=38000, Tipo: TV, Ano: 2019)
  - mal_id=62546 | Demon Slayer: Kimetsu no Yaiba - The Movie 2: Infinity Castle | Movie | ? | [RELATED]
  - mal_id=55701 | Demon Slayer: Kimetsu no Yaiba Hashira Training Arc | ? | ? | [SEASON]
  - mal_id=51019 | Demon Slayer: Kimetsu no Yaiba Swordsmith Village Arc | TV | 2023 | [SEASON]
  - mal_id=49926 | Demon Slayer: Kimetsu no Yaiba Mugen Train Arc | TV | 2021 | [SEASON]
  - mal_id=47778 | Demon Slayer: Kimetsu no Yaiba Entertainment District Arc | TV | 2022 | [SEASON]
  - mal_id=40456 | Demon Slayer: Kimetsu no Yaiba - The Movie: Mugen Train | Movie | 2020 | [RELATED]
  ⚠️ RECOMENDAÇÃO: Demon Slayer tem filme "Mugen Train" E arco de TV "Mugen Train Arc" que cobrem o mesmo conteúdo. O filme deve ser [RELATED], o arco de TV deve ser [SEASON]. Verifique se ambos estão classificados corretamente.

### Grupo 12 — [MONOGATARI] — Franchise ID: 31757
ROOT: Kizumonogatari Part 2: Hot-Blooded (mal_id=31757, Tipo: Movie, Ano: 2016)
  - mal_id=17074 | Monogatari Series: Second Season | TV | 2013 | [SEASON]
  - mal_id=11597 | Nisemonogatari | TV | 2012 | [SEASON]
  - mal_id=5081 | Bakemonogatari | TV | 2009 | [SEASON]
  ⚠️ RECOMENDAÇÃO: Monogatari tem ordem de lançamento ≠ ordem cronológica. O prequel chain do MAL pode não refletir a ordem canônica de exibição. **Sugiro revisar manualmente a ordem das temporadas** antes do merge.

### Grupo 14 — [DRAGON_BALL] — Franchise ID: 223
ROOT: Dragon Ball (mal_id=223, Tipo: TV, Ano: 1986)
  - mal_id=813 | Dragon Ball Z | TV | 1989 | [SEASON]
  - mal_id=225 | Dragon Ball GT | TV | 1996 | [SEASON]
  ⚠️ RECOMENDAÇÃO: Dragon Ball tem múltiplas séries (DB, DBZ, DBGT, DBS) que são sequências legítimas. **Sugiro mergir como temporadas**, mas DBGT é não-canon — sua decisão.

### Grupo 32 — [FATE] — Franchise ID: 10087
ROOT: Fate/Zero (mal_id=10087, Tipo: TV, Ano: 2011)
  - mal_id=25537 | Fate/stay night: Heaven's Feel - I. Presage Flower | Movie | 2017 | [RELATED]
  - mal_id=356 | Fate/stay night | TV | 2006 | [SEASON]
  ⚠️ RECOMENDAÇÃO: Fate tem múltiplas rotas alternativas (Stay Night, Unlimited Blade Works, Heaven's Feel) que NÃO são sequências lineares. O prequel chain pode estar conectando rotas alternativas como se fossem temporadas. **Sugiro NÃO mergir rotas alternativas como temporadas** — apenas sequências diretas (Fate/Zero → Stay Night). Decisão sua.

### Grupo 36 — [MONOGATARI] — Franchise ID: 9260
ROOT: Kizumonogatari Part 1: Iron-Blooded (mal_id=9260, Tipo: Movie, Ano: 2016)
  - mal_id=15689 | Nekomonogatari Black | TV Special | 2012 | [SEASON]
  ⚠️ RECOMENDAÇÃO: Monogatari tem ordem de lançamento ≠ ordem cronológica. O prequel chain do MAL pode não refletir a ordem canônica de exibição. **Sugiro revisar manualmente a ordem das temporadas** antes do merge.

### Grupo 41 — [EVANGELION] — Franchise ID: 2759
ROOT: Evangelion: 1.0 You Are (Not) Alone (mal_id=2759, Tipo: Movie, Ano: 2007)
  - mal_id=3784 | Evangelion: 2.0 You Can (Not) Advance | Movie | 2009 | [RELATED]
  ⚠️ RECOMENDAÇÃO: Evangelion tem a série original (1995) + Rebuild movies (roteiro divergente). Rebuilds são remakes/reimaginados, NÃO sequências. **Sugiro NÃO mergir Rebuilds como temporadas** — devem ser [RELATED].

### Grupo 47 — [EVANGELION] — Franchise ID: 30
ROOT: Neon Genesis Evangelion (mal_id=30, Tipo: TV, Ano: 1995)
  - mal_id=32 | Neon Genesis Evangelion: The End of Evangelion | Movie | 1997 | [RELATED]
  ⚠️ RECOMENDAÇÃO: Evangelion tem a série original (1995) + Rebuild movies (roteiro divergente). Rebuilds são remakes/reimaginados, NÃO sequências. **Sugiro NÃO mergir Rebuilds como temporadas** — devem ser [RELATED].

## 5. RAÍZES FALTANTES
**4 de 47 grupos** têm a raiz real fora do banco (precisa "Importar raiz" antes do merge):

- Franchise ID 16916: Kuroko's Basketball: Tip Off (2013) — 3 membros dependentes
- Franchise ID 31757: Kizumonogatari Part 2: Hot-Blooded (2016) — 3 membros dependentes
- Franchise ID 28405: Assassination Classroom: Meeting Time (2014) — 2 membros dependentes
- Franchise ID 10897: Haganai: Black Hotpot Gives Girls a Bad Smell (2011) — 2 membros dependentes