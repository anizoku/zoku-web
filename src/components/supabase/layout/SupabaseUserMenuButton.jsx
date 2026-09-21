import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, List, Users, Calendar, LogOut, MessageCircle } from 'lucide-react';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProfileImage } from '../ProfileMedia';

const links = [
  ['/profile', 'Ver Perfil', User],
  ['/my-list', 'Minha Lista', List],
  ['/friends', 'Amigos', Users],
  ['/events', 'Eventos', Calendar],
  ['/messages', 'Mensagens', MessageCircle],
];

export default function SupabaseUserMenuButton({ avatar }) {
  const { user, profile, logout } = useSupabaseAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user) return <Link to="/login" className="text-sm text-primary">Entrar</Link>;
  const name = profile?.display_name || profile?.username || user.user_metadata?.full_name || 'Usuário';

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Menu da conta" disabled={busy} className="w-9 h-9 rounded-full border-2 border-border hover:border-primary/50 transition-colors overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0">
          <ProfileImage src={avatar} crop={profile?.avatar_crop} alt={name} className="w-full h-full object-cover"
            fallback={<span className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{name[0].toUpperCase()}</span>} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-card border-border">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="font-semibold text-sm text-foreground truncate">{name}</p>
          {profile?.username && <p className="text-xs text-primary/80">@{profile.username}</p>}
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        {links.map(([to, label, Icon]) => <DropdownMenuItem key={to} asChild className="gap-2 cursor-pointer">
          <Link to={to}><Icon className="w-4 h-4 text-muted-foreground" />{label}</Link>
        </DropdownMenuItem>)}
        {/* Admin claims are not inferred from legacy roles; only safe router links are shown. */}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem disabled={busy} className="gap-2 cursor-pointer text-destructive focus:text-destructive" onSelect={async event => {
          event.preventDefault();
          setBusy(true); setError('');
          try { await logout(); }
          catch { setError('Não foi possível sair. Tente novamente.'); }
          finally { setBusy(false); }
        }}><LogOut className="w-4 h-4" />{busy ? 'Saindo…' : 'Sair'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {error && <p role="alert" className="absolute top-full right-4 mt-2 max-w-xs rounded-lg border border-border bg-card p-3 text-sm text-destructive">{error}</p>}
  </>;
}
