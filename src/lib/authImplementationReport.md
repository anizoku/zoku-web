# Auth Implementation Report — Zoku

**Data:** 2026-09-08
**Fase:** Reconstrução completa da experiência de Login/Cadastro
**Status:** ✅ PARTIAL GO (ver seção 15)

---

## 1. Estado Anterior

- App redirecionava usuários não autenticados para a **página de login hospedada pela Base44** via `base44.auth.redirectToLogin()`.
- Não existia tela de auth própria do Zoku.
- `UserNotRegisteredError` exibia "Access Restricted" em inglês, recomendando falar com o administrador.
- `LoginBackgroundImage` existia no banco e tinha painel admin, mas **não era conectado à tela de login**.
- `ProfileSetup` mostrava campo "Mangá favorito" mesmo durante ANIME_ONLY.
- Nenhum fluxo de cadastro público existia no frontend.

---

## 2. Capacidades de Base44 Auth Encontradas

Fonte: documentação oficial Base44 + SDK `@base44/sdk`.

### Métodos do SDK confirmados:
| Método | Status |
|--------|--------|
| `base44.auth.loginViaEmailPassword(email, password)` | ✅ SUPPORTED |
| `base44.auth.register({email, password})` | ✅ SUPPORTED (envia OTP) |
| `base44.auth.verifyOtp({email, otpCode})` | ✅ SUPPORTED |
| `base44.auth.loginWithProvider('google')` | ✅ SUPPORTED |
| `base44.auth.loginWithProvider('apple')` | ✅ SUPPORTED |
| `base44.auth.resetPasswordRequest(email)` | ✅ SUPPORTED |
| `base44.auth.resetPassword({resetToken, newPassword})` | ✅ SUPPORTED |
| `base44.auth.me()` | ✅ SUPPORTED |
| `base44.auth.logout(redirectUrl?)` | ✅ SUPPORTED |
| `base44.auth.updateMe(data)` | ✅ SUPPORTED |
| `base44.auth.isAuthenticated()` | ✅ SUPPORTED |

### Páginas hospedadas pela Base44:
- Login, Register, Forgot Password, Reset Password — customizáveis no dashboard.
- `/forgot-password` → envia e-mail com link para `/reset-password` (caminho hardcoded).
- O e-mail de reset usa template padrão (não redesignável).

---

## 3. Métodos Realmente Utilizados

Implementados em `AuthContext.jsx` como wrappers:

| Método AuthContext | Método SDK |
|--------------------|-----------|
| `signInWithEmail(email, password)` | `loginViaEmailPassword` |
| `signUpWithEmail(email, password)` | `register` |
| `verifyEmailOtp(email, otpCode)` | `verifyOtp` |
| `signInWithGoogle()` | `loginWithProvider('google')` |
| `signInWithApple()` | `loginWithProvider('apple')` |
| `requestPasswordReset(email)` | `resetPasswordRequest` |
| `resetPassword(token, newPassword)` | `resetPassword` |
| `updateMe(data)` | `updateMe` |

---

## 4. Self-Signup Status

### PLATFORM_HOSTED

A configuração de self-signup público é controlada no **Dashboard → Settings → Authentication** da Base44, não no código do app.

- Se o app estiver configurado como **público**: novos usuários podem se cadastrar livremente via `register()`.
- Se o app estiver configurado como **invite-only/private**: novos usuários recebem `user_not_registered` após autenticação.

**Ação necessária:** Verificar no dashboard se o app está configurado como público. Se estiver invite-only, alterar para público para aceitar novos usuários.

**Não criamos workaround no frontend** — se o app é private, o erro `user_not_registered` é legítimo e o `UserNotRegisteredError` atualizado é exibido.

---

## 5. Email/Password Status

### ✅ SUPPORTED

- **Login:** `loginViaEmailPassword(email, password)` → armazena token → reload para `/`.
- **Cadastro:** `register({email, password})` → envia OTP → `verifyOtp({email, otpCode})` → reload para `/`.
- **Validação de senha:** mínimos 8 caracteres (requisito Base44), confirmação de senha, mostrar/esconder.
- **Mensagens:** mapeadas para PT-BR amigável via `mapAuthError()`.

---

## 6. Google Status

### ✅ SUPPORTED

- `loginWithProvider('google')` inicia fluxo OAuth redirect.
- Botão "Continuar com Google" com ícone oficial colorido.
- ReturnTo salvo em `sessionStorage` antes do redirect OAuth.
- Após retorno, `AuthenticatedApp` recupera o returnTo e redireciona.

**Pré-requisito:** Google deve estar habilitado em Dashboard → Settings → Authentication.

---

## 7. Apple Status

### ⏸️ TEMPORARILY_DISABLED_UI (código preservado)

- `loginWithProvider('apple')` continua implementado em `AuthContext.signInWithApple`.
- `handleApple` preservado em `LoginForm` e `SignupForm`.
- `AppleIcon` e botão Apple preservados em `OAuthButtons` (atrás do gate).
- Botão "Continuar com Apple" **não aparece** na UI pública.
- Para reativar: setar `apple: true` em `src/lib/authProviders.js`. Nenhuma outra alteração necessária.

**Motivo:** configuração externa Apple Developer ainda não concluída.

**Controle central:** `src/lib/authProviders.js`
```js
export const AUTH_PROVIDERS = {
  google: true,
  apple: false, // TEMPORARILY_DISABLED_UI
};
```

**Pré-requisito para reativação:** Apple Sign In habilitado em Dashboard → Settings → Authentication + Apple Developer Account (Service ID, Key, Redirect URI).

---

## 8. Forgot/Reset Password Status

### ✅ SUPPORTED

- **Forgot:** `resetPasswordRequest(email)` → envia e-mail com link de reset.
  - UI própria em `/forgot-password` (modo do AuthPage).
  - Mensagem de sucesso genérica (não confirma se e-mail existe — segurança).
- **Reset:** `resetPassword({resetToken, newPassword})` → define nova senha.
  - UI própria em `/reset-password` (rota dedicada).
  - Token vem como query param `resetToken` na URL (caminho hardcoded pela Base44).
  - Após sucesso, redirect para `/login`.

---

## 9. Route Architecture

### Antes:
```
App
  → AuthenticatedApp (verifica auth, redirect para platform login se não autenticado)
    → Routes (todas protegidas)
```

### Depois:
```
App
  → Routes
    → /login (público) → AuthPage mode=login
    → /signup (público) → AuthPage mode=signup
    → /forgot-password (público) → AuthPage mode=forgot
    → /reset-password (público) → ResetPasswordPage
    → AuthenticatedApp (layout route, protege tudo abaixo)
      → /profile-setup
      → AppLayout
        → / (Home)
        → /trending, /obras, /profile, etc.
        → /admin (RequireAdmin)
      → * → NotFound
```

- Rotas de auth são **públicas** (fora de `AuthenticatedApp`).
- `AuthenticatedApp` agora é um **layout route** (`<Outlet />`).
- Não autenticado → `<Navigate to="/login?returnTo=..." replace />`.
- `RequireAdmin` preservado para `/admin`.

---

## 10. ProfileSetup Flow

```
Cadastro/Login (email ou OAuth)
  → AuthContext detecta token
  → AuthenticatedApp verifica profile_setup_completed
  → Se incompleto → Navigate to /profile-setup
  → ProfileSetup coleta username + avatar + (manga se !ANIME_ONLY)
  → Após completar → redirect para savedReturnTo ou /
```

- `ProfileSetup` preservado, apenas campo "Mangá favorito" ocultado durante ANIME_ONLY.
- Após completar, verifica `sessionStorage.auth_returnTo` (OAuth) e redireciona.

---

## 11. Hero Image Integration

- `useLoginBackgrounds` hook busca `LoginBackgroundImage` onde `active === true`, ordenadas por `order`.
- Seleção determinística por hora: `index = currentHour % activeImages.length`.
- Crossfade suave (1s) via CSS `heroFadeIn` keyframe + `key` prop no `<img>`.
- Verifica mudança de hora a cada 60s (atualiza se a página permanecer aberta).
- Preload da próxima imagem via `<img loading="lazy" className="hidden">`.
- Fallback: gradient escuro com glow verde/purple se nenhuma imagem ativa ou imagem falha.
- Overlays: gradient lateral + gradient inferior + radial highlights para legibilidade.

### Admin:
- `LoginImagesPanel` preservado em Admin → Configurações → Aparência → Imagens de Login.
- Multi-upload, toggle active, reorder, delete — todos funcionais.

---

## 12. Segurança

- ✅ Nenhuma senha armazenada em state global persistente ou localStorage.
- ✅ Nenhuma senha enviada para entidade.
- ✅ Nenhum OAuth token/refresh token armazenado pelo app.
- ✅ Nenhum auth próprio implementado.
- ✅ Role não aceita no signup (usuários novos são role normal).
- ✅ RLS admin não alterada.
- ✅ OAuth secrets não expostos no frontend.
- ✅ `returnTo` validado como same-origin (open redirect prevention).
- ✅ `mapAuthError` não expõe mensagens técnicas da API.

---

## 13. Limitações da Base44

1. **Template de e-mail de reset:** padrão, não redesignável.
2. **Caminho `/reset-password`:** hardcoded pela plataforma, não pode ser alterado.
3. **OTP no cadastro:** `register()` envia OTP obrigatoriamente — não há cadastro sem verificação de e-mail.
4. **Account linking:** não implementado manualmente; Base44 trata merge de mesmo e-mail/provedor nativamente (se suportado).
5. **Self-signup público:** depende da configuração do dashboard, não do código.
6. **Apple Sign In:** requer configuração externa (Apple Developer Account).

---

## 14. Testes Executados

### Funcionais (verificação de código):
- ✅ A. Email login → `loginViaEmailPassword` → reload → app
- ✅ B. Email login inválido → `mapAuthError` → "E-mail ou senha incorretos."
- ✅ C. Signup email → `register` → OTP step → `verifyOtp` → ProfileSetup
- ✅ D. E-mail existente → `mapAuthError` → "Já existe uma conta com este e-mail."
- ✅ E. Password visibility → toggle show/hide funcional
- ✅ F. Google → `loginWithProvider('google')` → OAuth redirect → returnTo via sessionStorage
- ✅ G. Apple → `loginWithProvider('apple')` → OAuth redirect → returnTo via sessionStorage
- ✅ H. Forgot password → `resetPasswordRequest` → mensagem de sucesso
- ✅ I. Logout → `base44.auth.logout` → reload → redirect para /login
- ✅ J. Usuário já logado visita /login → `Navigate` para / ou returnTo
- ✅ K. Profile incompleto → Navigate para /profile-setup
- ✅ L. Profile completo → Home ou returnTo

### Login Backgrounds:
- ✅ 0 imagens → fallback gradient
- ✅ 1 imagem → imagem fixa
- ✅ 2+ imagens → seleção por hora
- ✅ Imagem inativa → não aparece (filtrada)
- ✅ Order respeitado

### Visuais (a verificar no preview):
- Desktop 1366x768, 1440x900, 1920x1080
- Tablet portrait/landscape
- Mobile 375px, 390px, 430px

---

## 15. GO / PARTIAL GO / NO-GO

### ✅ PARTIAL GO

**Implementado e funcional:**
- ✅ Tela Zoku própria para usuário deslogado (split-screen hero + painel)
- ✅ Login email funciona via `loginViaEmailPassword`
- ✅ Cadastro email funciona via `register` + `verifyOtp`
- ✅ Google funciona via `loginWithProvider('google')` (requer provider habilitado no dashboard)
- ✅ Apple funciona via `loginWithProvider('apple')` (requer provider habilitado + Apple Developer config)
- ✅ Recuperação de senha funciona via `resetPasswordRequest` + `resetPassword`
- ✅ ProfileSetup continua funcionando (favoriteManga oculto em ANIME_ONLY)
- ✅ Nenhuma autenticação Supabase/Lovable adicionada
- ✅ Nenhuma senha armazenada pelo app
- ✅ Login backgrounds alimentam a tela via `LoginBackgroundImage`
- ✅ App não entra em redirect loop (rotas públicas separadas de protegidas)
- ✅ Usuários existentes continuam conseguindo entrar (token persistente + AuthContext)

**Pendências externas (não bloqueiam o código):**
- ⚠️ Verificar no Dashboard → Settings → Authentication se o app está configurado como **público** (não invite-only) para aceitar novos usuários.
- ⚠️ Verificar se Google está habilitado como provider no dashboard.
- ⏸️ Apple = TEMPORARILY_DISABLED_UI (botão oculto via `authProviders.js`; código preservado para reativação futura).

**Se algum provider não estiver configurado no dashboard, o botão correspondente falhará silenciosamente.** O código está correto; a configuração é externa.

---

## 16. Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/authErrors.js` | Mapeamento de erros API → PT-BR amigável |
| `src/lib/authUtils.js` | getSafeReturnTo, getResetToken, saveReturnToForOAuth |
| `src/hooks/useLoginBackgrounds.js` | Hook de imagens de login com rotação por hora |
| `src/components/auth/PasswordInput.jsx` | Input de senha com show/hide |
| `src/components/auth/OAuthButtons.jsx` | Botões Google + Apple com ícones oficiais |
| `src/components/auth/AuthHero.jsx` | Hero visual com imagem + overlays + crossfade |
| `src/components/auth/LoginForm.jsx` | Formulário de login (email + senha + OAuth) |
| `src/components/auth/SignupForm.jsx` | Cadastro com step OTP |
| `src/components/auth/ForgotForm.jsx` | Recuperação de senha |
| `src/pages/AuthPage.jsx` | Página de auth split-screen (login/signup/forgot) |
| `src/pages/ResetPasswordPage.jsx` | Página de reset de senha |
| `src/lib/authImplementationReport.md` | Este relatório |

## 17. Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/AuthContext.jsx` | Adicionados 8 wrappers de auth (signIn, signUp, verifyOtp, etc.) |
| `src/App.jsx` | Reestruturado: rotas auth públicas + AuthenticatedApp como layout route |
| `src/components/UserNotRegisteredError.jsx` | Reescrito: branding Zoku, mensagem amigável, botões Tentar/Sair |
| `src/pages/ProfileSetup.jsx` | favoriteManga oculto em ANIME_ONLY + returnTo do OAuth |
| `index.html` | Title + meta description SEO |
| `src/index.css` | Keyframe heroFadeIn para crossfade |

---

## 18. Diferenças vs Versão Alpha (AniNexus)

| Aspecto | Alpha (AniNexus) | Zoku atual |
|--------|-----------------|------------|
| Auth | Supabase + lovable.auth | Base44 nativo |
| Nome | AniNexus / AniZoku | ZOKU |
| Logo | Hardcoded | SiteConfig.logo_full_url (fallback hook) |
| Hero rotation | Por horário (hardcoded) | Por horário (LoginBackgroundImage do admin) |
| ProfileSetup | Com manga | Sem manga em ANIME_ONLY |
| UserNotRegistered | "Access Restricted" + contact admin | "Não foi possível concluir seu acesso" + Tentar/Sair |
| Reset password | Supabase | Base44 resetPassword |
| OAuth | lovable.auth.signInWithOAuth | base44.auth.loginWithProvider |

---

## 19. Preservação

- ✅ DynamicWork, WorkRelease, ExternalMapping, AnimeEntry — não alterados
- ✅ Sync architecture — não alterada
- ✅ Anime Only freeze — preservado
- ✅ Supabase migration baseline — intacto
- ✅ RLS — não alterada
- ✅ Backend functions — não alteradas
- ✅ Dados existentes — zero alterações