import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SupabaseRoutes } from '../src/SupabaseApp';
import { SupabaseAuthProvider } from '../src/lib/SupabaseAuthContext';
import { createSupabaseAuthStore } from '../src/lib/supabaseAuthStore';

vi.mock('../src/api/base44Client', () => { throw new Error('Base44 must not load'); });
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const ok = (data) => ({ data, error: null });
const stores = [];
afterEach(() => { cleanup(); stores.splice(0).forEach((store) => store.stop()); });

function mount({ path = '/profile', authenticated = true, publicData, avatar = null } = {}) {
  let profile = { id: owner, username: 'ana', display_name: 'Ana', bio: 'Minha bio', preferred_language: 'pt', country: 'BR', favorite_animes: ['One'], links: {}, profile_visibility: 'public', list_visibility: 'public', profile_setup_completed: true, avatar_url: avatar };
  let session = authenticated ? { user: { id: owner }, access_token: 'test' } : null;
  let listener;
  const emit = (event, value) => { session = value; listener(event, value); };
  const bucket = {
    upload: vi.fn(async () => ok({})),
    createSignedUrl: vi.fn(async (path) => ok({ signedUrl: `https://storage.test/signed/${path}?token=test` })),
  };
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(async () => ok([])), maybeSingle: vi.fn(async () => ok(publicData === undefined ? { ...profile, id: other, display_name: 'Outro perfil' } : publicData)) };
  const client = {
    auth: {
      getSession: async () => ok({ session }),
      initialize: async () => ({ error: null }),
      onAuthStateChange(fn) { listener = fn; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: async () => { emit('SIGNED_OUT', null); return ok(null); },
    },
    rpc: vi.fn(async (name, args) => {
      if (name === 'update_profile') profile = { ...profile, ...args.p_updates };
      for (const kind of ['avatar', 'banner']) {
        if (name === `set_${kind}`) profile = { ...profile, [`${kind}_url`]: args.p_path, [`${kind}_crop`]: null };
        if (name === `remove_${kind}`) profile = { ...profile, [`${kind}_url`]: null, [`${kind}_crop`]: null };
      }
      return ok(name === 'get_my_profile' ? { ...profile } : { status: 'UPDATED' });
    }),
    from: vi.fn(() => query),
    storage: { from: vi.fn(() => bucket) },
  };
  const store = createSupabaseAuthStore(client, null, 'https://zoku.test');
  stores.push(store);
  render(<SupabaseAuthProvider authStore={store}><MemoryRouter initialEntries={[path]}><SupabaseRoutes /></MemoryRouter></SupabaseAuthProvider>);
  return { client, bucket, query, store, emit, user: userEvent.setup() };
}

it('loads own profile from RPC and renders the new navigation without listing users', async () => {
  const { client } = mount();
  await screen.findByRole('heading', { name: 'Ana' });
  expect(screen.getByText('Minha bio')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeTruthy();
  expect(client.rpc).toHaveBeenCalledWith('get_my_profile');
  expect(client.from).not.toHaveBeenCalled();
});

it('collapses the sidebar while preserving accessible navigation and restores the profile card', async () => {
  const { user, client } = mount();
  await screen.findByRole('heading', { name: 'Ana' });
  await user.click(screen.getByRole('button', { name: 'Recolher menu' }));
  expect(screen.getByRole('button', { name: 'Expandir menu' }).getAttribute('aria-expanded')).toBe('false');
  const nav = screen.getByRole('navigation', { name: 'Menu principal' });
  expect(within(nav).getByRole('link', { name: 'Amigos' }).getAttribute('href')).toBe('/friends');
  expect(screen.queryByText('XP indisponível')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Expandir menu' }));
  expect(screen.getByText('XP indisponível')).toBeTruthy();
  expect(client.from).not.toHaveBeenCalled();
});

it('keeps search and notifications disabled and opens the existing inbox from mobile navigation', async () => {
  const { user, client } = mount();
  await screen.findByRole('heading', { name: 'Ana' });
  expect(screen.getByRole('textbox', { name: 'Busca disponível em breve' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Notificações disponíveis em breve' }).disabled).toBe(true);
  await user.click(within(screen.getByRole('navigation', { name: 'Menu móvel' })).getByRole('link', { name: 'Chat' }));
  await screen.findByRole('heading', { name: 'Mensagens' });
  await waitFor(() => expect(client.from).toHaveBeenCalledWith('friendships'));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(within(screen.getByRole('navigation', { name: 'Trilha de navegação' })).getByText('Mensagens')).toBeTruthy();
});

it('opens friends and safe placeholder routes through the restored sidebar', async () => {
  const { user, client } = mount();
  await screen.findByRole('heading', { name: 'Ana' });
  const nav = screen.getByRole('navigation', { name: 'Menu principal' });
  await user.click(within(nav).getByRole('link', { name: 'Amigos' }));
  await screen.findByRole('heading', { name: 'Amigos', exact: true });
  expect(client.from).toHaveBeenCalledWith('friendships');
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(within(nav).getByRole('link', { name: 'Obras' }));
  await screen.findByRole('heading', { name: 'Esta área estará disponível em breve' });
});

it('shares signed private avatar media across the shell and clears it after logout', async () => {
  const { bucket, emit } = mount({ avatar: `${owner}/a.png` });
  await screen.findByRole('heading', { name: 'Ana' });
  const avatars = await screen.findAllByAltText('Ana');
  expect(avatars).toHaveLength(2);
  for (const image of avatars) expect(image.src).toContain(`https://storage.test/signed/${owner}/a.png`);
  expect(bucket.createSignedUrl).toHaveBeenCalledWith(`${owner}/a.png`, 60);
  act(() => emit('SIGNED_OUT', null));
  await screen.findByRole('heading', { name: 'Entrar' });
  expect(screen.queryAllByAltText('Ana')).toHaveLength(0);
});

it('edits profile, clears favorites, normalizes country and refreshes header', async () => {
  const { client, user } = mount();
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  await user.clear(screen.getByLabelText('Nome de exibição'));
  await user.type(screen.getByLabelText('Nome de exibição'), 'Novo nome');
  await user.clear(screen.getByLabelText('Animes favoritos (um por linha)'));
  await user.clear(screen.getByLabelText('País (duas letras)'));
  await user.type(screen.getByLabelText('País (duas letras)'), 'us');
  await user.selectOptions(screen.getByLabelText('Quem pode ver seu perfil'), 'private');
  await user.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  await screen.findByRole('heading', { name: 'Novo nome' });
  expect(screen.getByText('Nenhum favorito adicionado.')).toBeTruthy();
  expect(client.rpc).toHaveBeenCalledWith('update_profile', { p_updates: expect.objectContaining({ display_name: 'Novo nome', favorite_animes: [], country: 'US', profile_visibility: 'private' }) });
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('cancel does not persist edits', async () => {
  const { client, user } = mount();
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  await user.type(screen.getByLabelText('Bio'), ' unsaved');
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(client.rpc.mock.calls.some(([name]) => name === 'update_profile')).toBe(false);
  expect(screen.getByText('Minha bio')).toBeTruthy();
});

it('server conflict keeps editor open and does not report success', async () => {
  const { client, user } = mount();
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  client.rpc.mockResolvedValue({ error: new Error('USERNAME_TAKEN') });
  await user.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Este nome de usuário já está em uso.');
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it('uploads private avatar, signs it for display and removes selection', async () => {
  const { client, bucket, user } = mount();
  const file = new File(['png'], 'avatar.png', { type: 'image/png' });
  await user.upload(await screen.findByLabelText('Foto de perfil', { exact: true }), file);
  await screen.findByAltText('Foto de Ana');
  expect(bucket.upload).toHaveBeenCalledTimes(1);
  expect(client.rpc).toHaveBeenCalledWith('set_avatar', { p_path: expect.stringMatching(new RegExp(`^${owner}/`)) });
  expect(bucket.createSignedUrl).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${owner}/`)), 60);
  await user.click(screen.getByRole('button', { name: 'Remover foto' }));
  await waitFor(() => expect(screen.queryByAltText('Foto de Ana')).toBeNull());
  expect(client.rpc).toHaveBeenCalledWith('remove_avatar');
});

it('upload error preserves existing profile and exposes a retryable error', async () => {
  const { bucket, user, client } = mount();
  bucket.upload.mockResolvedValue({ error: new Error('offline') });
  await user.upload(await screen.findByLabelText('Foto de perfil', { exact: true }), new File(['png'], 'a.png', { type: 'image/png' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível concluir');
  expect(client.rpc.mock.calls.some(([name]) => name === 'set_avatar')).toBe(false);
});

it('public route is accessible anonymously using public view and never private RPC', async () => {
  const { client, query } = mount({ path: `/u/${other}`, authenticated: false });
  await screen.findByRole('heading', { name: 'Outro perfil' });
  expect(client.from).toHaveBeenCalledWith('public_profiles');
  expect(query.eq).toHaveBeenCalledWith('id', other);
  expect(client.rpc).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull();
});

it('RLS-hidden or absent profile shows neutral unavailability and no data', async () => {
  mount({ path: `/u/${other}`, authenticated: false, publicData: null });
  await screen.findByRole('heading', { name: 'Perfil indisponível' });
  expect(screen.queryByText('Minha bio')).toBeNull();
});

it('legacy email URL is not queried', async () => {
  const { client } = mount({ path: '/u/someone@example.com', authenticated: false });
  await screen.findByRole('heading', { name: 'Perfil indisponível' });
  expect(client.from).not.toHaveBeenCalled();
});

it('unsafe links supplied by a profile are not rendered', async () => {
  mount({ path: `/u/${other}`, authenticated: false, publicData: { id: other, display_name: 'Public', links: { website: 'javascript:alert(1)', x: 'https://example.com' } } });
  await screen.findByRole('heading', { name: 'Public' });
  expect(screen.queryByRole('link', { name: 'website' })).toBeNull();
  expect(screen.getByRole('link', { name: 'X / Twitter' }).getAttribute('rel')).toBe('noopener noreferrer');
});

it('logout discards open private editor and signed media', async () => {
  const { emit, user } = mount({ avatar: `${owner}/a.png` });
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  act(() => emit('SIGNED_OUT', null));
  await screen.findByRole('heading', { name: 'Entrar' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByAltText('Foto de Ana')).toBeNull();
});
