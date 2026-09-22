import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FriendsPage from '../src/components/supabase/FriendsPage';
import { createFriendService } from '../src/lib/supabaseFriendService';

const state = vi.hoisted(() => ({ auth: null }));
vi.mock('../src/lib/SupabaseAuthContext', () => ({ useSupabaseAuth: () => state.auth }));
vi.mock('../src/api/base44Client', () => { throw new Error('Base44 must not load'); });
afterEach(cleanup);
const uuid = (n) => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const own = uuid(1);
const ok = (data) => ({ data, error: null });

function mount({ empty = false, hidden = false, readError = false, mutationError = false } = {}) {
  let rows = empty ? [] : [
    { id: uuid(12), requester_id: own, receiver_id: uuid(2), status: 'accepted' },
    { id: uuid(13), requester_id: uuid(3), receiver_id: own, status: 'pending' },
    { id: uuid(14), requester_id: own, receiver_id: uuid(4), status: 'pending' },
  ];
  const profiles = ['Ana', 'Bia', 'Caio'].map((name, index) => ({ id: uuid(index + 2), display_name: name, username: name.toLowerCase(), avatar_url: `${uuid(index + 2)}/avatar.png` }));
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(async () => readError ? { error: new Error('Falha ao carregar') } : ok(rows.map((row) => ({ ...row })))),
    in: vi.fn(async (_column, ids) => ok(hidden ? [] : profiles.filter((profile) => ids.includes(profile.id)))),
  };
  const client = {
    from: vi.fn(() => query),
    rpc: vi.fn(async (name, args) => {
      if (mutationError) return { error: new Error('Ação recusada') };
      if (name === 'accept_friend_request') rows = rows.map((row) => row.id === args.friendship_id ? { ...row, status: 'accepted' } : row);
      else rows = rows.filter((row) => row.id !== args.friendship_id);
      return ok({ status: name === 'accept_friend_request' ? 'ACCEPTED' : name === 'reject_friend_request' ? 'REJECTED' : name === 'cancel_friend_request' ? 'CANCELLED' : 'REMOVED' });
    }),
  };
  const signMedia = vi.fn(async (_kind, path) => path ? `https://storage.test/signed/${path}` : null);
  state.auth = { user: { id: own }, friendService: createFriendService(client, own), profileService: { signMedia } };
  const view = render(<MemoryRouter initialEntries={['/friends']}><FriendsPage /></MemoryRouter>);
  return { ...view, client, query, signMedia, user: userEvent.setup(), failRead: () => { readError = true; }, recover: () => { readError = false; } };
}

it('renders counts, UUID profile links, safe media, and local search without extra queries', async () => {
  const { client, query, signMedia, user, container } = mount();
  await screen.findByText('1 conexões no Zoku');
  expect(screen.getByText('Ana').closest('a').getAttribute('href')).toBe(`/u/${uuid(2)}`);
  expect(screen.getByRole('link', { name: /Enviar mensagem/ }).getAttribute('href')).toBe('/messages');
  await waitFor(() => expect(container.querySelector('img')?.src).toContain('https://storage.test/signed/'));
  expect(signMedia).toHaveBeenCalledWith('avatar', `${uuid(2)}/avatar.png`, uuid(2));
  expect(query.in).toHaveBeenCalledWith('id', [uuid(2), uuid(3), uuid(4)]);
  const calls = client.from.mock.calls.length;
  await user.type(screen.getByRole('textbox'), 'bia');
  expect(screen.getByRole('button', { name: 'Aceitar' })).toBeTruthy();
  expect(screen.queryByText('Ana')).toBeNull();
  expect(client.from).toHaveBeenCalledTimes(calls);
  await user.clear(screen.getByRole('textbox'));
  await user.type(screen.getByRole('textbox'), 'unknown');
  expect(screen.getByText('Nenhuma conexão encontrada.')).toBeTruthy();
});

it.each([
  ['Aceitar', 'accept_friend_request', 13, '2 conexões no Zoku'],
  ['Recusar', 'reject_friend_request', 13, '1 conexões no Zoku'],
  ['Cancelar', 'cancel_friend_request', 14, '1 conexões no Zoku'],
])('handles %s through the existing RPC and reloads authoritative rows', async (button, rpc, id, count) => {
  const { user, client, query } = mount();
  await user.click(await screen.findByRole('tab', { name: /Solicitações/ }));
  await user.click(screen.getByRole('button', { name: button }));
  await screen.findByText(count);
  await waitFor(() => expect(query.order).toHaveBeenCalledTimes(2));
  expect(client.rpc).toHaveBeenCalledWith(rpc, { friendship_id: uuid(id) });
  expect(screen.queryByText(id === 13 ? 'Bia' : 'Caio')).toBeNull();
});

it('removes accepted friends through the menu and renders the empty state', async () => {
  const { user, client } = mount();
  await user.click(await screen.findByRole('button', { name: 'Opções de Ana' }));
  await user.click(screen.getByRole('menuitem', { name: 'Remover amigo' }));
  await screen.findByText('Você ainda não tem amigos no Zoku.');
  expect(client.rpc).toHaveBeenCalledWith('remove_friend', { friendship_id: uuid(12) });
  expect(screen.getByText('0 conexões no Zoku')).toBeTruthy();
});

it('preserves rows when a mutation fails and reports the error', async () => {
  const { user } = mount({ mutationError: true });
  await user.click(await screen.findByRole('tab', { name: /Solicitações/ }));
  await user.click(screen.getByRole('button', { name: 'Aceitar' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Ação recusada');
  expect(screen.getByText('Bia')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Aceitar' }).disabled).toBe(false);
});

it('hides stale rows when reload fails after a successful action and retries only the read', async () => {
  const { user, failRead, recover, client } = mount();
  await user.click(await screen.findByRole('tab', { name: /Solicitações/ }));
  failRead();
  await user.click(screen.getByRole('button', { name: 'Aceitar' }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Bia')).toBeNull();
  recover();
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('2 conexões no Zoku');
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

it('renders empty requests and uses a neutral identity for unavailable profiles', async () => {
  const view = mount({ empty: true });
  await screen.findByText('Você ainda não tem amigos no Zoku.');
  await view.user.click(screen.getByRole('tab', { name: /Solicitações/ }));
  expect(screen.getByText('Nenhuma solicitação pendente.')).toBeTruthy();
  view.unmount();
  const next = mount({ hidden: true });
  await screen.findByText('Perfil indisponível');
  expect(next.container.querySelector('img')).toBeNull();
  expect(screen.getByText('Perfil indisponível').closest('a').getAttribute('href')).toBe(`/u/${uuid(2)}`);
});

it('disables concurrent actions while a mutation is pending and reads fresh data on remount', async () => {
  const { user, client, unmount } = mount();
  await user.click(await screen.findByRole('tab', { name: /Solicitações/ }));
  let release;
  const original = client.rpc.getMockImplementation();
  client.rpc.mockImplementationOnce((...args) => new Promise((resolve) => { release = async () => resolve(await original(...args)); }));
  await user.click(screen.getByRole('button', { name: 'Aceitar' }));
  expect(screen.getByRole('button', { name: 'Recusar' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Cancelar' }).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Aceitar' }));
  expect(client.rpc).toHaveBeenCalledTimes(1);
  await act(async () => { await release(); });
  await screen.findByText('2 conexões no Zoku');
  unmount();
  render(<MemoryRouter initialEntries={['/friends?tab=requests']}><FriendsPage /></MemoryRouter>);
  await screen.findByText('2 conexões no Zoku');
  expect(screen.getByRole('tab', { name: 'Solicitações' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.queryByText('Bia')).toBeNull();
  await user.click(screen.getByRole('tab', { name: 'Amigos (2)' }));
  expect(screen.getByText('Bia')).toBeTruthy();
});
