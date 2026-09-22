import { Link } from 'react-router-dom';
import { Flame, Megaphone, MessageSquare, Newspaper, Palette, Play, Sparkles, TrendingUp } from 'lucide-react';
import { useSupabaseAuth } from '../../../lib/SupabaseAuthContext';
import { usePageTitle } from '../../../hooks/usePageTitle';
import SupabaseHomePlaceholderCard from './SupabaseHomePlaceholderCard';
import SupabaseFeedPlaceholder from './SupabaseFeedPlaceholder';

export default function SupabaseHomePage() {
  const { profile } = useSupabaseAuth();
  const name = profile?.display_name || profile?.username || 'Zoku';
  usePageTitle(null);

  return <div aria-label="Página inicial" className="mx-auto w-full max-w-[1400px] min-w-0">
    {/* Preserve the hero footprint without inventing CMS slides, artwork or carousel controls. */}
    <section aria-label="Destaques do Zoku" className="relative mb-6 flex aspect-[16/9] min-h-[240px] max-h-[380px] w-full overflow-hidden rounded-2xl border border-border bg-card sm:aspect-[16/7] lg:aspect-[21/6]">
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-secondary" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
      <div className="relative mt-auto min-w-0 p-4 sm:p-6">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Zoku</span>
        <h1 className="mt-2 break-words font-space text-lg font-bold leading-tight [overflow-wrap:anywhere] sm:text-2xl">Olá, {name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Os destaques estarão disponíveis em breve.</p>
        <Link to="/profile" className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Abrir meu perfil</Link>
      </div>
    </section>

    <section aria-labelledby="home-platform-title" className="mb-2 flex gap-3 overflow-x-auto pb-2">
      <div className="flex aspect-[16/9] w-[300px] max-w-full shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center sm:w-[440px]">
        <Megaphone aria-hidden="true" className="mb-3 h-6 w-6 text-muted-foreground/40" />
        <h2 id="home-platform-title" className="text-xs font-semibold">Destaques da plataforma</h2>
        <p className="mt-2 text-xs text-muted-foreground">Nenhum banner disponível no momento.</p>
      </div>
    </section>

    <section aria-labelledby="home-featured-title" className="mb-6 flex flex-col gap-1.5 rounded-xl border border-border bg-card/70 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex shrink-0 items-center gap-1.5"><Newspaper aria-hidden="true" className="h-3.5 w-3.5 text-primary" /><h2 id="home-featured-title" className="text-[10px] font-bold uppercase tracking-wider">Notícias em destaque</h2></div>
      <p className="text-sm text-muted-foreground">Nenhuma notícia disponível no momento.</p>
    </section>

    <section aria-labelledby="home-ranking-title" className="mb-6">
      <div className="mb-2 flex items-center gap-2 px-1"><Flame aria-hidden="true" className="h-4 w-4 text-chart-4" /><h2 id="home-ranking-title" className="text-xs font-bold uppercase tracking-wider text-foreground/90">Ranking do mês</h2></div>
      <div className="flex min-h-[78px] items-center gap-3 rounded-xl border border-border bg-card p-2.5"><div aria-hidden="true" className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-secondary"><TrendingUp className="h-4 w-4 text-muted-foreground/40" /></div><p className="text-sm text-muted-foreground">Ranking indisponível no momento.</p></div>
    </section>

    <section aria-labelledby="home-art-title" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
      <Palette aria-hidden="true" className="h-4 w-4 shrink-0 text-chart-3" /><h2 id="home-art-title" className="text-xs font-bold uppercase tracking-wider text-foreground/90">Arte de Fãs</h2><p className="text-xs text-muted-foreground sm:ml-auto">Nenhuma arte disponível no momento.</p>
    </section>

    <div data-testid="home-columns" className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12">
      <SupabaseFeedPlaceholder name={name} />
      <aside aria-label="Explore o Zoku" className="min-w-0 space-y-4 lg:col-span-4">
        <SupabaseHomePlaceholderCard title="Recomendados para você" icon={Sparkles}>Recomendações indisponíveis no momento.</SupabaseHomePlaceholderCard>
        <SupabaseHomePlaceholderCard title="Últimas Notícias" icon={Newspaper}>Nenhuma notícia disponível no momento.</SupabaseHomePlaceholderCard>
        <SupabaseHomePlaceholderCard title="Trending Agora" icon={TrendingUp}>Tendências indisponíveis no momento.</SupabaseHomePlaceholderCard>
        <SupabaseHomePlaceholderCard title="Episódios Recentes" icon={Play}>Os lançamentos estarão disponíveis em breve.</SupabaseHomePlaceholderCard>
        <SupabaseHomePlaceholderCard title="Debates Ativos" icon={MessageSquare}>Os debates da comunidade estarão disponíveis em breve.</SupabaseHomePlaceholderCard>
      </aside>
    </div>
  </div>;
}
