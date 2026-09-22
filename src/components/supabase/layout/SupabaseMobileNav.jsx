import { Link, useLocation } from 'react-router-dom';
import { Home, Library, MessageCircle, Trophy, Sparkles } from 'lucide-react';
import { scrollMemory } from '@/lib/scrollMemory';
import { useSupabaseChat } from '../chat/SupabaseChatProvider';

const mobileItems = [
  { icon: Home, label: 'Home', path: '/', reset: true },
  { icon: Library, label: 'Obras', path: '/obras' },
  { icon: Trophy, label: 'Ranking', path: '/ranking' },
  { icon: Sparkles, label: 'Para você', path: '/recomendacoes' },
];

export default function SupabaseMobileNav() {
  const { pathname } = useLocation();
  const chat = useSupabaseChat();
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
      {chat.enabled && <button onClick={chat.show} aria-label="Chat" aria-expanded={chat.open && !chat.minimized} className="relative flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-primary">
        <MessageCircle className="h-5 w-5" /><span className="text-[10px] font-medium">Chat</span>{chat.totalUnread > 0 && <span aria-label={`${chat.totalUnread} conversas não lidas`} className="absolute right-2 top-0 rounded-full bg-destructive px-1 text-[9px] text-white">{chat.totalUnread > 9 ? '9+' : chat.totalUnread}</span>}
      </button>}
    </div>
  </nav>;
}
