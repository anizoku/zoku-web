import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SupabaseFriendCard from './friends/SupabaseFriendCard';

const otherId = (row, myId) => row.requester_id === myId ? row.receiver_id : row.requester_id;
function Empty({ children }) {
  return <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />{children}</div>;
}

export default function FriendsPage() {
  const { user, friendService } = useSupabaseAuth();
  const myId = user?.id;
  const service = useRef(friendService);
  useEffect(() => { service.current = friendService; }, [friendService]);
  const generation = useRef(0);
  const mutation = useRef(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'requests' ? 'requests' : 'friends';

  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const rows = (await service.current.list()).filter((row) =>
        (row.requester_id === myId || row.receiver_id === myId) && ['accepted', 'pending'].includes(row.status));
      const profiles = await service.current.profilesByIds(rows.map((row) => otherId(row, myId)));
      if (ticket === generation.current) setData({ rows, profiles: new Map(profiles.map((profile) => [profile.id, profile])) });
    } catch (err) {
      if (ticket === generation.current) { setData(null); setError(err?.message || 'Não foi possível carregar as amizades.'); }
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    setData(null);
    void load();
    return () => { generation.current += 1; };
  }, [load]);

  async function run(id, operation) {
    if (mutation.current) return;
    mutation.current = true;
    const ticket = generation.current;
    setPending(id);
    setError('');
    try {
      await service.current[operation](id);
      if (ticket === generation.current) await load();
    } catch (err) {
      if (ticket === generation.current) setError(err?.message || 'Não foi possível concluir a ação.');
    } finally {
      mutation.current = false;
      setPending(null);
    }
  }

  const rows = data?.rows || [];
  const accepted = rows.filter((row) => row.status === 'accepted');
  const received = rows.filter((row) => row.status === 'pending' && row.receiver_id === myId);
  const sent = rows.filter((row) => row.status === 'pending' && row.requester_id === myId);
  const query = search.trim().toLocaleLowerCase();
  const searching = query.length >= 2;
  const results = rows.filter((row) => {
    const profile = data?.profiles.get(otherId(row, myId));
    return [profile?.display_name, profile?.username].some((value) => value?.toLocaleLowerCase().includes(query));
  });
  const cards = (items) => <div className="space-y-2">{items.map((row) => <SupabaseFriendCard key={row.id} friendship={row} profile={data.profiles.get(otherId(row, myId))} profileId={otherId(row, myId)} incoming={row.receiver_id === myId} busy={!!pending} pending={pending === row.id} onAction={run} />)}</div>;

  return <section className="mx-auto max-w-3xl py-2">
    <div className="mb-5"><h1 className="font-space text-2xl font-bold text-foreground">Amigos</h1><p className="text-sm text-muted-foreground">{data && !loading ? `${accepted.length} conexões no Zoku` : 'Suas conexões no Zoku'}</p></div>
    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar amigos e solicitações" aria-describedby="friends-search-help" placeholder="Buscar amigos e solicitações..." className="border-none bg-secondary pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {/* The existing service only supports profilesByIds, not broad discovery. */}
    <p id="friends-search-help" className="mb-4 mt-2 text-xs text-muted-foreground">Busque pelo nome ou usuário entre suas conexões e solicitações. A busca por novas pessoas ainda não está disponível.</p>
    {error && <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}{!data && <Button variant="outline" className="ml-2" disabled={loading} onClick={load}>Tentar novamente</Button>}</div>}
    {loading ? <p role="status" className="py-8 text-sm text-muted-foreground">Carregando conexões...</p> : data && (searching ? <section aria-label="Resultados da busca">{results.length ? cards(results) : <Empty>Nenhuma conexão encontrada.</Empty>}</section> : <Tabs value={tab} onValueChange={(value) => setParams((current) => { const next = new URLSearchParams(current); next.set('tab', value); return next; }, { replace: true })}>
      <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-secondary"><TabsTrigger value="friends">Amigos ({accepted.length})</TabsTrigger><TabsTrigger value="requests">Solicitações{received.length > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{received.length}</span>}</TabsTrigger></TabsList>
      <TabsContent value="friends">{accepted.length ? cards(accepted) : <Empty>Você ainda não tem amigos no Zoku.</Empty>}</TabsContent>
      <TabsContent value="requests" className="space-y-4">{received.length + sent.length === 0 ? <Empty>Nenhuma solicitação pendente.</Empty> : <>{received.length > 0 && <section><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recebidas</h2>{cards(received)}</section>}{sent.length > 0 && <section><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enviadas</h2>{cards(sent)}</section>}</>}</TabsContent>
    </Tabs>)}
  </section>;
}
