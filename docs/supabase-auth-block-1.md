# Supabase Auth — bloco 1

## Plano registrado antes da implementação

1. Preservar `useAuth`, formulários, guards e rotas Base44 neste bloco: uma sessão Supabase não autentica as entidades Base44.
2. Adicionar cliente Supabase opcional, com chave pública, persistência/renovação de sessão e sem capturar callbacks das rotas legadas.
3. Adicionar serviço/contexto isolado `useSupabaseAuth`: login/cadastro por email, logout, restauração/eventos de sessão e bootstrap pelo `get_my_profile()`.
4. Expor `completeProfileSetup` usando exatamente `complete_profile_setup(p_username, p_display_name, p_preferred_language)` e reler o perfil após sucesso. Não criar perfis no cliente.
5. Testar contratos, erros, logout, troca de identidade e respostas atrasadas; executar lint/build. Não alterar backend nem implantar.

## Auditoria

- `src/lib/AuthContext.jsx`: estado global, settings públicos Base44, sessão via token/me, login, cadastro/OTP, logout, OAuth, recuperação de senha e updateMe.
- `src/api/base44Client.js`, `src/lib/app-params.js`: cliente e armazenamento/token Base44; parâmetros de URL.
- `src/App.jsx`: tabela de rotas e ProfileSetupGate. Gate consulta me/UserProfile por email e pode gravar conclusão baseado em username/avatar.
- `src/components/ProtectedRoute.jsx`, `RequireAdmin.jsx`: guards dependentes do contexto e role Base44.
- `src/pages/AuthPage.jsx`, `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `ResetPasswordPage.jsx`; `src/components/auth/{LoginForm,SignupForm,ForgotForm,OAuthButtons}.jsx`: fluxo público; login recarrega página, cadastro assume OTP e updateMe após confirmação.
- `src/pages/ProfileSetup.jsx`: bootstrap independente, disponibilidade de username, upload Base44, criação/edição UserProfile por email e updateMe. Contrato de username e avatar obrigatório divergem do RPC Supabase.
- Layout: AppLayout usa useAuth, Sidebar/TopBar consultam me diretamente, UserMenuButton usa contexto mas logout direto Base44.
- Profile/PublicProfile e múltiplas telas de catálogo/listas/social/admin consultam me diretamente. Trocar somente o provider global causaria identidade dupla e falhas de dados.

Inventário completo de chamadas em código está em `docs/auth-call-sites.txt` (snapshot anterior às mudanças).

## Limite de entrega

A infraestrutura será montada paralelamente, desativada por padrão. Nenhuma rota passa a usar Supabase implicitamente. Ativá-la disponibiliza o contexto para desenvolvimento, mas não migra o login visual. Não compartilhar tokens, caches ou roles entre provedores; user.id Supabase é UUID e profile é separado de user.

Próximo bloco: conectar login/cadastro/confirmacao/recuperacao, guards e onboarding de forma coordenada, com plano explícito para os consumidores Base44 remanescentes. Google/Apple, Social, catálogo e Profile/EditProfile/PublicProfile permanecem fora deste bloco.

## Implementação concluída

- `src/api/supabaseClient.js`: cliente singleton opcional; configuração inválida fica observável em authError sem derrubar o app legado. Apenas chave moderna `sb_publishable_...`; anon JWT legado não é aceito neste bloco.
- `src/lib/supabaseAuthStore.js`: ciclo de sessão, eventos sincronizados entre abas pelo SDK, proteção contra respostas atrasadas, erros separados de sessão/perfil e unsubscribe no unmount. Logout local encerra a sessão deste navegador; não desloga outros dispositivos.
- `src/lib/SupabaseAuthContext.jsx`: `useSupabaseAuth()` expõe sessão, user UUID, profile separado, loading/erros, ações e needsProfileSetup (null enquanto desconhecido). Sem inferir privilégio de metadados editáveis ou copiar a role Base44.
- `src/main.jsx`: monta o contexto em paralelo ao AuthProvider existente. App.jsx, rotas, guards, telas e contexto Base44 não foram alterados.
- `package.json` / `package-lock.json`: SDK Supabase e comando test:auth.
- `eslint.config.js`: cobertura explícita dos novos módulos, entrypoint e testes (src/lib antes não estava coberto).
- `tests/supabase-auth.test.js`: testes de contratos e concorrência sem credenciais ou alterações remotas.

### Ativação para desenvolvimento

Adicionar ao `.env.local` local (não versionar):

```dotenv
VITE_ENABLE_SUPABASE_AUTH=true
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

Reiniciar o servidor Vite. Sem a flag exata `true`, nenhum cliente Supabase é criado. Não houve edição de arquivos de ambiente nesta entrega.

**Esta flag NÃO muda o provedor dos formulários ou das rotas.** Somente disponibiliza a infraestrutura paralela. O acesso em futuros componentes será por `useSupabaseAuth()`, com `signInWithEmail(email,password)`, `signUpWithEmail(email,password,fullName)`, `verifyEmailOtp(email,token)`, `logout()`, `refreshProfile()` e `completeProfileSetup({username,displayName,preferredLanguage})`.

Cadastro pode retornar session=null e exigir confirmação; não considerar user retornado como uma sessão autenticada. Verificação por OTP está disponível no serviço; templates e UX ainda precisam ser alinhados no próximo bloco. Captura automática de callbacks de URL está desativada para não consumir callbacks legados. Links de confirmação/recuperação e Google/Apple não foram integrados.

`get_my_profile` falhando não apaga uma sessão válida e não presume necessidade de onboarding: profile=null e profileError ficam disponíveis para retry. Erros das ações são propagados ao chamador. A autorização real continua no backend/RLS; a sessão no navegador não é uma validação de privilégios.

### Validação

- `npm run test:auth`: 17 testes passando, incluindo restauração anônima/autenticada, confirmação pendente, login, OTP, renovação, logout entre abas, falhas do SDK/RPC, retry, limpeza, respostas atrasadas e contrato/idempotência de setup.
- Lint direcionado de todos os arquivos de código deste bloco: passou.
- `npm run lint`: 47 erros de imports não usados em arquivos existentes não alterados; repetição com eslint.config.js original de HEAD confirmou os mesmos 47 erros.
- `npm run build`: passou, artefatos em dist. Aviso preexistente do plugin Base44: VITE_BASE44_APP_ID/APP_BASE_URL ausentes neste ambiente. Build não comprova login real ou funcionamento de APIs sem configuração.
- `git diff --check`: passou.
- Não houve teste ponta a ponta autenticado com Supabase remoto, deploy ou execução das suítes SQL/HTTP do backend (backend sem alterações). Testes deste bloco usam respostas simuladas para conferir contratos e transições; persistência/renovação real é responsabilidade do SDK e requer smoke test configurado no próximo bloco.

Referência técnica consultada: https://supabase.com/docs/reference/javascript/auth-onauthstatechange — callback síncrono, RPC adiado para fora do callback para evitar bloqueios do cliente.

> Atualização: o bloco 2 conecta o modo Supabase às telas. As instruções de infraestrutura paralela acima descrevem apenas o estado histórico do bloco 1. Consultar `supabase-auth-block-2.md` antes de ativar a flag.
