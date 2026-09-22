import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import SupabaseChatProvider from '../src/components/supabase/chat/SupabaseChatProvider';
import SupabaseChatOverlay from '../src/components/supabase/chat/SupabaseChatOverlay';
import SupabaseMobileNav from '../src/components/supabase/layout/SupabaseMobileNav';
import DirectMessagesPage from '../src/components/supabase/DirectMessagesPage';

const state = vi.hoisted(() => ({ auth: null, client: null }));
vi.mock('../src/lib/SupabaseAuthContext', () => ({ useSupabaseAuth: () => state.auth }));
vi.mock('../src/api/supabaseClient', () => ({ getSupabaseAuthClient: () => state.client }));
vi.mock('../src/api/base44Client', () => { throw new Error('Base44 must not load'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const id = (n) => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const me = id(1), ana = id(2), bia = id(3);
const message = (n, sender = ana, receiver = me, content = `Mensagem ${n}`) => ({ id: id(n), sender_id: sender, receiver_id: receiver, content, created_at: `2026-09-20T12:00:${String(n).padStart(2, '0')}Z`, read_at: null });

function PageRoute() {
  const { pathname } = useLocation();
  return pathname === '/messages' ? <DirectMessagesPage /> : <Link to="/messages">Abrir página de mensagens</Link>;
}

function mount({ mobile = false, page = false, empty = false, unavailable = false } = {}) {
  vi.stubGlobal('matchMedia', () => ({ matches: !mobile, addEventListener() {}, removeEventListener() {} }));
  let messages = empty ? [] : [message(10), message(11), message(12, me, bia, 'Olá Bia')];
  const friends = [ana, bia].map((other, index) => ({ id: id(index + 20), requester_id: me, receiver_id: other, status: 'accepted' }));
  friends.push({ id: id(23), requester_id: me, receiver_id: id(4), status: 'pending' }, { id: id(24), requester_id: me, receiver_id: me, status: 'accepted' });
  const profiles = [{ id: ana, display_name: 'Ana', username: 'ana', avatar_url: `${ana}/a.png` }, { id: bia, display_name: 'Bia', username: 'bia' }];
  const hooks = {};
  let status;
  const channel = { on: vi.fn((_type, filter, fn) => { hooks[filter.event] = fn; return channel; }), subscribe: vi.fn((fn) => { status = fn; fn('SUBSCRIBED'); return channel; }) };
  const client = { channel: vi.fn(() => channel), removeChannel: vi.fn(async () => {}) };
  const dm = {
    inbox: vi.fn(async () => messages.map((row) => ({ ...row }))),
    conversation: vi.fn(async (other) => messages.filter((row) => (row.sender_id === me && row.receiver_id === other) || (row.sender_id === other && row.receiver_id === me)).map((row) => ({ ...row }))),
    markConversationRead: vi.fn(async (other) => { messages = messages.map((row) => row.sender_id === other && row.receiver_id === me ? { ...row, read_at: '2026-09-20T13:00:00Z' } : row); return []; }),
    markRead: vi.fn(async (messageId) => { const row = messages.find((item) => item.id === messageId); if (!row) return null; row.read_at = '2026-09-20T13:00:00Z'; return { ...row }; }),
    send: vi.fn(async (receiver, content) => { const row = message(30, me, receiver, content); messages.push(row); hooks.INSERT({ new: row }); return row; }),
  };
  const fs = { list: vi.fn(async () => friends), profilesByIds: vi.fn(async (ids) => unavailable ? [] : profiles.filter((profile) => ids.includes(profile.id))) };
  const signMedia = vi.fn(async (_kind, path) => path ? `https://storage.test/signed/${path}` : null);
  state.auth = { user: { id: me }, profile: { id: me, profile_setup_completed: true }, friendService: fs, directMessageService: dm, profileService: { signMedia } };
  state.client = client;
  const tree = () => <MemoryRouter initialEntries={[page ? '/messages' : '/profile']}><SupabaseChatProvider><SupabaseMobileNav /><SupabaseChatOverlay /><PageRoute /></SupabaseChatProvider></MemoryRouter>;
  const view = render(tree());
  return { ...view, user: userEvent.setup(), client, dm, fs, signMedia,
    rerenderServices: () => { state.auth = { ...state.auth, friendService: { ...fs }, directMessageService: { ...dm } }; view.rerender(tree()); },
    status: (value) => act(() => status(value)),
    emit: async (row, event = 'INSERT') => { messages = [...messages.filter((item) => item.id !== row.id), row]; await act(async () => hooks[event]({ new: row })); },
  };
}

async function openChat(view, mobile = false) {
  await view.user.click(screen.getByRole('button', { name: mobile ? 'Chat' : 'Abrir chat', exact: true }));
  return await screen.findByRole('button', { name: /Ana.*Mensagem 11/ });
}

it('shows accepted friends, safe avatars, previews and unread conversations; minimizes and restores', async () => {
  const view = mount();
  const anaRow = await openChat(view);
  expect(view.fs.profilesByIds).toHaveBeenCalledWith([ana, bia]);
  expect(screen.getByText('Você: Olá Bia')).toBeTruthy();
  expect(screen.getByLabelText('2 mensagens não lidas')).toBeTruthy();
  expect(screen.getAllByLabelText('1 conversas não lidas').length).toBeGreaterThan(0);
  await waitFor(() => expect(view.container.querySelector('img')?.src).toBe(`https://storage.test/signed/${ana}/a.png`));
  await view.user.click(anaRow);
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Mensagem' }).disabled).toBe(false));
  expect(screen.getByRole('link', { name: 'Ana' }).getAttribute('href')).toBe(`/u/${ana}`);
  expect(view.dm.markConversationRead).toHaveBeenCalledWith(ana);
  await view.user.click(screen.getByRole('button', { name: 'Minimizar chat' }));
  await view.emit(message(15));
  expect(view.dm.markRead).not.toHaveBeenCalled();
  expect(screen.queryByRole('log')).toBeNull();
  await view.user.click(screen.getByRole('button', { name: 'Restaurar chat' }));
  await screen.findByText('Mensagem 15');
  await view.user.click(screen.getByRole('button', { name: 'Voltar às conversas' }));
  await screen.findByRole('button', { name: /Ana.*Mensagem 15/ });
  await view.user.click(within(screen.getByRole('region', { name: 'Chat' })).getByRole('button', { name: 'Fechar chat' }));
  expect(screen.queryByRole('region', { name: 'Chat' })).toBeNull();
});

it('sends on Enter, deduplicates realtime echoes and applies read_at updates without resubscribing', async () => {
  const view = mount();
  await view.user.click(await openChat(view));
  const input = screen.getByRole('textbox', { name: 'Mensagem' });
  await waitFor(() => expect(input.disabled).toBe(false));
  await view.user.type(input, 'Olá Ana{Enter}');
  await screen.findByText('Olá Ana');
  expect(screen.getAllByText('Olá Ana')).toHaveLength(1);
  expect(view.dm.send).toHaveBeenCalledWith(ana, 'Olá Ana');
  await view.emit({ ...message(30, me, ana, 'Olá Ana'), read_at: '2026-09-20T13:00:00Z' }, 'UPDATE');
  expect(screen.getByText('Lida')).toBeTruthy();
  await view.emit(message(30, me, ana, 'Olá Ana'));
  expect(screen.getByText('Lida')).toBeTruthy();
  await view.emit(message(16));
  expect(screen.getByText('Mensagem 16')).toBeTruthy();
  expect(view.dm.markRead).toHaveBeenCalledWith(id(16));
  view.rerenderServices();
  expect(view.client.channel).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(view.client.removeChannel).toHaveBeenCalledTimes(1);
});

it('enforces composer limits, preserves a failed draft and blocks duplicate sends', async () => {
  const view = mount();
  await view.user.click(await openChat(view));
  const input = screen.getByRole('textbox', { name: 'Mensagem' });
  await waitFor(() => expect(input.disabled).toBe(false));
  expect(input.maxLength).toBe(3000);
  await view.user.type(input, '   ');
  expect(screen.getByRole('button', { name: 'Enviar mensagem' }).disabled).toBe(true);
  fireEvent.change(input, { target: { value: 'a'.repeat(3001) } });
  fireEvent.submit(input.closest('form'));
  expect(view.dm.send).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'Teste' } });
  let fail;
  view.dm.send.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
  await view.user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  fireEvent.submit(input.closest('form'));
  expect(view.dm.send).toHaveBeenCalledTimes(1);
  expect(input.disabled).toBe(true);
  await act(async () => fail({ code: '42501' }));
  expect((await screen.findByRole('alert')).textContent).toContain('amigos');
  expect(input.value).toBe('Teste');
});

it('keeps mobile drawer behavior and realtime shared with desktop', async () => {
  const view = mount({ mobile: true });
  await view.user.click(await openChat(view, true));
  const dialog = screen.getByRole('dialog', { name: 'Chat' });
  const input = within(dialog).getByRole('textbox', { name: 'Mensagem' });
  await waitFor(() => expect(input.disabled).toBe(false));
  await view.user.type(input, 'Mensagem móvel{Enter}');
  await screen.findByText('Mensagem móvel');
  await view.emit(message(18));
  expect(screen.getByText('Mensagem 18')).toBeTruthy();
  await view.user.click(screen.getByRole('button', { name: 'Fechar chat' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps /messages usable without a second floating panel', async () => {
  const view = mount({ page: true });
  await view.user.click(await screen.findByRole('button', { name: /Ana.*Mensagem 11/ }));
  expect(screen.getByRole('heading', { name: 'Mensagens' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Abrir chat' })).toBeNull();
  await screen.findByText('Mensagem 10');
  expect(view.client.channel).toHaveBeenCalledTimes(1);
});

it('reports channel failures without crashing and reconciles on reconnect', async () => {
  const view = mount();
  await openChat(view);
  view.status('CHANNEL_ERROR');
  expect((await screen.findByRole('alert')).textContent).toContain('Atualizações ao vivo indisponíveis');
  view.status('SUBSCRIBED');
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(view.dm.inbox.mock.calls.length).toBeGreaterThan(2);
});

it('fails gracefully on friend/inbox reads and can retry', async () => {
  const view = mount();
  await openChat(view);
  view.dm.inbox.mockRejectedValueOnce(new Error('Falha no histórico'));
  await view.user.click(within(screen.getByRole('region', { name: 'Chat' })).getByRole('button', { name: 'Fechar chat' }));
  await view.user.click(screen.getByRole('button', { name: 'Abrir chat' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Falha no histórico');
  expect(screen.queryByRole('button', { name: /Ana.*Mensagem/ })).toBeNull();
  await view.user.click(screen.getByRole('button', { name: 'Atualizar conversas' }));
  await screen.findByRole('button', { name: /Ana.*Mensagem 11/ });
});

it('renders unavailable profile and empty-history fallbacks', async () => {
  const view = mount({ empty: true, unavailable: true });
  await view.user.click(screen.getByRole('button', { name: 'Abrir chat' }));
  const rows = await screen.findAllByRole('button', { name: /Perfil indisponível/ });
  expect(rows).toHaveLength(2);
  expect(view.container.querySelector('img')).toBeNull();
  await view.user.click(rows[0]);
  await screen.findByText('Comece a conversa!');
});

it('discards a late conversation response after switching friends', async () => {
  const view = mount();
  const row = await openChat(view);
  let release;
  view.dm.conversation.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  await view.user.click(row);
  await view.user.click(screen.getByRole('button', { name: 'Voltar às conversas' }));
  await view.user.click(screen.getByRole('button', { name: /Bia.*Olá Bia/ }));
  await screen.findByText('Olá Bia');
  await act(async () => release([message(40, ana, me, 'Resposta atrasada')]));
  expect(screen.queryByText('Resposta atrasada')).toBeNull();
  expect(view.dm.markConversationRead).not.toHaveBeenCalledWith(ana);
  expect(screen.getByRole('link', { name: 'Bia' }).getAttribute('href')).toBe(`/u/${bia}`);
});

it('does not mark minimized or unrelated messages read and removes revoked recipients on refresh', async () => {
  const view = mount();
  await openChat(view);
  await view.emit(message(40, id(8), id(9), 'Mensagem de terceiros'));
  expect(screen.queryByText('Mensagem de terceiros')).toBeNull();
  expect(view.dm.markRead).not.toHaveBeenCalled();
  view.fs.list.mockResolvedValue([]);
  await view.user.click(within(screen.getByRole('region', { name: 'Chat' })).getByRole('button', { name: 'Fechar chat' }));
  await view.user.click(screen.getByRole('button', { name: 'Abrir chat' }));
  await screen.findByText('Nenhum amigo ainda');
  expect(screen.queryByRole('textbox', { name: 'Mensagem' })).toBeNull();
});

it('keeps a successfully sent draft cleared even if the fallback refresh fails', async () => {
  const view = mount();
  await view.user.click(await openChat(view));
  const input = screen.getByRole('textbox', { name: 'Mensagem' });
  await waitFor(() => expect(input.disabled).toBe(false));
  view.dm.conversation.mockRejectedValueOnce(new Error('Offline'));
  await view.user.type(input, 'Enviada uma vez{Enter}');
  await waitFor(() => expect(input.value).toBe(''));
  expect((await screen.findByRole('alert')).textContent).toContain('Mensagem enviada');
  expect(screen.getByText('Enviada uma vez')).toBeTruthy();
  expect(view.dm.send).toHaveBeenCalledTimes(1);
});

it('ignores callbacks and asynchronous loads after the account boundary unmounts', async () => {
  const view = mount();
  const row = await openChat(view);
  let release;
  view.dm.conversation.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  await view.user.click(row);
  view.unmount();
  await act(async () => release([message(42)]));
  await view.emit(message(43));
  expect(view.dm.markRead).not.toHaveBeenCalled();
  expect(view.dm.markConversationRead).not.toHaveBeenCalled();
  expect(view.client.removeChannel).toHaveBeenCalledTimes(1);
});

it('refreshes recipients when entering the standalone page through the persistent shell', async () => {
  const view = mount();
  await openChat(view);
  view.fs.list.mockResolvedValue([]);
  await view.user.click(screen.getByRole('link', { name: 'Abrir página de mensagens' }));
  await screen.findByText('Nenhum amigo ainda');
  expect(screen.getByRole('heading', { name: 'Mensagens' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Ana.*Mensagem/ })).toBeNull();
  expect(view.client.channel).toHaveBeenCalledTimes(1);
});
