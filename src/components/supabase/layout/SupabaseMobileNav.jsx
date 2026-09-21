import { Link, useLocation } from 'react-router-dom';
import { Home, Library, MessageCircle, Trophy, Sparkles } from 'lucide-react';
import { scrollMemory } from '@/lib/scrollMemory';

const mobileItems = [
  { icon: Home, label: 'Home', path: '/', reset: true },
  { icon: Library, label: 'Obras', path: '/obras' },
  { icon: Trophy, label: 'Ranking', path: '/ranking' },
  { icon: Sparkles, label: 'Para você', path: '/recomendacoes' },
  // Option A: open the existing UUID-based inbox instead of the legacy drawer.
  { icon: MessageCircle, label: 'Chat', path: '/messages' },
];

export default function SupabaseMobileNav() {
  const { pathname } = useLocation();
  return <nav aria-label="Menu móvel" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
    <div className="flex items-center justify-around py-2 px-1">
      {mobileItems.map(({ icon: Icon, label, path, reset }) => {
        const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
        return <Link key={path} to={path} aria-current={active ? 'page' : undefined}
          onClick={reset ? () => scrollMemory.requestReset() : undefined}
          className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors flex-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
          <Icon className="w-5 h-5" /><span className="text-[10px] font-medium">{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
