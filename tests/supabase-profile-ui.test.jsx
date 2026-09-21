import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
afterEach(() => { cleanup(); stores.splice(0).forEach((store) => store.stop()); vi.unstubAllGlobals(); });

function mount({ path = '/profile', authenticated = true, publicData, avatar = null, banner = null, profileValues = {} } = {}) {
  let profile = { id: owner, username: 'ana', display_name: 'Ana', bio: 'Minha bio', preferred_language: 'pt', country: 'BR', favorite_animes: ['One'], links: {}, profile_visibility: 'public', list_visibility: 'public', profile_setup_completed: true, avatar_url: avatar, banner_url: banner, ...profileValues };
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
  await user.click(screen.getByRole('tab', { name: 'Privacidade' }));
  await user.selectOptions(screen.getByLabelText('Quem pode ver seu perfil'), 'private');
  await user.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  await screen.findByRole('heading', { name: 'Novo nome' });
  expect(screen.queryByRole('region', { name: 'Animes favoritos' })).toBeNull();
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

it.each([
  ['avatar', 'Foto de perfil', 'Foto de Ana', 'Remover foto'],
  ['banner', 'Banner', 'Banner do perfil', 'Remover banner'],
])('uploads private %s from Fotos, signs it for display and removes selection', async (kind, label, alt, removeLabel) => {
  const { client, bucket, user } = mount();
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  await user.click(screen.getByRole('tab', { name: 'Fotos' }));
  const file = new File(['png'], 'avatar.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText(label, { exact: true }), file);
  await screen.findByAltText(alt);
  expect(bucket.upload).toHaveBeenCalledTimes(1);
  expect(client.rpc).toHaveBeenCalledWith(`set_${kind}`, { p_path: expect.stringMatching(new RegExp(`^${owner}/`)) });
  expect(bucket.createSignedUrl).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${owner}/`)), 60);
  await waitFor(() => expect(screen.getByRole('button', { name: removeLabel }).disabled).toBe(false));
  await user.click(screen.getByRole('button', { name: removeLabel }));
  await waitFor(() => expect(screen.queryByAltText(alt)).toBeNull());
  expect(client.rpc).toHaveBeenCalledWith(`remove_${kind}`);
});

it('upload error preserves existing profile and exposes a retryable error', async () => {
  const { bucket, user, client } = mount();
  bucket.upload.mockResolvedValue({ error: new Error('offline') });
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  await user.click(screen.getByRole('tab', { name: 'Fotos' }));
  await user.upload(screen.getByLabelText('Foto de perfil', { exact: true }), new File(['png'], 'a.png', { type: 'image/png' }));
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
  expect(screen.queryByRole('link', { name: 'Site', exact: true })).toBeNull();
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

it('renders both signed media with their saved crop transforms and shares only the UUID route', async () => {
  const crop = { version: 2, zoom: 1.5, offsetXPct: 4, offsetYPct: -3 };
  const { user, bucket } = mount({ avatar: `${owner}/a.png`, banner: `${owner}/b.png`, profileValues: {
    avatar_crop: crop, banner_crop: { ...crop, zoom: 2 }, links: { website: 'https://example.com' },
  } });
  const avatar = await screen.findByAltText('Foto de Ana');
  const banner = await screen.findByAltText('Banner do perfil');
  expect(avatar.style.transform).toBe('translate(4%, -3%) scale(1.5)');
  expect(banner.style.transform).toBe('translate(4%, -3%) scale(2)');
  expect(avatar.getAttribute('src')).toContain('https://storage.test/signed/');
  expect(banner.getAttribute('src')).toContain('https://storage.test/signed/');
  expect(bucket.createSignedUrl).toHaveBeenCalledWith(`${owner}/b.png`, 60);
  expect(screen.getByRole('link', { name: 'Site', exact: true }).href).toBe('https://example.com/');
  expect(within(screen.getByRole('region', { name: 'Animes favoritos' })).getByText('One')).toBeTruthy();
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  await user.click(screen.getByRole('button', { name: 'Copiar link' }));
  expect(copy).toHaveBeenCalledWith(`${window.location.origin}/u/${owner}`);
  expect(screen.getByRole('status').textContent).toContain('Link copiado');
});

it('keeps text drafts across tabs and immediate media updates, then reloads saved fields', async () => {
  const { user, store, client } = mount();
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  await user.clear(screen.getByLabelText('Nome de exibição'));
  await user.type(screen.getByLabelText('Nome de exibição'), 'Nome salvo');
  await user.clear(screen.getByLabelText('Bio'));
  await user.type(screen.getByLabelText('Bio'), 'Bio salva');
  await user.click(screen.getByRole('tab', { name: 'Fotos' }));
  await user.upload(screen.getByLabelText('Banner', { exact: true }), new File(['png'], 'banner.png', { type: 'image/png' }));
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Links' }).disabled).toBe(false));
  await user.click(screen.getByRole('tab', { name: 'Links' }));
  await user.type(screen.getByLabelText('website'), 'https://example.com/ana');
  await user.click(screen.getByRole('tab', { name: 'Privacidade' }));
  await user.selectOptions(screen.getByLabelText('Quem pode ver seu perfil'), 'friends');
  await user.selectOptions(screen.getByLabelText('Quem pode ver sua lista'), 'private');
  await user.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  await screen.findByRole('heading', { name: 'Nome salvo' });
  await act(async () => { await store.refreshProfile(); });
  await screen.findByRole('heading', { name: 'Nome salvo' });
  expect(screen.getByText('Bio salva')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Site', exact: true }).href).toBe('https://example.com/ana');
  expect(store.getSnapshot().profile).toMatchObject({ profile_visibility: 'friends', list_visibility: 'private' });
  expect(store.getSnapshot().profile.banner_url).toMatch(new RegExp(`^${owner}/`));
  expect(client.rpc).toHaveBeenCalledWith('update_profile', { p_updates: expect.not.objectContaining({ banner_url: expect.anything() }) });
});

it.each(['avatar', 'banner'])('applies %s crop through the existing modal without saving a signed token', async kind => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(448);
  const path = `${owner}/${kind}.png`;
  const { user, client } = mount({ [kind]: path });
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  await user.click(screen.getByRole('tab', { name: 'Fotos' }));
  const adjust = screen.getByRole('button', { name: kind === 'avatar' ? 'Ajustar foto' : 'Ajustar banner', exact: true });
  await waitFor(() => expect(adjust.disabled).toBe(false));
  await user.click(adjust);
  const dialog = screen.getByRole('dialog', { name: kind === 'avatar' ? 'Ajustar foto de perfil' : 'Ajustar banner' });
  const image = dialog.querySelector('img');
  Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
  fireEvent.load(image);
  await user.click(within(dialog).getByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(client.rpc).toHaveBeenCalledWith('update_profile', { p_updates: {
    [`${kind}_crop`]: { version: 2, zoom: 1, offsetXPct: 0, offsetYPct: 0, imageUrl: path },
  } }));
  expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toBeTruthy();
});

it.each([false, true])('never signs media when the public profile view denies access (authenticated=%s)', async authenticated => {
  const { bucket } = mount({ path: `/u/${other}`, authenticated, publicData: null });
  await screen.findByRole('heading', { name: 'Perfil indisponível' });
  expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  expect(screen.queryByAltText('Banner do perfil')).toBeNull();
});

it('signs visible public media for the target UUID without exposing media controls', async () => {
  const { bucket } = mount({ path: `/u/${other}`, authenticated: false, publicData: {
    id: other, username: 'outro', display_name: 'Outro perfil', avatar_url: `${other}/a.png`, banner_url: `${other}/b.png`, favorite_animes: ['Anime'],
  } });
  expect((await screen.findByAltText('Banner do perfil')).src).toContain('https://storage.test/signed/');
  expect(bucket.createSignedUrl).toHaveBeenCalledWith(`${other}/a.png`, 60);
  expect(bucket.createSignedUrl).toHaveBeenCalledWith(`${other}/b.png`, 60);
  expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull();
  expect(screen.queryByLabelText('Foto de perfil', { exact: true })).toBeNull();
});

it('prevents closing or switching tabs during an upload and cancel keeps only the saved photo', async () => {
  const { bucket, user, store, client } = mount();
  let finishUpload;
  bucket.upload.mockImplementation(() => new Promise(resolve => { finishUpload = () => resolve(ok({})); }));
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  await user.type(screen.getByLabelText('Bio'), ' draft');
  await user.click(screen.getByRole('tab', { name: 'Fotos' }));
  await user.upload(screen.getByLabelText('Foto de perfil', { exact: true }), new File(['png'], 'a.png', { type: 'image/png' }));
  expect(screen.getByRole('tab', { name: 'Info' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Cancelar' }).disabled).toBe(true);
  await user.keyboard('{Escape}');
  expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toBeTruthy();
  await act(async () => finishUpload());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' }).disabled).toBe(false));
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(store.getSnapshot().profile.bio).toBe('Minha bio');
  expect(store.getSnapshot().profile.avatar_url).toMatch(new RegExp(`^${owner}/`));
  expect(client.rpc.mock.calls.some(([name]) => name === 'update_profile')).toBe(false);
});

it('shows a retryable copy failure instead of a success message', async () => {
  const { user } = mount();
  await screen.findByRole('heading', { name: 'Ana' });
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
  await user.click(screen.getByRole('button', { name: 'Copiar link' }));
  expect(screen.getByRole('alert').textContent).toContain('Não foi possível copiar');
  expect(screen.queryByText(/Link copiado/)).toBeNull();
});
