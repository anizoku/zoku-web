import { Link } from 'react-router-dom';
import { Check, Loader2, MessageCircle, MoreVertical, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { ProfileImage, useProfileMedia } from '../ProfileMedia';

export default function SupabaseFriendCard({ friendship, profile, profileId, incoming, busy, pending, onAction }) {
  const media = useProfileMedia(profile);
  const name = profile?.display_name || (profile?.username ? `@${profile.username}` : 'Perfil indisponível');
  const accepted = friendship.status === 'accepted';
  return (
    <article aria-busy={pending} className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/20 hover:bg-secondary/30">
      <Link to={`/u/${profileId}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary">
        <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 font-bold text-primary ${accepted ? 'h-11 w-11' : 'h-10 w-10'}`}>
          <ProfileImage src={media.avatar} crop={profile?.avatar_crop} alt="" className="h-full w-full object-cover" fallback={<span>{profile ? name.slice(0, 1).toUpperCase() : '?'}</span>} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {profile?.username && <span className="block truncate text-xs text-primary/70">@{profile.username}</span>}
          {!accepted && <span className="block text-xs text-muted-foreground">{incoming ? 'quer adicionar você' : 'Solicitação enviada'}</span>}
        </span>
      </Link>
      {/* Presence and watch-together have no migrated data source. */}
      {accepted ? <div className="flex items-center gap-1">
        {pending && <Loader2 aria-label="Atualizando amizade" className="h-4 w-4 animate-spin" />}
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Link to="/messages" aria-label={`Enviar mensagem para ${name}`}><MessageCircle className="h-4 w-4" /></Link></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button disabled={busy} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Opções de ${name}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to={`/u/${profileId}`}>Ver perfil</Link></DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => onAction(friendship.id, 'remove')}>Remover amigo</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div> : <div className="flex w-full justify-end gap-2 sm:w-auto">
        {pending && <Loader2 aria-label="Atualizando solicitação" className="h-4 w-4 self-center animate-spin" />}
        {incoming && <Button disabled={busy} className="h-8 gap-1 text-xs" onClick={() => onAction(friendship.id, 'accept')}><Check className="h-3.5 w-3.5" />Aceitar</Button>}
        <Button disabled={busy} variant={incoming ? 'outline' : 'ghost'} className={`h-8 gap-1 text-xs ${incoming ? 'hover:text-destructive' : 'text-muted-foreground'}`} onClick={() => onAction(friendship.id, incoming ? 'reject' : 'cancel')}><X className="h-3.5 w-3.5" />{incoming ? 'Recusar' : 'Cancelar'}</Button>
      </div>}
    </article>
  );
}
