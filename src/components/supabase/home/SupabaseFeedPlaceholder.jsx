import { MessageSquare, Send } from 'lucide-react';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';

export default function SupabaseFeedPlaceholder({ name }) {
  return <section aria-labelledby="home-feed-title" className="min-w-0 space-y-4 lg:col-span-8">
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 id="home-feed-title" className="sr-only">Feed da comunidade</h2>
      <div className="flex gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{name[0]?.toUpperCase() || 'Z'}</span>
        <div className="min-w-0 flex-1 space-y-3">
          <Textarea disabled aria-label="Criar publicação — em breve" aria-describedby="home-post-unavailable" placeholder="O que você está assistindo? Compartilhe sua opinião..." className="min-h-[80px] resize-none border-none bg-secondary text-sm" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="home-post-unavailable" className="text-xs text-muted-foreground">Publicações estarão disponíveis em breve.</p>
            <Button disabled size="sm" aria-describedby="home-post-unavailable" className="gap-2"><Send aria-hidden="true" className="h-3.5 w-3.5" />Postar</Button>
          </div>
        </div>
      </div>
    </div>
    <div className="rounded-xl border border-border bg-card p-12 text-center">
      <MessageSquare aria-hidden="true" className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">O feed da comunidade estará disponível em breve.</p>
      <p className="mt-2 text-xs text-muted-foreground">As publicações aparecerão aqui quando esta área estiver pronta.</p>
    </div>
  </section>;
}
