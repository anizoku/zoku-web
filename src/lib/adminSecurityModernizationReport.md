# Admin Security + Modernization Report

**Date:** 2026-09-07
**Phase:** Security + Modernization (Área Admin)
**Status:** ✅ GO

---

## 1. Vulnerabilidades/Problemas Encontrados

### 🔴 CRÍTICO: Auto-sync no AppLayout
**Problema:** `src/components/layout/AppLayout.jsx` executava `syncCurrentlyAiring()` e `discoverNewSeason()` automaticamente a cada 6 horas via `sessionStorage`. Qualquer usuário autenticado podia iniciar código de sincronização e chamadas ao Jikan.

**Impacto:** Usuário normal podia inadvertidamente iniciar sync do catálogo, chamadas Jikan, e criação/update de DynamicWork.

**Correção:** Removido completamente o `useEffect` de auto-sync do AppLayout. As funções `syncCurrentlyAiring` e `discoverNewSeason` foram preservadas em `src/lib/catalogAutoSync.js` — apenas removida a execução automática do layout público.

### 🟡 MODERADO: Admin sem route guard
**Problema:** `/admin` era protegido apenas pelo `Admin.jsx` interno que fazia `navigate("/")` se `user.role !== "admin"`. O componente Admin montava antes da verificação, executando queries admin.

**Correção:** Criado `RequireAdmin` route guard. `/admin` agora é protegido ANTES do componente montar.

### 🟡 MODERADO: Admin no bundle principal
**Problema:** `Admin` era importado estaticamente, carregando todo o código administrativo no bundle de todos os usuários.

**Correção:** `Admin` agora usa `React.lazy` com `Suspense`.

### 🟡 BAIXO: Auth descentralizada
**Problema:** Múltiplos componentes chamavam `base44.auth.me()` independentemente para descobrir a role do usuário.

**Correção:** `AuthContext` agora fornece `isAdmin` centralizado. `UserMenuButton` e `AppLayout` migrados para `useAuth()`.

---

## 2. Arquivos Modificados

### Segurança
| Arquivo | Mudança |
|---------|---------|
| `src/components/layout/AppLayout.jsx` | Removido auto-sync; migrado para `useAuth()` |
| `src/lib/AuthContext.jsx` | Adicionado `isAdmin` derivado |
| `src/components/RequireAdmin.jsx` | **NOVO** — Route guard admin-only |
| `src/App.jsx` | Lazy load Admin + RequireAdmin wrapper |
| `src/components/layout/UserMenuButton.jsx` | Migrado para `useAuth()` + `isAdmin` |

### Modernização
| Arquivo | Mudança |
|---------|---------|
| `src/pages/Admin.jsx` | Reescrito — AdminShell com menu vertical |
| `src/components/admin/AdminShell.jsx` | **NOVO** — Shell com menu vertical (desktop) + tabs scrolláveis (mobile) |
| `src/components/admin/AdminOverview.jsx` | **NOVO** — Visão Geral com stat cards + ações rápidas |
| `src/components/admin/CatalogSection.jsx` | **NOVO** — Sub-navegação: Atualização, Visibilidade, Avançado |
| `src/components/admin/CatalogUpdatePanel.jsx` | **NOVO** — Sync actions + histórico (SyncRun) |
| `src/components/admin/CatalogAdvancedPanel.jsx` | **NOVO** — Importação em massa + unificar franquias |
| `src/components/admin/SyncHistorySection.jsx` | **NOVO** — Histórico expandable de SyncRun |
| `src/components/admin/DynamicCatalogPanel.jsx` | Corrigido total do catálogo (anime ativo apenas) |

---

## 3. Como /admin Está Protegido

### Defense-in-Depth (3 camadas)

```
Camada 1: RequireAdmin (Route Guard)
  → Verifica user.role === "admin" ANTES do componente montar
  → Non-admin → NotFound (área admin invisível)
  → Não autenticado → fluxo normal de login

Camada 2: Lazy Loading
  → Admin component só é carregado se RequireAdmin passar
  → Usuário comum nunca baixa código administrativo

Camada 3: RLS + Backend (fonte real de autorização)
  → Entidades admin exigem role=admin para CUD
  → Backend functions verificam user.role === 'admin' → 403 se não
```

---

## 4. Confirmação: Botão Invisível para Usuário Comum

### UserMenuButton
- **ADMIN:** Vê "Área admin" com ícone ShieldCheck no menu de usuário
- **USER:** Não vê o botão, não vê separator vazio (separator só renderiza se `isAdmin`)
- **GUEST:** Não vê o botão

### Auditoria de Navegação
| Componente | Link /admin? | Status |
|------------|-------------|--------|
| `Sidebar.jsx` | Não | ✅ |
| `MobileNav.jsx` | Não | ✅ |
| `TopBar.jsx` | Não | ✅ |
| `UserMenuButton.jsx` | Sim, condicional `isAdmin` | ✅ |
| `Breadcrumbs.jsx` | Label "Admin" apenas quando em /admin | ✅ |
| `Profile.jsx` | Não | ✅ |
| `Home.jsx` | Não | ✅ |

---

## 5. Confirmação: Auto-sync Removido do AppLayout

**Antes:**
```jsx
// AppLayout.jsx — REMOVIDO
useEffect(() => {
  // sessionStorage check + syncCurrentlyAiring() + discoverNewSeason()
}, []);
```

**Depois:**
```jsx
// AppLayout.jsx — Limpo
export default function AppLayout() {
  useAutoImageRefresh();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user: currentUser } = useAuth();
  // ...apenas layout
}
```

**Onde sync agora acontece:**
- ✅ Área Admin (CatalogUpdatePanel) — explícito, admin-only
- ✅ Backend function autorizada (anilistCatalogSync, malCatalogSync)
- 🔜 Futuramente via scheduler backend (não implementado agora)

---

## 6. Auditoria RLS

### Entidades Administrativas (CUD = admin-only)

| Entidade | READ | CREATE | UPDATE | DELETE | Status |
|----------|------|--------|--------|--------|--------|
| `DynamicWork` | Público | admin | admin | admin | ✅ Correto |
| `WorkRelease` | Público | admin | admin | admin | ✅ Correto |
| `ExternalMapping` | Público | admin | admin | admin | ✅ Correto |
| `WorkCategoryVisibility` | Público | admin | admin | admin | ✅ Correto |
| `CardOverride` | Público | admin | admin | admin | ✅ Correto |
| `CatalogSync` | Público | admin | admin | admin | ✅ Correto |
| `SyncRun` | admin | admin | admin | admin | ✅ Correto |
| `SyncLog` | admin | admin | admin | admin | ✅ Correto |
| `SyncConflict` | admin | admin | admin | admin | ✅ Correto |
| `News` | Público (status=publicado) | admin | admin | admin | ✅ Correto |
| `SiteConfig` | Público | admin | admin | admin | ✅ Correto |
| `FanArt` | Público | admin | admin | admin | ✅ Correto |
| `PlatformBanner` | Público | admin | admin | admin | ✅ Correto |
| `LoginBackgroundImage` | Público | admin | admin | admin | ✅ Correto |

### Entidades com Exceções Legítimas

| Entidade | READ | CREATE | UPDATE | DELETE | Exceção |
|----------|------|--------|--------|--------|---------|
| `WorkSuggestion` | Dono ou admin | Dono | admin | admin | Usuário cria própria sugestão; review é admin-only |
| `ContentReport` | Dono ou admin | Dono | admin | admin | Usuário cria própria denúncia; review é admin-only |

**Conclusão:** RLS está correta. Nenhuma mudança necessária.

---

## 7. Auditoria Backend Functions

### `anilistCatalogSync` (entry.ts)
```typescript
const user = await base44.auth.me();
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
```
- ✅ Verifica usuário autenticado
- ✅ Verifica `role === 'admin'`
- ✅ Retorna 403 para não-admin
- ✅ Não confia em parâmetro do frontend
- ✅ Usa `base44.auth.me()` (server-side, token real)

### `malCatalogSync` (entry.ts)
```typescript
const user = await base44.auth.me();
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
```
- ✅ Verifica usuário autenticado
- ✅ Verifica `role === 'admin'`
- ✅ Retorna 403 para não-admin
- ✅ Não confia em parâmetro do frontend
- ✅ Usa `base44.auth.me()` (server-side, token real)

**Conclusão:** Backend functions estão corretas. Nenhuma mudança necessária.

---

## 8. Nova Estrutura Visual

### AdminShell
```
Desktop:
┌────────────────────────────────────────────────────┐
│ Administração              ● Anime Only             │
├──────────────┬─────────────────────────────────────┤
│ Visão Geral  │                                     │
│ Catálogo     │       Conteúdo selecionado          │
│ Comunidade 4 │                                     │
│ Conteúdo     │                                     │
│ Configurações│                                     │
│              │                                     │
│              │                                     │
└──────────────┴─────────────────────────────────────┘
  ← Voltar ao Zoku (header)

Mobile:
┌────────────────────────────────────────────────────┐
│ Administração              ● Anime Only    ← Zoku  │
├────────────────────────────────────────────────────┤
│ [Visão Geral] [Catálogo] [Comunidade 4] [Conteúdo] │ ← scroll
├────────────────────────────────────────────────────┤
│                                                    │
│       Conteúdo selecionado                         │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Seções
1. **Visão Geral** — Stat cards (animes ativos, releases, sugestões, denúncias) + status do catálogo + ações rápidas
2. **Catálogo** — Sub-nav: Atualização (sync + histórico), Visibilidade, Avançado (import + franquias)
3. **Comunidade** — Sugestões + Moderação (com contadores)
4. **Conteúdo** — Notícias + Banners + Arte de fãs
5. **Configurações** — Aparência + Avançado (corrigir entries)

### Mudanças Visuais
- Menu vertical interno no desktop (não segunda sidebar gigante)
- Tabs horizontais scrolláveis no mobile
- Badge "Anime Only" compacto no header (não card grande)
- Categorias congeladas em texto secundário/tooltip
- Cards com bordas discretas, whitespace, ícones Lucide consistentes
- Menos caixas dentro de caixas, menos tabs aninhadas
- Ações primárias destacadas, destructive separado visualmente
- Confirmações para importação em massa e unificar franquias

---

## 9. Testes Admin/User/Guest

### ADMIN
- ✅ Vê "Área admin" no menu de usuário
- ✅ `/admin` carrega (RequireAdmin passa)
- ✅ Admin component monta via lazy load
- ✅ Queries admin executam (RLS permite)
- ✅ Sincronização disponível no Catálogo > Atualização

### USER NORMAL
- ✅ Não vê "Área admin" no menu
- ✅ Não vê separator vazio
- ✅ `/admin` mostra NotFound (RequireAdmin bloqueia)
- ✅ Admin component NÃO monta (lazy + guard)
- ✅ Nenhuma query admin executa
- ✅ Nenhuma função de sync executa pelo AppLayout (auto-sync removido)
- ✅ Tentativa de backend sync → 403
- ✅ Tentativa de write administrativo → RLS bloqueia

### GUEST
- ✅ Não vê botão admin
- ✅ Comportamento auth normal (redirect para login)

---

## 10. Teste Responsivo

### Desktop (1223px+)
- ✅ Menu vertical à esquerda (w-56)
- ✅ Conteúdo à direita com max-w-7xl
- ✅ Header sticky com badge Anime Only

### Tablet (768px-1223px)
- ✅ Menu vertical visível (lg breakpoint)
- ✅ Cards grid responsivo (2-4 colunas)

### Mobile (<768px)
- ✅ Tabs horizontais scrolláveis no topo
- ✅ Cards em grid 2 colunas
- ✅ Ações acessíveis (flex-wrap)
- ✅ Histórico com colunas ocultas em telas pequenas (sm:block)

---

## 11. Correção do Total do Catálogo

**Problema:** `DynamicCatalogPanel` mostrava total de todos os DynamicWork (incluindo categorias congeladas), mas o painel dizia "Catálogo de Anime".

**Correção:** Agora filtra por `hasActiveCategory(parseCategories(work))` — conta apenas obras com categoria anime ativa.

**Também corrigido em:** `CatalogUpdatePanel` e `AdminOverview` (mesmo helper).

---

## 12. Confirmações para Ações Sensíveis

| Ação | Confirmação | Mensagem |
|------|------------|----------|
| Importar animes populares | `window.confirm` | "Confirmar importação em massa..." |
| Importação híbrida | `window.confirm` | "Confirmar importação híbrida..." |
| Unificar franquias | Existente no FranchiseMerger | Preservado |
| Corrigir entries | Existente no MigrateEntriesPanel | Preservado |

---

## 13. Riscos Restantes

1. **SessionStorage limpo:** Usuários que tinham `zoku_last_auto_sync` no sessionStorage não terão mais auto-sync. Sem impacto (comportamento desejado).
2. **DynamicCatalogPanel não usado:** O componente antigo foi preservado mas não é mais renderizado. Pode ser removido futuramente se confirmado obsoleto.
3. **AdminScopeStatus não usado:** O componente antigo foi preservado mas não é mais renderizado (badge compacto no header substitui).
4. **Scheduler backend não criado:** Sync automático agora é apenas manual. Futuramente, um workflow scheduled pode substituir o auto-sync removido.

---

## 14. GO / NO-GO

### ✅ GO

**Segurança:**
- ✅ Auto-sync removido do AppLayout
- ✅ RequireAdmin route guard ativo
- ✅ Lazy loading implementado
- ✅ Auth centralizada com `isAdmin`
- ✅ RLS auditada — correta
- ✅ Backend functions auditadas — corretas
- ✅ Botão admin invisível para usuário comum

**Modernização:**
- ✅ AdminShell com menu vertical
- ✅ Visão Geral com stat cards
- ✅ Catálogo reorganizado (Atualização, Visibilidade, Avançado)
- ✅ Histórico de atualizações (SyncRun)
- ✅ Total do catálogo corrigido (anime ativo apenas)
- ✅ Confirmações para ações sensíveis
- ✅ Design moderno, responsivo, identidade AniZoku

**Preservação:**
- ✅ Zero dados alterados
- ✅ Zero sync real executado
- ✅ Supabase baseline intacto
- ✅ Freeze ANIME_ONLY preservado
- ✅ Ferramentas administrativas preservadas
- ✅ Backend atual intacto
- ✅ RLS continua como fonte real de autorização