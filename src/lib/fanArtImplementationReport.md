# FanArt — Relatório de Implementação

## Status

```
FANART_MODE = ADMIN_CURATED
FANART_HOME_DISPLAY = ACCORDION
FANART_HEADER_STRIP = PRESERVED
FANART_ORDER = ADMIN_ONLY
FANART_WORK_LINK = CATALOG_PICKER
FANART_PUBLIC_READ_ACTIVE_ONLY = IMPLEMENTED
```

---

## Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `base44/entities/FanArt.jsonc` | Adicionados `source_url` e `credit_notes`; atualizadas descrições de `order` e `work_title`; RLS read agora filtra `active=true` OR `role=admin` |
| `src/components/home/FanArtStrip.jsx` | Preservada barra compacta; substituído carrossel expandido por `<FanArtAccordion>` |
| `src/components/home/FanArtAccordion.jsx` | **Novo** — accordion visual horizontal (desktop) + vertical (mobile) |
| `src/components/admin/fanart/WorkPicker.jsx` | **Novo** — seletor de obra do catálogo (substitui edição manual de slug) |
| `src/components/admin/fanart/FanArtPanel.jsx` | WorkPicker substitui campos de slug/título; `artist_name` obrigatório para novas artes; preview 4:5; campos `source_url` e `credit_notes` |
| `src/lib/fanArtImplementationReport.md` | **Novo** — este relatório |

---

## Schema (FanArt)

Campos existentes (preservados):
- `image_url` (string, required)
- `title` (string, opcional)
- `work_slug` (string, opcional — preenchido pelo WorkPicker)
- `work_title` (string, opcional — preenchido pelo WorkPicker)
- `artist_name` (string — obrigatório para novas artes via UI)
- `artist_instagram` (string)
- `artist_twitter` (string)
- `artist_website` (string)
- `active` (boolean, default true)
- `order` (number, default 0 — organização no Admin apenas)

Campos novos:
- `source_url` (string, opcional) — URL da publicação/origem original da arte
- `credit_notes` (string, opcional) — observação interna sobre crédito/permissão (admin only, não aparece na Home)

---

## RLS

### Antes

```json
"read": {}
```

Qualquer usuário autenticado (e, se o app ficasse público, qualquer visitante) podia ler todas as FanArts, incluindo `active=false`.

### Depois

```json
"read": {
  "$or": [
    { "data.active": true },
    { "user_condition": { "role": "admin" } }
  ]
}
```

- Admin lê todas (incluindo inativas) → painel admin continua funcional.
- Usuário/público lê somente `active=true` → prepara para futura mudança de App Visibility para Public.

### Confirmação de sintaxe

O padrão `$or` com `data.<field>` + `user_condition.role` é o mesmo usado pela entidade `News` (campo `data.status: "publicado"`), já em produção neste app. Sintaxe confirmada e segura.

---

## Comportamento Desktop (lg+)

Accordion horizontal:
- Uma arte aberta em destaque (flex-grow: 1), ocupando a maior parte da largura.
- Demais artes como abas estreitas (56px) com título vertical (`writing-mode: vertical-rl`).
- Altura do painel: 460px.
- Ao clicar em outra aba, ela expande suavemente (transition-all duration-300 ease-out); a anterior fecha.
- Imagem ocupa todo o painel (object-cover).
- Overlay inferior com título, artista, "Relacionado a [obra]" (se vinculado), ícones de redes (Instagram/Twitter/Globe) e botão "Ver obra" (se work_slug existir).
- Links externos são `<a target="_blank" rel="noopener noreferrer">` — separados do `<Link>` da obra (sem links aninhados).

---

## Comportamento Mobile (<lg)

Accordion vertical:
- Cada arte é um cabeçalho (thumbnail + título + artista + ChevronDown).
- Ao clicar, o painel atual fecha e o novo abre.
- Altura do painel aberto: 300px.
- Mesmo overlay com informações e links do desktop.
- Sem scroll horizontal obrigatório.

---

## Animação

Implementada com CSS/Tailwind: `transition-all duration-300 ease-out` em flex-grow/flex-basis.
`framer-motion` está instalado no projeto mas não foi necessário — CSS transitions cobrem o efeito suavemente.

---

## Busca de Obra (WorkPicker)

- Usa `useCatalog()` (CatalogContext) como fonte canônica.
- Filtra para `categories.includes("anime")` (respeita ANIME_ONLY).
- Busca por title, romaji_title, franchise_title, slug (case-insensitive, client-side).
- Debounce natural via input + dropdown.
- Ao selecionar: preenche `work_slug` e `work_title` automaticamente.
- Registros antigos com `work_slug` mas sem seleção carregada: resolvidos do catálogo quando possível; senão, exibe slug como fallback.
- "Remover vínculo" limpa ambos os campos.

---

## artist_name

- Obrigatório para novas artes: botão "Adicionar arte" desabilitado se `!image_url || !artist_name.trim()`.
- Registros existentes com `artist_name` vazio não são bloqueados — continuam editáveis.
- Label exibe "Artista *" para indicar obrigatoriedade.

---

## Imagem

- Hint preservado: "Recomendado: retrato 4:5, pelo menos 800px de altura."
- Preview visual 4:5 adicionado no formulário de criação.
- Não rejeita imagens que não sejam 4:5 nesta fase.
- Não comprime/reprocessa a imagem.
- Fallback `ImageOff` no accordion se `image_url` falhar.

---

## Curadoria

FanArt continua sendo **curadoria editorial pelo admin**. NÃO é UGC:
- Sem upload por usuário comum.
- Sem submissões públicas.
- Sem likes, comentários, página individual, denúncias específicas ou moderação adicional.

---

## Compatibilidade

- Registros antigos com `work_slug` e `work_title` continuam funcionando.
- Registros antigos sem `source_url`/`credit_notes` — campos simplesmente vazios.
- Nenhuma migração ou apagamento de dados.

---

## Pendências

Nenhuma pendência crítica. RLS `active-only` foi implementada com sintaxe confirmada.

Dívidas técnicas existentes (não relacionadas a esta tarefa):
- `LOGIN_BACKGROUND_PUBLIC_DATA_ACCESS` — LoginBackgroundImage não pode ser consultada anonimamente enquanto app estiver Private.