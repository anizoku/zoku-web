import SupabaseChatPanel from './chat/SupabaseChatPanel';

export default function DirectMessagesPage() {
  return <section className="mx-auto max-w-3xl space-y-5 py-2">
    <div><h1 className="font-space text-2xl font-bold">Mensagens</h1><p className="mt-1 text-sm text-muted-foreground">Converse diretamente com seus amigos no Zoku.</p></div>
    <div className="h-[min(600px,70dvh)] min-h-80 overflow-hidden rounded-xl border border-border"><SupabaseChatPanel /></div>
  </section>;
}
