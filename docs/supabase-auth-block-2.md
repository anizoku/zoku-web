# Supabase Auth — bloco 2

## Plano antes de alterar

- Separar a entrada legada, carregada somente com a flag Supabase desligada. O modo Supabase não importa AuthContext/Base44, app-params, CatalogProvider ou layout legado.
- Conectar rotas existentes /login, /register, /signup, /forgot-password, /reset-password, /profile-setup e adicionar /auth/callback.
- Cadastro por email com link de confirmação; sessão pendente não autoriza navegação. Reenvio disponível. Retorno same-origin preservado e sanitizado.
- RPC de bootstrap governa onboarding; erros têm retry e não são interpretados como perfil incompleto. Setup mínimo: username, nome e idioma, sem upload/avatar ou gravação Base44.
- Link de recuperação estabelece sessão SDK; alteração usa updateUser e não token legado. Tratar links inválidos/expirados.
- Rotas de áreas ainda não migradas mantêm endereço e exibem indisponibilidade temporária no modo Supabase; nenhuma consulta aos dados legados. / mostra confirmação de acesso e resumo mínimo do perfil.
- Manter ativação explícita por VITE_ENABLE_SUPABASE_AUTH=true, sem fallback para Base44 quando configuração Supabase falha. Não alterar produção, backend ou dados.
- Testes unitários e de integração de rotas com API simulada, lint direcionado/geral e build. Smoke remoto depende de credenciais públicas e configuração de emails/redirects ausentes no checkout.

## Resultado

O modo Supabase agora governa as telas de autenticação e onboarding, sem compartilhar sessão, tokens, cache, roles ou queries com Base44. `src/App.jsx` seleciona a aplicação por flag de build e carrega a entrada escolhida de forma lazy. A aplicação anterior foi preservada em `src/LegacyApp.jsx` sem mudanças de conteúdo.

`src/SupabaseApp.jsx` implementa login, cadastro e confirmação por link, reenvio, recuperação/alteração de senha, gate de sessão/perfil, onboarding mínimo, logout e retorno à rota solicitada. Mantém componentes Input/Button/PasswordInput e classes do tema existente. Não depende de SiteConfig, imagens ou layout servidos pelo Base44. Google/Apple não são exibidos neste fluxo.

O callback é `/auth/callback`; a recuperação é `/reset-password`. O SDK processa links no fluxo implicit somente nesses endereços. Erros de inicialização de callback ficam separados da sessão armazenada: um link inválido não é tratado como bem-sucedido só porque já existe uma sessão. Reset usa `auth.updateUser({ password })` com sessão válida; não usa `resetToken` do Base44. Sessões já autenticadas também podem alterar senha nessa rota; regras adicionais de reautenticação são aplicadas pelo servidor.

Cadastros que retornam session=null permanecem na confirmação, sem ler perfil. Se o backend dispensa confirmação, o usuário segue imediatamente ao bootstrap. As mensagens de envio não afirmam que uma conta existe. O link usa returnTo sanitizado no próprio redirect; funciona sem depender do sessionStorage de outra aba. Links externos, backslashes, caracteres de controle e loops para rotas de auth são rejeitados.

O perfil vem exclusivamente de get_my_profile; erro de bootstrap mostra retry e sair. A conclusão usa exatamente os três argumentos de complete_profile_setup, relê o perfil e só então libera o gate. Username validado conforme migration atual, sem pontos/avatar obrigatório. Troca de usuário limpa o perfil; renovação da mesma sessão preserva o formulário em edição enquanto atualiza o perfil.

A página inicial neste bloco confirma o acesso e exibe o nome. Endereços de catálogo/listas/social/perfis/admin continuam reconhecidos, mas mostram indisponibilidade temporária no modo Supabase. Isso é intencional: tais telas ainda dependem de Base44. Não considerar esse build pronto para substituir o produto completo em produção.

## Configuração local e do projeto

1. Usar `.env.example` como referência e criar `.env.local` com URL e chave pública moderna `sb_publishable_...` do projeto correto.
2. Definir `VITE_ENABLE_SUPABASE_AUTH=true` e reiniciar Vite. Ausência/false mantém a entrada legada; configuração Supabase inválida NÃO ativa fallback Base44.
3. No Supabase Auth, confirmar Site URL e permitir os redirects exatos do ambiente para `/auth/callback` e `/reset-password` (incluindo query returnTo quando aplicável; pode-se usar padrão restrito à rota no ambiente de desenvolvimento conforme documentação Supabase).
4. Conferir confirmação de email, envio/SMTP e templates com `{{ .ConfirmationURL }}`. O código usa `emailRedirectTo` no signup/reenvio e `redirectTo` na recuperação. Não trocar templates para um protocolo customizado token_hash sem implementar esse protocolo.
5. Para teste local, usar a origem efetiva exibida pelo Vite; não presumir porta fixa. Para produção, cadastrar apenas as origens efetivamente usadas.

Nenhum arquivo `.env.local` foi criado e nenhuma configuração remota/SMTP foi alterada. As credenciais públicas foram solicitadas para viabilizar smoke real. Não enviar chave secret/service-role.

## Arquivos deste bloco

- `.env.example`, `.gitignore`: referência de configuração e exclusão do build de validação.
- `src/App.jsx`, `src/LegacyApp.jsx`: seleção explícita de entrada; legado preservado.
- `src/SupabaseApp.jsx`: novas telas e gates para os endereços existentes.
- `src/api/supabaseClient.js`: callbacks de email restritos às rotas dedicadas.
- `src/lib/supabaseAuthStore.js`, `src/lib/SupabaseAuthContext.jsx`: recuperação, reenvio, URLs de confirmação, erros de inicialização e preservação de perfil durante refresh.
- `src/lib/supabaseAuthNavigation.js`: destinos seguros, validação de setup e mensagens.
- `vite.config.js`: alias explícito; plugin/proxy/analytics Base44 desligados no modo Supabase.
- `vitest.config.js`, `tests/supabase-auth-ui.test.jsx`, `tests/supabase-auth.test.js`: integração de rotas e atualização dos contratos.
- `package.json`, `package-lock.json`, `eslint.config.js`: dependências, comandos e cobertura de lint.

## Verificações

- `npm run test:auth`: 17/17 passaram.
- `npm run test:auth-ui`: 31/31 passaram. Integração React/router com SDK simulado: login, cadastro com e sem confirmação, reenvio, onboarding, RPC com conflito, retorno à rota, logout, sessão expirada, refresh, retry de perfil, recuperação, callback inválido mesmo com sessão antiga, configuração ausente e validação de destinos/usernames. Mock Base44 lança erro caso suas rotas sejam importadas pelo app Supabase.
- Lint direcionado: passou. Lint geral: mesmos 47 erros de imports não usados em código legado, sem novos erros.
- Build Supabase: passou, em `dist-supabase/`; inspeção dos JS gerados não encontrou Base44, base44_access_token ou /api/apps/public.
- Build legado: passou em `dist/`; mantém os avisos de configuração Base44 ausente neste checkout. Não houve modificação funcional do app preservado.
- Sem migrações de banco, deploy, contas de teste reais, envio real de emails ou alteração de dados remotos. Build e testes simulados não comprovam entrega de email, configuração de redirects ou RLS real.

## Próxima validação e próximos blocos

Com configuração real: criar conta de teste autorizada, confirmar email, concluir setup, recarregar, sair/entrar, recuperar senha, testar link expirado e rota direta. Verificar no navegador ausência de requests Base44 no modo Supabase. Só ativar como produto padrão quando as áreas necessárias já tiverem sido migradas.

Depois desse smoke, migrar layout e telas de perfil para UUID/RPC/Storage privado, removendo progressivamente os consumidores antigos. Não criar um adaptador de autenticação Base44. Catálogo e Social ficam em blocos próprios. Ao final da migração, remover LegacyApp, SDK/plugin Base44, antigos contextos e a flag de transição.

Referências oficiais: [signup](https://supabase.com/docs/reference/javascript/auth-signup), [recuperação de senha](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [redirects](https://supabase.com/docs/guides/auth/redirect-urls).

## Configuração e verificação remota inicial — 2026-09-20

- `.env.local` configurado com o projeto `xnggztoykbflirtnznjr`, a chave pública fornecida pelo usuário e VITE_ENABLE_SUPABASE_AUTH=true. `git check-ignore` confirmou exclusão do arquivo.
- GET /auth/v1/settings retornou HTTP 200: email habilitado, cadastro habilitado e confirmação obrigatória (mailer_autoconfirm=false).
- SDK real com a chave pública: sessão anônima restaurada sem erro; get_my_profile sem login recusado com 42501 (permission denied), conforme esperado. Não houve escrita remota.
- Servidor local iniciado em http://127.0.0.1:5173. Navegador confirmou login, cadastro e recuperação renderizados; /my-list redirecionou para /login?returnTo=%2Fmy-list e o destino foi preservado ao navegar para cadastro/recuperação. Console sem erros durante essas verificações.
- Painel Supabase exigiu login; Site URL, allowlist de redirects e SMTP ainda não foram inspecionados. Não foram alterados.
- Validação autenticada aguarda e-mail de teste controlado pelo usuário/confirmacao. Nenhuma conta foi criada nem email enviado. Login real, bootstrap autenticado, conclusão de perfil e recuperação real ainda não estão comprovados.

## Smoke autenticado no navegador — 2026-09-20

- Usuário informou confirmação do e-mail e realizou login/onboarding manualmente. Observado no navegador: página inicial saudando Raphael e perfil concluído. Não foi capturado o envio do formulário de onboarding nem a resposta específica do RPC de conclusão.
- Recarregar a página restaurou sessão e perfil real, mantendo a página inicial autenticada, sem erros de console observados nesse teste.
- Acesso direto a /profile-setup redirecionou ao início: perfil já concluído não repete onboarding.
- /my-list manteve o endereço e exibiu indisponibilidade temporária, conforme limite de migração.
- Logout pelo botão Sair concluiu e redirecionou ao login. Nova navegação direta a /my-list, após logout, foi barrada com /login?returnTo=%2Fmy-list; perfil anterior não reapareceu.
- Solicitação de recuperação para o e-mail autorizado concluiu na tela Verifique seu e-mail, sem erro exibido. Isso comprova aceitação da solicitação, não entrega/abertura do email.
- Pendente: usuário abrir o link de recuperação, definir nova senha diretamente e validar novo login. Entrega e redirects do email de recuperação ainda não comprovados. Nenhuma senha ou token foi coletado.

## Ajuste após falha na redefinição

Usuário enviou imagem da redefinição com erro genérico. A imagem não identifica o código retornado, portanto a causa real ainda não foi confirmada. Adicionadas mensagens específicas para same_password, reautenticação, sessão expirada/ausente, timeout e falha de conexão. Incluídos testes da tela para garantir que falhas não exibam sucesso e permitam nova tentativa. Não houve leitura, registro ou alteração da senha do usuário. Referência: https://supabase.com/docs/guides/auth/debugging/error-codes .

## Retorno após nova tentativa de recuperação

Usuário informou conclusão da etapa manual ("pronto"). Observado no navegador: /my-list acessível com sessão autenticada e perfil concluído, exibindo a indisponibilidade esperada; navegação ao início exibiu "Olá, Raphael" e confirmação de perfil concluído. A atualização de senha foi realizada pelo usuário em outra tela; não foi observada diretamente sua resposta nem uma nova autenticação com a senha alterada. Não inferir prova de novo login apenas a partir da sessão ativa. Nenhuma senha foi coletada. Encerrada esta rodada de implementação e smoke, sem avançar às demais telas.
