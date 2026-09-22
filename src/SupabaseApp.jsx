import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useLocation,
} from 'react-router-dom';

import { useSupabaseAuth } from './lib/SupabaseAuthContext';
import {
  authDestination,
  authRoute,
  setupValidation,
  supabaseAuthMessage,
} from './lib/supabaseAuthNavigation';

import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { PasswordInput } from './components/auth/PasswordInput';

import ProfileLayout from './components/supabase/ProfileLayout';
import {
  OwnProfilePage,
  PublicProfilePage,
} from './components/supabase/ProfilePage';
import FriendsPage from './components/supabase/FriendsPage';
import DirectMessagesPage from './components/supabase/DirectMessagesPage';
import SupabaseHomePage from './components/supabase/home/SupabaseHomePage';

function Frame({ title, children }) {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-md space-y-6">
        <Link
          to="/"
          className="font-space text-3xl font-bold text-primary"
          aria-label="Zoku início"
        >
          Zoku
        </Link>

        <h1 className="font-space text-2xl font-bold">
          {title}
        </h1>

        {children}
      </section>
    </main>
  );
}

function Busy() {
  return (
    <Frame title="Carregando">
      <p role="status">
        Aguarde um instante…
      </p>
    </Frame>
  );
}

function ErrorText({ error }) {
  return error ? (
    <p
      role="alert"
      className="text-destructive text-sm"
    >
      {error}
    </p>
  ) : null;
}

function Action({ action, children }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError('');

          try {
            await action();
          } catch (err) {
            setError(supabaseAuthMessage(err));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? 'Aguarde…' : children}
      </Button>

      <ErrorText error={error} />
    </div>
  );
}

function AuthForm({ mode }) {
  const auth = useSupabaseAuth();
  const { search } = useLocation();
  const destination = authDestination(search);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const signup = mode === 'signup';
  const forgot = mode === 'forgot';

  if (auth.isLoadingAuth) {
    return <Busy />;
  }

  if (auth.isAuthenticated && !forgot) {
    return (
      <Navigate
        to={
          auth.isPasswordRecovery
            ? '/reset-password'
            : destination
        }
        replace
      />
    );
  }

  async function submit(event) {
    event.preventDefault();

    if (pending) return;

    setError('');
    setUnconfirmed(false);

    if (signup && password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setPending(true);

    try {
      if (forgot) {
        await auth.requestPasswordReset(
          email.trim()
        );

        setSent(true);
      } else if (signup) {
        const result = await auth.signUpWithEmail(
          email.trim(),
          password,
          name.trim(),
          destination
        );

        if (!result.session) {
          setSent(true);
        }
      } else {
        await auth.signInWithEmail(
          email.trim(),
          password
        );
      }
    } catch (err) {
      setError(
        supabaseAuthMessage(err)
      );

      setUnconfirmed(
        err.code === 'email_not_confirmed'
      );
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <Frame title="Verifique seu e-mail">
        <p>
          {forgot
            ? 'Se houver uma conta com esse e-mail, enviaremos um link para redefinir sua senha.'
            : 'Se o cadastro puder ser concluído, você receberá um link para confirmar seu e-mail. Abra o link para continuar.'}
        </p>

        {!forgot && (
          <Action
            action={() =>
              auth.resendConfirmation(
                email.trim(),
                destination
              )
            }
          >
            Reenviar confirmação
          </Action>
        )}

        <Link
          className="text-primary underline"
          to={authRoute(
            '/login',
            destination
          )}
        >
          Voltar ao login
        </Link>
      </Frame>
    );
  }

  return (
    <Frame
      title={
        forgot
          ? 'Recuperar senha'
          : signup
            ? 'Crie sua conta'
            : 'Entrar'
      }
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        {signup && (
          <label className="block">
            Nome
            <Input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              maxLength={50}
              autoComplete="name"
              required
              disabled={pending}
            />
          </label>
        )}

        <label className="block">
          E-mail
          <Input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            autoComplete="email"
            required
            disabled={pending}
          />
        </label>

        {!forgot && (
          <div>
            <label htmlFor="auth-password">
              Senha
            </label>

            <PasswordInput
              id="auth-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete={
                signup
                  ? 'new-password'
                  : 'current-password'
              }
              minLength={
                signup ? 8 : undefined
              }
              required
              disabled={pending}
            />
          </div>
        )}

        {signup && (
          <div>
            <label htmlFor="auth-confirm">
              Confirmar senha
            </label>

            <PasswordInput
              id="auth-confirm"
              value={confirm}
              onChange={(e) =>
                setConfirm(e.target.value)
              }
              autoComplete="new-password"
              minLength={8}
              required
              disabled={pending}
            />
          </div>
        )}

        <ErrorText error={error} />

        <Button
          type="submit"
          className="w-full"
          disabled={pending}
        >
          {pending
            ? 'Aguarde…'
            : forgot
              ? 'Enviar link'
              : signup
                ? 'Criar conta'
                : 'Entrar'}
        </Button>
      </form>

      {unconfirmed && (
        <Action
          action={() =>
            auth.resendConfirmation(
              email.trim(),
              destination
            )
          }
        >
          Reenviar confirmação
        </Action>
      )}

      <nav className="flex flex-col gap-3 text-primary">
        {!forgot && (
          <Link
            to={authRoute(
              '/forgot-password',
              destination
            )}
          >
            Esqueceu a senha?
          </Link>
        )}

        <Link
          to={authRoute(
            signup || forgot
              ? '/login'
              : '/register',
            destination
          )}
        >
          {signup || forgot
            ? 'Voltar ao login'
            : 'Criar uma conta'}
        </Link>
      </nav>
    </Frame>
  );
}

function EmailCallback() {
  const auth = useSupabaseAuth();
  const location = useLocation();

  if (auth.isLoadingAuth) {
    return <Busy />;
  }

  if (
    auth.authError ||
    auth.initializationError ||
    !auth.session
  ) {
    return (
      <Frame title="Não foi possível confirmar o acesso">
        <p>
          O link pode ter expirado ou já ter sido usado.
          Entre na sua conta ou solicite um novo link.
        </p>

        <Link
          to={authRoute(
            '/login',
            authDestination(
              location.search
            )
          )}
          className="text-primary underline"
        >
          Voltar ao login
        </Link>

        <Link
          to="/forgot-password"
          className="block text-primary underline"
        >
          Recuperar senha
        </Link>
      </Frame>
    );
  }

  return (
    <Navigate
      to={
        auth.isPasswordRecovery
          ? '/reset-password'
          : authDestination(
              location.search
            )
      }
      replace
    />
  );
}

function ResetPassword() {
  const auth = useSupabaseAuth();

  const [password, setPassword] =
    useState('');

  const [confirm, setConfirm] =
    useState('');

  const [error, setError] =
    useState('');

  const [pending, setPending] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  if (auth.isLoadingAuth) {
    return <Busy />;
  }

  if (saved) {
    return (
      <Frame title="Senha atualizada">
        <p>
          Sua nova senha foi salva.
        </p>

        <Link
          to="/"
          className="text-primary underline"
        >
          Continuar
        </Link>

        <Action action={auth.logout}>
          Sair
        </Action>
      </Frame>
    );
  }

  if (
    !auth.session ||
    auth.authError ||
    auth.initializationError
  ) {
    return (
      <Frame title="Solicite um novo link">
        <p>
          Você precisa de um link válido ou de uma sessão ativa para alterar sua senha.
        </p>

        <Link
          className="text-primary underline"
          to="/forgot-password"
        >
          Recuperar senha
        </Link>
      </Frame>
    );
  }

  return (
    <Frame title="Redefinir senha">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();

          if (pending) return;

          if (password !== confirm) {
            setError(
              'As senhas não coincidem.'
            );

            return;
          }

          setPending(true);
          setError('');

          try {
            await auth.resetPassword(
              password
            );

            setSaved(true);
          } catch (err) {
            setError(
              supabaseAuthMessage(err)
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <div>
          <label htmlFor="new-password">
            Nova senha
          </label>

          <PasswordInput
            id="new-password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
          />
        </div>

        <div>
          <label htmlFor="confirm-password">
            Confirmar senha
          </label>

          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={(e) =>
              setConfirm(e.target.value)
            }
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
          />
        </div>

        <ErrorText error={error} />

        <Button
          type="submit"
          disabled={pending}
        >
          {pending
            ? 'Atualizando…'
            : 'Atualizar senha'}
        </Button>
      </form>
    </Frame>
  );
}

function ProfileGate() {
  const auth = useSupabaseAuth();
  const location = useLocation();

  const destination =
    location.pathname ===
    '/profile-setup'
      ? authDestination(
          location.search
        )
      : location.pathname +
        location.search +
        location.hash;

  if (auth.isLoadingAuth) {
    return <Busy />;
  }

  if (auth.authError) {
    return (
      <Frame title="Não foi possível restaurar sua sessão">
        <Action
          action={() =>
            window.location.reload()
          }
        >
          Tentar novamente
        </Action>
      </Frame>
    );
  }

  if (!auth.session) {
    return (
      <Navigate
        to={authRoute(
          '/login',
          destination
        )}
        replace
      />
    );
  }

  if (auth.isPasswordRecovery) {
    return (
      <Navigate
        to="/reset-password"
        replace
      />
    );
  }

  if (auth.isLoadingProfile) {
    return <Busy />;
  }

  if (
    auth.profileError ||
    !auth.profile
  ) {
    return (
      <Frame title="Não foi possível carregar seu perfil">
        <p>
          Tente novamente para continuar.
        </p>

        <Action
          action={auth.refreshProfile}
        >
          Tentar novamente
        </Action>

        <Action action={auth.logout}>
          Sair
        </Action>
      </Frame>
    );
  }

  if (
    !auth.profile
      .profile_setup_completed &&
    location.pathname !==
      '/profile-setup'
  ) {
    return (
      <Navigate
        to={authRoute(
          '/profile-setup',
          destination
        )}
        replace
      />
    );
  }

  if (
    auth.profile
      .profile_setup_completed &&
    location.pathname ===
      '/profile-setup'
  ) {
    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }

  return <Outlet />;
}

function ProfileSetup() {
  const auth = useSupabaseAuth();

  const [username, setUsername] =
    useState('');

  const [
    displayName,
    setDisplayName,
  ] = useState(
    auth.profile.display_name || ''
  );

  const [
    preferredLanguage,
    setLanguage,
  ] = useState(
    auth.profile
      .preferred_language || 'pt'
  );

  const [error, setError] =
    useState('');

  const [pending, setPending] =
    useState(false);

  return (
    <Frame title="Complete seu perfil">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();

          if (pending) return;

          const values = {
            username:
              username.trim(),
            displayName:
              displayName.trim(),
            preferredLanguage,
          };

          const validation =
            setupValidation(values);

          if (validation) {
            setError(validation);
            return;
          }

          setPending(true);
          setError('');

          try {
            await auth.completeProfileSetup(
              values
            );
          } catch (err) {
            setError(
              supabaseAuthMessage(err)
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="block">
          Nome de usuário

          <Input
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            minLength={3}
            maxLength={24}
            autoComplete="username"
            required
            disabled={pending}
          />
        </label>

        <p className="text-sm text-muted-foreground">
          De 3 a 24 caracteres. Letras, números e underscores; sem pontos.
        </p>

        <label className="block">
          Nome de exibição

          <Input
            value={displayName}
            onChange={(e) =>
              setDisplayName(
                e.target.value
              )
            }
            maxLength={50}
            autoComplete="name"
            required
            disabled={pending}
          />
        </label>

        <label className="block">
          Idioma

          <select
            value={
              preferredLanguage
            }
            onChange={(e) =>
              setLanguage(
                e.target.value
              )
            }
            disabled={pending}
            className="block w-full rounded-md border bg-background p-2"
          >
            <option value="pt">
              Português
            </option>

            <option value="en">
              English
            </option>
          </select>
        </label>

        <ErrorText
          error={error}
        />

        <Button
          type="submit"
          disabled={pending}
        >
          {pending
            ? 'Salvando…'
            : 'Concluir perfil'}
        </Button>
      </form>

      <Action action={auth.logout}>
        Sair
      </Action>
    </Frame>
  );
}

function Unavailable() {
  return (
    <section className="space-y-5 py-8">
      <h1 className="font-space text-2xl font-bold">
        Esta área estará disponível em breve
      </h1>

      <p>
        Estamos preparando esta parte do Zoku. Seu perfil está salvo.
      </p>

      <Link
        className="text-primary underline"
        to="/"
      >
        Voltar ao início
      </Link>
    </section>
  );
}

// Keep existing addresses but never mount their Base44-dependent components.
const pendingRoutes = [
  'trending',
  'animes',
  'mangas',
  'films',
  'series',
  'communities',
  'events',
  'my-list',
  'obra/:slug',
  'communities/:communityId',
  'obras',
  'admin',
  'ranking',
  'recomendacoes',
  'noticias',
  'noticias/:slug',
];

export function SupabaseRoutes() {
  const auth = useSupabaseAuth();

  if (!auth.enabled) {
    return (
      <Frame title="Acesso indisponível">
        <p>
          O acesso ainda não foi configurado neste ambiente. Tente novamente mais tarde.
        </p>
      </Frame>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthForm
            key="login"
            mode="login"
          />
        }
      />

      <Route
        path="/register"
        element={
          <AuthForm
            key="signup"
            mode="signup"
          />
        }
      />

      <Route
        path="/signup"
        element={
          <AuthForm
            key="signup-alias"
            mode="signup"
          />
        }
      />

      <Route
        path="/forgot-password"
        element={
          <AuthForm
            key="forgot"
            mode="forgot"
          />
        }
      />

      <Route
        path="/auth/callback"
        element={<EmailCallback />}
      />

      <Route
        path="/reset-password"
        element={
          <ResetPassword
            key={
              auth.user?.id ||
              'anonymous'
            }
          />
        }
      />

      <Route
        element={<ProfileGate />}
      >
        <Route
          path="/profile-setup"
          element={
            <ProfileSetup
              key={auth.user?.id}
            />
          }
        />
      </Route>

      <Route
        element={
          <ProfileLayout
            key={
              auth.user?.id ||
              'guest'
            }
          />
        }
      >
        <Route
          path="/u/:profileId"
          element={
            <PublicProfilePage />
          }
        />

        <Route
          element={<ProfileGate />}
        >
          <Route
            path="/"
            element={
              <SupabaseHomePage />
            }
          />

          <Route
            path="/profile"
            element={
              <OwnProfilePage />
            }
          />

          <Route
            path="/friends"
            element={
              <FriendsPage />
            }
          />

          <Route
            path="/messages"
            element={
              <DirectMessagesPage />
            }
          />

          {pendingRoutes.map(
            (path) => (
              <Route
                key={path}
                path={path}
                element={
                  <Unavailable />
                }
              />
            )
          )}
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Frame title="Página não encontrada">
            <Link to="/">
              Voltar ao início
            </Link>
          </Frame>
        }
      />
    </Routes>
  );
}

export default function SupabaseApp() {
  return (
    <BrowserRouter>
      <SupabaseRoutes />
    </BrowserRouter>
  );
}