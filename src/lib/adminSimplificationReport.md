# Admin Simplification Report

**Data:** 2026-09-07
**Status:** SIMPLIFICAÇÃO COMPLETA
**Princípio:** Reorganização de UI sem remoção destrutiva
**Zero deleções de dados congelados · Zero alterações de backend · Anime continua ativo**

---

## 1. ESTRUTURA ANTIGA

Navegação principal com 11 tabs técnicas expostas:

1. Catálogo Dinâmico
2. Catálogo (CategoryManager)
3. Sincronização
4. Sugestões
5. Moderação
6. Manutenção
7. Unificar Obras
8. Notícias
9. Aparência
10. Banners
11. Arte de Fãs

**Problemas:**
- Nomes técnicos expostos (Jikan, TMDB, Híbrida, CatalogSync, Dynamic Catalog)
- Ações de categorias congeladas visíveis no fluxo diário
- Sem agrupamento lógico — cada ferramenta era uma tab separada
- Ferramentas destrutivas (Manutenção) no mesmo nível que ações cotidianas

---

## 2. ESTRUTURA NOVA

5 tabs principais orientadas a tarefas:

```
Admin
├── Catálogo
│   ├── [AdminScopeStatus — banner informativo]
│   ├── Ações (DynamicCatalogPanel)
│   ├── Histórico de sincronização (CatalogSync)
│   └── Visibilidade (CategoryManager)
├── Obras
│   └── Unificar franquias (FranchiseMerger)
├── Comunidade
│   ├── Sugestões (SuggestionsPanel)
│   └── Moderação (ModerationPanel)
├── Conteúdo
│   ├── Notícias (NewsManager)
│   ├── Banners (BannersPanel)
│   └── Arte de fãs (FanArtPanel)
└── Configurações
    ├── Aparência (AppearanceManager)
    └── Avançado (MigrateEntriesPanel)
```

---

## 3. COMPONENTES REORGANIZADOS

| Componente | Local antigo | Local novo |
|-----------|-------------|------------|
| DynamicCatalogPanel | Tab "Catálogo Dinâmico" | Catálogo > Ações |
| CatalogSync | Tab "Sincronização" | Catálogo > Histórico de sincronização |
| CategoryManager | Tab "Catálogo" | Catálogo > Visibilidade |
| FranchiseMerger | Tab "Unificar Obras" | Obras > Unificar franquias |
| SuggestionsPanel | Tab "Sugestões" | Comunidade > Sugestões |
| ModerationPanel | Tab "Moderação" | Comunidade > Moderação |
| NewsManager | Tab "Notícias" | Conteúdo > Notícias |
| BannersPanel | Tab "Banners" | Conteúdo > Banners |
| FanArtPanel | Tab "Arte de Fãs" | Conteúdo > Arte de fãs |
| AppearanceManager | Tab "Aparência" | Configurações > Aparência |
| MigrateEntriesPanel | Tab "Manutenção" | Configurações > Avançado |

**Novo componente:**
- `AdminScopeStatus` — banner informativo no topo de Catálogo mostrando modo atual, categorias ativas e congeladas (somente leitura)

---

## 4. TABS REMOVIDAS DA NAVEGAÇÃO PRINCIPAL

Nenhuma funcionalidade foi deletada. As seguintes tabs deixaram de ser tabs principais e foram reorganizadas como sub-tabs:

- Catálogo Dinâmico → sub-tab de Catálogo
- Catálogo → sub-tab de Catálogo
- Sincronização → sub-tab de Catálogo
- Sugestões → sub-tab de Comunidade
- Moderação → sub-tab de Comunidade
- Manutenção → sub-tab de Configurações > Avançado
- Unificar Obras → sub-tab de Obras
- Notícias → sub-tab de Conteúdo
- Aparência → sub-tab de Configurações
- Banners → sub-tab de Conteúdo
- Arte de Fãs → sub-tab de Conteúdo

---

## 5. FERRAMENTAS PRESERVADAS

Todos os componentes foram preservados integralmente:
- DynamicCatalogPanel — handlers de manga/híbrida mantidos no código
- CatalogSync — handlers de manga/híbrida mantidos no código
- CategoryManager — guards de freeze mantidos
- FranchiseMerger — guards de freeze mantidos
- MigrateEntriesPanel — filtros ANIME_ONLY mantidos
- AdminEditCardModal — guards de freeze mantidos
- SuggestionsPanel — mutation guard mantido

---

## 6. FERRAMENTAS MOVIDAS PARA AVANÇADO

| Ferramenta | Localização |
|-----------|-------------|
| MigrateEntriesPanel | Configurações > Avançado |
| Importar mangás populares (DynamicCatalogPanel) | Oculto durante ANIME_ONLY |
| Importação híbrida (DynamicCatalogPanel) | Oculto durante ANIME_ONLY |
| Sincronizar mangás (CatalogSync) | Oculto durante ANIME_ONLY |
| Animes (Híbrida) (CatalogSync) | Oculto durante ANIME_ONLY |
| Mangás (Híbrida) (CatalogSync) | Oculto durante ANIME_ONLY |

---

## 7. AÇÕES OCULTADAS POR FREEZE

Durante ANIME_ONLY, as seguintes ações não aparecem na interface diária:

**DynamicCatalogPanel:**
- "Importar mangás populares" — oculto (handler preservado)
- "Importação híbrida (Jikan + TMDB)" — oculto (handler preservado)

**CatalogSync:**
- "Sincronizar mangás" — oculto (handler preservado)
- "Animes (Híbrida)" — oculto (handler preservado)
- "Mangás (Híbrida)" — oculto (handler preservado)

**AdminEditCardModal:**
- Blocos de imagem de categorias congeladas sem override existente — não renderizados (reduz ruído visual)

**SuggestionsPanel:**
- Botão "Aprovar" para sugestões de categorias congeladas — substituído por mensagem "Categoria congelada — aprovação indisponível"
- Botão "Rejeitar" — permanece ativo

---

## 8. MUDANÇAS DE NOMENCLATURA

| Antes (técnico) | Depois (orientado a objetivo) |
|----------------|------------------------------|
| Catálogo Dinâmico | Catálogo de Anime |
| Sincronização do Catálogo | Atualização do catálogo |
| Top 500 Animes (Jikan) | Importar animes populares |
| Top 500 Mangás (Jikan) | Importar mangás populares |
| Sincronizar Agora | Sincronizar animes em exibição |
| Próxima Temporada | Buscar próxima temporada |
| Animes (Jikan) | Sincronizar animes em exibição |
| Tudo (Jikan) / Todos os Animes (Jikan) | Atualizar todos os animes |
| Mangás (Jikan) | Sincronizar mangás |
| Híbrida (Jikan + TMDB) | Importação híbrida (Jikan + TMDB) |
| Unificação de Obras | Unificar franquias |
| Manutenção | Avançado |
| Importação automática do Jikan API | Fonte: MAL/Jikan |
| modo Jikan ou Híbrida (Jikan/TMDB) | Fonte: MAL/Jikan |

---

## 9. RISCOS ENCONTRADOS

| Risco | Mitigação |
|-------|-----------|
| Admin pode tentar aprovar sugestão congelada via API direta | Mutation guard em SuggestionsPanel bloqueia antes do write |
| Admin pode tentar importar manga via código | Library guard em catalogAutoSync bloqueia antes do fetch |
| Blocos vazios de categorias congeladas poluem o Editor de Card | AdminEditCardModal não renderiza blocos congelados sem override |
| FranchiseMerger pode deletar obras multi-categoria | Guard existente preserva obras com categorias congeladas |
| MigrateEntriesPanel pode processar entries congeladas | Filtro ANIME_ONLY existente preservado |

---

## 10. CONFIRMAÇÕES

### Zero deleções de dados congelados
- ✅ Nenhum dado de manga/movie/liveaction foi deletado
- ✅ FranchiseMerger preserva obras multi-categoria com categorias congeladas
- ✅ MigrateEntriesPanel filtra entries congeladas (preservadas, não processadas)
- ✅ AdminEditCardModal preserva overrides existentes em categorias congeladas

### Backend não foi alterado
- ✅ anilistCatalogSync — sem alterações
- ✅ malCatalogSync — sem alterações
- ✅ scopeConfig backend — sem alterações
- ✅ SyncLog, WorkRelease, ExternalMapping — sem alterações
- ✅ Supabase files — sem alterações

### Anime continua ativo
- ✅ Importar animes populares — ativo
- ✅ Sincronizar animes em exibição — ativo
- ✅ Buscar próxima temporada — ativo
- ✅ Atualizar todos os animes — ativo
- ✅ Anime format=MOVIE — ativo (category=anime)

### Freeze preservado
- ✅ manga não sincroniza (handlers preservados, UI oculta)
- ✅ manga não importa (handlers preservados, UI oculta)
- ✅ manga não recebe admin writes pelos fluxos protegidos
- ✅ movie/liveaction não sincronizam
- ✅ TMDB movie/liveaction não importa
- ✅ Zero API calls para categorias congeladas através dos fluxos administrativos protegidos

---

## 11. ARQUIVOS MODIFICADOS

| Arquivo | Tipo |
|---------|------|
| src/pages/Admin.jsx | Reescrito — nova navegação |
| src/components/admin/AdminScopeStatus.jsx | Novo — banner informativo |
| src/components/admin/DynamicCatalogPanel.jsx | Simplificado — UI e nomes |
| src/components/admin/CatalogSync.jsx | Simplificado — UI e nomes |
| src/components/admin/SuggestionsPanel.jsx | Simplificado — approve oculto para frozen |
| src/components/admin/MigrateEntriesPanel.jsx | Wrapper com aviso "Ferramenta avançada" |
| src/components/admin/FranchiseMerger.jsx | Aviso simplificado |
| src/components/admin/AdminEditCardModal.jsx | Blocos congelados vazios ocultos |
| src/lib/adminAnimeOnlyAudit.md | Linguagem corrigida |
| src/lib/animeOnlyFreezeReport.md | Linguagem corrigida |
| src/lib/adminSimplificationReport.md | Novo — este relatório |

---

## 12. GO / NO-GO

### ✅ **GO** — Área Admin simplificada com sucesso

- ✅ Navegação reduzida de 11 tabs técnicas para 5 tabs orientadas a tarefas
- ✅ Nomes técnicos substituídos por linguagem funcional
- ✅ Ações de categorias congeladas ocultas do fluxo diário
- ✅ Ferramentas avançadas movidas para Configurações > Avançado
- ✅ Banner informativo AdminScopeStatus no topo de Catálogo
- ✅ Zero deleções de dados congelados
- ✅ Backend não foi alterado
- ✅ Anime continua ativo (incluindo format=MOVIE)
- ✅ Todos os guards de freeze preservados
- ✅ Todos os handlers preservados no código