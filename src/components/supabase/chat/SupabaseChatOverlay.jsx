import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../../ui/dialog';
import { useSupabaseChat } from './SupabaseChatProvider';
import SupabaseChatPanel from './SupabaseChatPanel';

export default function SupabaseChatOverlay() {
  const chat = useSupabaseChat();
  const [desktop, setDesktop] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);
  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 1024px)');
    const update = () => setDesktop(query.matches);
    query?.addEventListener('change', update);
    return () => query?.removeEventListener('change', update);
  }, []);
  if (!chat.enabled) return null;
  if (!desktop) return <Dialog open={chat.open && !chat.minimized} onOpenChange={(value) => { if (!value) chat.close(); }}>
    <DialogContent aria-describedby={undefined} className={`bottom-16 left-0 right-0 top-auto z-[60] flex max-h-[75dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-border bg-card p-0 sm:rounded-t-2xl [&>button]:hidden ${chat.activeId ? 'h-[65dvh]' : ''}`}>
      <DialogTitle className="sr-only">Chat</DialogTitle><SupabaseChatPanel floating mobile />
    </DialogContent>
  </Dialog>;
  if (chat.standalone) return null;
  return <div className="fixed bottom-5 right-5 z-50 hidden flex-col items-end gap-2 lg:flex">
    {chat.open && !chat.minimized && <section aria-label="Chat" className={`flex max-h-[min(480px,calc(100dvh-100px))] w-80 flex-col overflow-hidden rounded-2xl border border-border shadow-2xl ${chat.activeId ? 'h-[400px]' : ''}`}><SupabaseChatPanel floating /></section>}
    <button aria-label={chat.minimized ? 'Restaurar chat' : chat.open ? 'Fechar chat' : 'Abrir chat'} aria-expanded={chat.open && !chat.minimized} onClick={chat.open && !chat.minimized ? chat.close : chat.show} className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90">
      <MessageCircle className="h-5 w-5" />{chat.totalUnread > 0 && <span aria-label={`${chat.totalUnread} conversas não lidas`} className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{chat.totalUnread > 9 ? '9+' : chat.totalUnread}</span>}
    </button>
  </div>;
}
