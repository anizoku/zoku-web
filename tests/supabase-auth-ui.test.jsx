import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SupabaseRoutes } from '../src/SupabaseApp';
import { SupabaseAuthProvider } from '../src/lib/SupabaseAuthContext';
import { createSupabaseAuthStore } from '../src/lib/supabaseAuthStore';
import { safeAuthReturnTo, setupValidation } from '../src/lib/supabaseAuthNavigation';

vi.mock('../src/api/base44Client', () => { throw new Error('Supabase routes must not load Base44'); });

const stores = [];
afterEach(() => { cleanup(); stores.splice(0).forEach((store) => store.stop()); });
const ok = (data) => ({ data, error: null });
const session = { user: { id: 'uuid-a', email: 'a@example.test' }, access_token: 'test-token' };

function LocationProbe() { const location = useLocation(); return <output data-testid="location">{location.pathname + location.search}</output>; }

function mount({ path = '/login', authenticated = false, complete = true, confirmationRequired = true, profileFailure = false, initializeError = null, disabled = false } = {}) {
  let currentSession = authenticated ? session : null;
  let profile = { id: 'uuid-a', display_name: 'Ana', username: 'ana', preferred_language: 'pt', profile_setup_completed: complete };
  let listener;
  const emit = (event, value) => { currentSession = value; listener(event, value); };
  const client = {
    auth: {
      initialize: vi.fn(async () => ({ error: initializeError })),
      getSession: vi.fn(async () => ok({ session: currentSession })),
      onAuthStateChange: vi.fn((fn) => { listener = fn; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
      signInWithPassword: vi.fn(async () => { emit('SIGNED_IN', session); return ok({ session }); }),
      signUp: vi.fn(async () => {
        if (!confirmationRequired) emit('SIGNED_IN', session);
        return ok({ user: session.user, session: confirmationRequired ? null : session });
      }),
      resend: vi.fn(async () => ok({})),
      resetPasswordForEmail: vi.fn(async () => ok({})),
      updateUser: vi.fn(async () => ok({ user: session.user })),
      signOut: vi.fn(async () => { emit('SIGNED_OUT', null); return ok(null); }),
    },
    rpc: vi.fn(async (name, args) => {
      if (profileFailure) return { error: new Error('offline') };
      if (name === 'complete_profile_setup') {
        profile = { ...profile, username: args.p_username, display_name: args.p_display_name, profile_setup_completed: true };
        return ok({ status: 'COMPLETED' });
      }
      return ok(profile);
    }),
  };
  const store = createSupabaseAuthStore(disabled ? null : client, null, 'https://zoku.test');
  stores.push(store);
  render(<SupabaseAuthProvider authStore={store}><MemoryRouter initialEntries={[path]}><SupabaseRoutes /><LocationProbe /></MemoryRouter></SupabaseAuthProvider>);
  return { client, store, emit, user: userEvent.setup() };
}

async function fillLogin(user) {
  await user.type(await screen.findByLabelText('E-mail'), 'a@example.test');
  await user.type(screen.getByLabelText('Senha', { exact: true }), 'test-password');
}

describe('Supabase routes without legacy data', () => {
  it.each([
    ['same_password', 'A nova senha deve ser diferente da senha atual.'],
    ['reauthentication_needed', 'Por segurança, solicite um novo link de recuperação e tente novamente.'],
    ['session_expired', 'Sua sessão expirou. Solicite um novo link de recuperação.'],
    ['weak_password', 'Escolha uma senha mais forte, com pelo menos 8 caracteres.'],
  ])('explains password reset failure %s without reporting success', async (code, message) => {
    const { user, client } = mount({ path: '/reset-password', authenticated: true });
    client.auth.updateUser.mockResolvedValue({ error: { code } });
    await user.type(await screen.findByLabelText('Nova senha'), 'new-password');
    await user.type(screen.getByLabelText('Confirmar senha'), 'new-password');
    await user.click(screen.getByRole('button', { name: 'Atualizar senha' }));
    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(screen.queryByRole('heading', { name: 'Senha atualizada' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Atualizar senha' }).disabled).toBe(false);
  });
  it('preserves direct route through login and blocks the unmigrated screen', async () => {
    const { client, user } = mount({ path: '/my-list?tab=watching' });
    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Entrar', exact: true }));
    await screen.findByRole('heading', { name: 'Esta área estará disponível em breve' });
    expect(screen.getByTestId('location').textContent).toBe('/my-list?tab=watching');
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@example.test', password: 'test-password' });
  });

  it('routes incomplete profile to setup, uses RPC and returns to requested route', async () => {
    const { client, user } = mount({ path: '/my-list', authenticated: true, complete: false });
    await user.type(await screen.findByLabelText('Nome de usuário'), 'ana_2');
    await user.click(screen.getByRole('button', { name: 'Concluir perfil' }));
    await screen.findByRole('heading', { name: 'Esta área estará disponível em breve' });
    expect(client.rpc).toHaveBeenCalledWith('complete_profile_setup', { p_username: 'ana_2', p_display_name: 'Ana', p_preferred_language: 'pt' });
    expect(screen.getByTestId('location').textContent).toBe('/my-list');
  });

  it('keeps signup anonymous until email confirmation and reuses safe callback destination', async () => {
    const { user, client, store } = mount({ path: '/register?returnTo=%2Fprofile' });
    await user.type(await screen.findByLabelText('Nome', { exact: true }), 'Ana');
    await fillLogin(user);
    await user.type(screen.getByLabelText('Confirmar senha'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Criar conta', exact: true }));
    await screen.findByRole('heading', { name: 'Verifique seu e-mail' });
    expect(store.getSnapshot().session).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.auth.signUp.mock.calls[0][0].options.emailRedirectTo).toBe('https://zoku.test/auth/callback?returnTo=%2Fprofile');
    await user.click(screen.getByRole('button', { name: 'Reenviar confirmação' }));
    expect(client.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@example.test', options: { emailRedirectTo: 'https://zoku.test/auth/callback?returnTo=%2Fprofile' } });
  });

  it('supports signup when email confirmation is disabled on the server', async () => {
    const { user } = mount({ path: '/signup', confirmationRequired: false, complete: false });
    await user.type(await screen.findByLabelText('Nome', { exact: true }), 'Ana');
    await fillLogin(user);
    await user.type(screen.getByLabelText('Confirmar senha'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Criar conta', exact: true }));
    await screen.findByRole('heading', { name: 'Complete seu perfil' });
  });

  it('shows profile retry, not onboarding, when bootstrap fails', async () => {
    const { client, user } = mount({ path: '/', authenticated: true, profileFailure: true });
    await screen.findByRole('heading', { name: 'Não foi possível carregar seu perfil' });
    expect(screen.queryByRole('heading', { name: 'Complete seu perfil' })).toBeNull();
    client.rpc.mockResolvedValue(ok({ id: 'uuid-a', display_name: 'Ana', profile_setup_completed: true }));
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('heading', { name: 'Olá, Ana' });
  });

  it('restores session, logs out, clears private profile and navigates to login', async () => {
    const { user, client, store } = mount({ path: '/', authenticated: true });
    await screen.findByRole('heading', { name: 'Olá, Ana' });
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    await screen.findByRole('heading', { name: 'Entrar' });
    expect(store.getSnapshot().profile).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('shows login when a session expires or signs out in another tab', async () => {
    const { emit } = mount({ path: '/', authenticated: true });
    await screen.findByRole('heading', { name: 'Olá, Ana' });
    act(() => emit('SIGNED_OUT', null));
    await screen.findByRole('heading', { name: 'Entrar' });
  });

  it('refreshing a token does not clear a partially entered setup form', async () => {
    const { emit, user } = mount({ path: '/', authenticated: true, complete: false });
    await user.type(await screen.findByLabelText('Nome de usuário'), 'draft');
    act(() => emit('TOKEN_REFRESHED', { ...session, access_token: 'new-token' }));
    await waitFor(() => expect(screen.getByLabelText('Nome de usuário').value).toBe('draft'));
  });

  it('sends recovery link and updates password through the authenticated SDK', async () => {
    const { user, client } = mount({ path: '/forgot-password' });
    await user.type(await screen.findByLabelText('E-mail'), 'a@example.test');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    await screen.findByRole('heading', { name: 'Verifique seu e-mail' });
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@example.test', { redirectTo: 'https://zoku.test/reset-password' });
    cleanup();
    const recovery = mount({ path: '/reset-password', authenticated: true });
    await recovery.user.type(await screen.findByLabelText('Nova senha'), 'new-password');
    await recovery.user.type(screen.getByLabelText('Confirmar senha'), 'new-password');
    await recovery.user.click(screen.getByRole('button', { name: 'Atualizar senha' }));
    await screen.findByRole('heading', { name: 'Senha atualizada' });
    expect(recovery.client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
  });

  it('expired email callback is an error even with an old valid session', async () => {
    mount({ path: '/auth/callback', authenticated: true, initializeError: new Error('expired') });
    await screen.findByRole('heading', { name: 'Não foi possível confirmar o acesso' });
    expect(screen.queryByRole('heading', { name: 'Olá, Ana' })).toBeNull();
  });

  it('valid callback enters onboarding and invalid recovery cannot submit a password', async () => {
    mount({ path: '/auth/callback?returnTo=%2Fmy-list', authenticated: true, complete: false });
    await screen.findByRole('heading', { name: 'Complete seu perfil' });
    expect(screen.getByTestId('location').textContent).toBe('/profile-setup?returnTo=%2Fmy-list');
    cleanup();
    mount({ path: '/reset-password' });
    await screen.findByRole('heading', { name: 'Solicite um novo link' });
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });

  it('does not silently fall back to Base44 when configuration is missing', async () => {
    const { client } = mount({ disabled: true });
    await screen.findByRole('heading', { name: 'Acesso indisponível' });
    expect(client.auth.getSession).not.toHaveBeenCalled();
  });

  it('handles invalid credentials and server username conflict without leaving the form', async () => {
    const { client, user } = mount();
    client.auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });
    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Entrar', exact: true }));
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou senha incorretos.');
    cleanup();
    const setup = mount({ path: '/', authenticated: true, complete: false });
    await setup.user.type(await screen.findByLabelText('Nome de usuário'), 'taken');
    setup.client.rpc.mockResolvedValue({ error: { message: 'USERNAME_TAKEN' } });
    await setup.user.click(screen.getByRole('button', { name: 'Concluir perfil' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Este nome de usuário já está em uso.');
  });
});

describe('navigation and backend validation boundaries', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2fevil.test', '/login', '/%6cogin', '/reset-password?token=x', '/auth/callback', '/\n/evil.test'])('rejects unsafe or looping destination %s', (path) => {
    expect(safeAuthReturnTo(path)).toBe('/');
  });
  it('keeps legitimate internal path, search and hash', () => {
    expect(safeAuthReturnTo('/my-list?tab=watching#top')).toBe('/my-list?tab=watching#top');
  });
  it.each(['ab', 'user.name', '_name', 'name_', 'na__me', 'AdminOne'])('rejects unsupported username %s', (username) => {
    expect(setupValidation({ username, displayName: 'Name', preferredLanguage: 'pt' })).toBeTruthy();
  });
  it('accepts the actual RPC contract without avatar requirements', () => {
    expect(setupValidation({ username: 'Name_123', displayName: 'Name', preferredLanguage: 'pt' })).toBeNull();
  });
});
