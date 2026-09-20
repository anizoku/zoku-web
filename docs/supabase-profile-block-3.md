# Bloco 3 — layout e perfis Supabase

## Plano registrado antes de implementar

- Manter o app legado isolado; novos componentes usam somente o contexto/cliente Supabase, reutilizando componentes visuais sem chamadas Base44.
- Layout responsivo com navegação, identidade e logout centralizados. Perfil próprio em /profile, perfil compartilhável em /u/:profileId (UUID); antigos links por email não consultam usuários nem fazem busca por email.
- Perfil próprio usa get_my_profile. Perfil público usa public_profiles com colunas explícitas, filtro por UUID e RLS; ausente/privado compartilham estado neutro. Acesso público não exige onboarding do visitante.
- Edição via update_profile: nome, username, bio, país, idioma, links permitidos, favoritos e visibilidades. Sem mutação de role/XP/IDs/avatar_url/banner_url.
- Avatar/banner: upload privado com path UUID/arquivo aleatório, MIME e limites iguais aos buckets; associação/remoção pelos RPCs. Crop v2 sempre vinculado ao path canônico. URLs assinadas curtas para exibição, nunca persistidas como campos do perfil.
- Preservar estado contra respostas atrasadas e troca de sessão. Sem listas de todos os usuários e sem email como identidade.
- Não migrar XP/achievements, Social, catálogo ou listas neste bloco. Não fabricar estatísticas de recursos ainda não conectados.
- Testes de contratos, erros, mídia, privacidade, UI, lint/build e smoke visual com a conta existente. Sem alterações de dados pessoais para testes remotos sem conteúdo solicitado pelo usuário.

## Implementação entregue

- `src/components/supabase/ProfileLayout.jsx`: navegação lateral/móvel, cabeçalho com identidade do contexto, logout e fallback para visitante. Sem queries Base44/SiteConfig/chat.
- `src/components/supabase/ProfilePage.jsx`: perfil próprio e compartilhável, bio/país/links/favoritos, edição, mídia e link por UUID. Não calcula XP nem apresenta estatísticas inventadas de listas/posts.
- `src/components/supabase/EditProfileDialog.jsx`: edição por whitelist de campos via update_profile; links x/instagram/tiktok/youtube/website, país normalizado, favoritos limpos com [] e privacidade. Cancelar não grava.
- `src/components/supabase/ProfilePhotos.jsx`: upload, desassociação e crop com componente visual existente. Sem campo para colar URL externa. Limites: avatar 5 MiB, banner 10 MiB; JPEG/PNG/WebP.
- `src/components/supabase/ProfileMedia.jsx`: assinatura de URLs por 60 segundos, renovada a cada 45 segundos; estado vinculado a visitante/perfil/path, ignorando respostas antigas. URLs nunca são gravadas nos perfis.
- `src/lib/supabaseProfileService.js`: contratos e validação. Leitura pública filtrada por UUID com projeção explícita; não consulta profiles diretamente, lista usuários ou usa email como chave. Crop salva path canônico, não URL assinada.
- `src/lib/supabaseAuthStore.js`, `src/lib/SupabaseAuthContext.jsx`: serviço de perfil e mutações seguidas de get_my_profile, com verificação da identidade antes de publicar o resultado.
- `src/SupabaseApp.jsx`: /profile e /u/:profileId ativados no layout novo; perfil compartilhável acessível sem sessão conforme RLS. Onboarding permanece fora do layout.
- Testes: `tests/supabase-profile.test.js` e `tests/supabase-profile-ui.test.jsx`. `package.json`, `eslint.config.js`, `vitest.config.js` atualizados para execução/cobertura.

Os componentes antigos de Profile/PublicProfile/EditProfileDialog/layout permanecem apenas na entrada LegacyApp. A remoção física desses arquivos e do SDK/plugin Base44 fica para a eliminação final do legado; o build Supabase não os importa.

## Decisões e limites

- Links antigos /u/<email> exibem perfil indisponível, sem tentar associar email a conta nova. Novos links usam UUID estável mesmo após mudar username.
- RLS governa a leitura de perfis privados/amigos; ausência e falta de acesso compartilham mensagem neutra. A tela pública reconsulta a cada 45 s e remove dados após negativa/erro. Uma URL de mídia já assinada pode permanecer válida até expirar (60 s); não representa revogação instantânea.
- Remover foto chama remove_avatar/remove_banner e limpa a seleção/crop. Não exclui fisicamente arquivos do bucket. Fotos substituídas ou uploads cuja associação falhou podem permanecer privados para o proprietário. Limpeza de órfãos exige tarefa própria, evitando excluir um arquivo reselecionado em outra aba ou uma associação cujo sucesso não chegou ao cliente.
- Falha de reconsulta após mutação não desfaz escrita já aceita. O gate oferece retry. Operações não são uma transação conjunta entre Storage e banco.
- Fotos salvam imediatamente; o formulário textual só salva ao confirmar. Nenhum upload/mutação real dos dados pessoais do usuário foi executado durante o smoke.
- Social, listas, catálogo, cálculos XP, conquistas e seleção de badge continuam fora deste bloco. Não foram adicionadas migrations, alteradas políticas ou realizado deploy.

## Validação

- 17 testes de sessão existentes passaram.
- 14 testes de serviço de perfil passaram: whitelist, normalização, links seguros, UUID, erros RPC, upload/path/limites, falha no Storage, troca de conta, remoção e crop canônico.
- 46 testes React/router passaram: 35 auth existentes + 11 perfil (edição, cancelamento, conflito, fotos, perfil público/privado, links antigos, logout).
- Total: 77 testes. Os testes de mutação e mídia usam SDK simulado; não substituem smoke de upload/edição com arquivo/dados escolhidos pelo usuário.
- Lint direcionado passou. Lint geral continua com os 47 erros de imports não usados já existentes.
- Build Supabase passou em dist-supabase; inspeção de JS sem referências Base44. git diff --check passou.
- Smoke no navegador autenticado: layout novo, perfil Raphael/@raposo, edição aberta e cancelada sem mudanças, e perfil compartilhável real carregados. Console sem erros observados nessa verificação.
- SDK real anônimo consultou public_profiles para o UUID visível no link compartilhável: perfil público encontrado, sem role, email ou profile_setup_completed na projeção. Nenhum token/senha coletado e nenhuma escrita remota executada.

## Próximo passo

Validar manualmente edição e fotos com conteúdo escolhido pelo usuário. Depois planejar o bloco de catálogo/listas em UUID; Social permanece separado. Não considerar os placeholders dessas áreas como funcionalidades migradas.

Referência oficial de URLs assinadas: https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl .
