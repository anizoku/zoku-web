import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Home, User, List, Library, LogOut } from 'lucide-react';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { Button } from '../ui/button';

export default function ProfileLayout() {
  const { user, profile, logout } = useSupabaseAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigation = [['/', 'Início', Home], ['/profile', 'Meu perfil', User], ['/my-list', 'Minha lista', List], ['/obras', 'Obras', Library]];
  return <div className="min-h-screen bg-background text-foreground">
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border bg-card p-5">
      <Link to="/" className="font-space text-3xl font-bold text-primary mb-10">Zoku</Link>
      <nav aria-label="Menu principal" className="space-y-2">{navigation.map(([to, label, Icon]) => <NavLink key={to} to={to} end className={({ isActive }) => `flex items-center gap-3 rounded-lg p-3 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}><Icon size={19} />{label}</NavLink>)}</nav>
      <p className="mt-auto text-xs text-muted-foreground">Algumas áreas estarão disponíveis em breve.</p>
    </aside>
    <div className="lg:pl-60">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4 flex justify-between items-center gap-3">
        <Link to="/" className="font-space font-bold text-primary lg:hidden">Zoku</Link>
        <span className="truncate text-sm hidden sm:block">{profile?.display_name || 'Seu universo anime'}</span>
        {user ? <div className="flex items-center gap-3 ml-auto"><Link to="/profile" className="text-sm truncate max-w-40">@{profile?.username || 'meu perfil'}</Link><Button variant="ghost" disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { await logout(); } catch { setError('Não foi possível sair. Tente novamente.'); }
          finally { setBusy(false); }
        }}><LogOut size={16} />{busy ? 'Saindo…' : 'Sair'}</Button></div> : <Link to="/login" className="text-primary">Entrar</Link>}
      </header>
      {error && <p role="alert" className="p-4 text-destructive">{error}</p>}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 pb-24"><Outlet /></main>
    </div>
    <nav aria-label="Menu móvel" className="lg:hidden fixed bottom-0 inset-x-0 border-t border-border bg-card flex justify-around p-3 z-20">{navigation.map(([to, label, Icon]) => <NavLink key={to} to={to} end className={({ isActive }) => `flex flex-col items-center gap-1 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}><Icon size={20} />{label}</NavLink>)}</nav>
  </div>;
}
