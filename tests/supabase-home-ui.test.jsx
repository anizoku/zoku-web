import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SupabaseHomePage from '../src/components/supabase/home/SupabaseHomePage';

const state = vi.hoisted(() => ({ profile: null }));
vi.mock('../src/lib/SupabaseAuthContext', () => ({ useSupabaseAuth: () => ({ profile: state.profile }) }));
vi.mock('../src/api/base44Client', () => { throw new Error('Home must not import Base44'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(profile = { display_name: 'Ana', username: 'ana', avatar_url: 'private-owner/avatar.png' }) {
  state.profile = profile;
  const request = vi.fn(() => { throw new Error('Home must not request content'); });
  vi.stubGlobal('fetch', request);
  const view = render(<MemoryRouter><SupabaseHomePage /></MemoryRouter>);
  return { ...view, request, user: userEvent.setup() };
}

it('preserves section order and uses current profile data without content queries or raw media', () => {
  const { container, request } = mount();
  expect(screen.getAllByRole('heading').map((node) => node.textContent)).toEqual([
    'Olá, Ana', 'Destaques da plataforma', 'Notícias em destaque', 'Ranking do mês', 'Arte de Fãs',
    'Feed da comunidade', 'Recomendados para você', 'Últimas Notícias', 'Trending Agora', 'Episódios Recentes', 'Debates Ativos',
  ]);
  expect(screen.getByRole('link', { name: 'Abrir meu perfil' }).getAttribute('href')).toBe('/profile');
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(container.querySelector('img')).toBeNull();
  expect(container.innerHTML).not.toContain('private-owner');
  expect(request).not.toHaveBeenCalled();
  expect(document.title).toBe('ZOKU');
});

it('makes posting explicitly unavailable and never accepts a draft or submits', async () => {
  const { user, container, request } = mount();
  const composer = screen.getByRole('textbox', { name: 'Criar publicação — em breve' });
  await user.type(composer, 'Não publicar');
  await user.click(screen.getByRole('button', { name: 'Postar' }));
  expect(composer.disabled).toBe(true);
  expect(composer.value).toBe('');
  expect(screen.getByRole('button', { name: 'Postar' }).disabled).toBe(true);
  expect(container.querySelector('form')).toBeNull();
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(screen.getByText('Publicações estarão disponíveis em breve.')).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});

it('keeps truthful empty states and a neutral profile fallback', () => {
  mount(null);
  expect(screen.getByRole('heading', { name: 'Olá, Zoku' })).toBeTruthy();
  expect(screen.getByText('Ranking indisponível no momento.')).toBeTruthy();
  expect(screen.getByText('Nenhuma arte disponível no momento.')).toBeTruthy();
  const sidebar = screen.getByRole('complementary', { name: 'Explore o Zoku' });
  expect(within(sidebar).getAllByRole('heading')).toHaveLength(5);
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.queryByRole('button', { name: /galeria|próximo|anterior/i })).toBeNull();
});
