import { Link } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SupabaseBrand from './SupabaseBrand';
import SupabaseUserMenuButton from './SupabaseUserMenuButton';

export default function SupabaseTopBar({ avatar }) {
  return <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
    <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
      <Link to="/" aria-label="Zoku início" className="lg:hidden flex items-center gap-2 shrink-0"><SupabaseBrand /></Link>
      <div className="flex-1 min-w-0">
        {/* Search depends on the legacy catalog. Replace when Supabase search is available. */}
        <div className="relative flex-1 max-w-xl" title="Busca disponível em breve">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input disabled aria-label="Busca disponível em breve" placeholder="Buscar tudo: obras, usuários, comunidades, eventos..." className="pl-9 pr-9 bg-secondary border-none h-9 text-sm placeholder:text-muted-foreground/60" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {/* Preserve the bell position without loading the legacy notification backend. */}
        <Button disabled variant="ghost" size="icon" aria-label="Notificações disponíveis em breve" title="Notificações disponíveis em breve" className="relative text-muted-foreground"><Bell className="w-5 h-5" /></Button>
        <SupabaseUserMenuButton avatar={avatar} />
      </div>
    </div>
  </header>;
}
