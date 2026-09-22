import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Minimize2, Send, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ProfileImage, useProfileMedia } from '../ProfileMedia';
import { useSupabaseChat } from './SupabaseChatProvider';

const nameOf = (profile) => profile?.display_name || (profile?.username ? `@${profile.username}` : 'Perfil indisponível');
function ChatAvatar({ profile }) {
  const { avatar } = useProfileMedia(profile);
  return <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
    <ProfileImage src={avatar} crop={profile?.avatar_crop} alt="" className="h-full w-full object-cover" fallback={<span>{profile ? nameOf(profile)[0].toUpperCase() : '?'}</span>} />
  </span>;
}

function ConversationList() {
  const chat = useSupabaseChat();
  return <div className="min-h-0 flex-1 overflow-y-auto">
    {chat.loading ? <p role="status" className="p-8 text-center text-xs text-muted-foreground">Carregando conversas...</p> : chat.conversations.length === 0 ? <div className="p-8 text-center text-xs text-muted-foreground"><p>Nenhum amigo ainda</p><Link to="/friends" onClick={chat.close} className="mt-2 inline-block text-primary">Abrir amizades</Link></div> : chat.conversations.map((friend) => <button key={friend.id} onClick={() => chat.select(friend.id)} className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-secondary/50">
      <ChatAvatar profile={friend.profile} />
      <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-sm font-medium">{nameOf(friend.profile)}</span>{friend.unread > 0 && <span aria-label={`${friend.unread} mensagens não lidas`} className="shrink-0 text-xs font-bold text-primary">({friend.unread})</span>}</span>
        {friend.profile?.username && <span className="block truncate text-[10px] text-primary/70">@{friend.profile.username}</span>}
        <span className={`block truncate text-[11px] ${friend.unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{friend.latest ? `${friend.latest.sender_id === chat.myId ? 'Você: ' : ''}${friend.latest.content}` : 'Comece a conversa!'}</span>
      </span>
    </button>)}
  </div>;
}

function ConversationView() {
  const chat = useSupabaseChat();
  const [draft, setDraft] = useState('');
  const scroller = useRef(null);
  useEffect(() => {
    // Scroll only the message pane, never the page behind a floating window.
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [chat.messages.length, chat.conversationLoading]);
  return <>
    <div ref={scroller} role="log" aria-label="Mensagens da conversa" className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
      {chat.conversationLoading ? <p role="status" className="text-xs text-muted-foreground">Carregando conversa...</p> : !chat.messages.length ? <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1"><MessageCircle className="h-8 w-8 text-muted-foreground/20" /><p className="text-xs text-muted-foreground">Comece a conversa!</p></div> : chat.messages.map((message) => {
        const mine = message.sender_id === chat.myId;
        const date = new Date(message.created_at);
        return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex min-w-0 max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-full whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${mine ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-secondary text-foreground'}`}>{message.content}</div>
            <span className="mt-0.5 text-[10px] text-muted-foreground">{!Number.isNaN(date.getTime()) && <time dateTime={message.created_at} title={date.toLocaleString('pt-BR')}>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>}{mine && <span className="ml-1.5">{message.read_at ? 'Lida' : 'Enviada'}</span>}</span>
          </div>
        </div>;
      })}
    </div>
    <form className="flex shrink-0 gap-1.5 border-t border-border px-3 pb-3 pt-2" onSubmit={async (event) => { event.preventDefault(); if (await chat.send(draft)) setDraft(''); }}>
      <Input aria-label="Mensagem" placeholder="Mensagem..." className="h-8 min-w-0 border-none bg-secondary text-sm" maxLength={3000} autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={chat.sending || chat.conversationLoading || chat.loading} />
      <Button type="submit" size="icon" aria-label={chat.sending ? 'Enviando mensagem' : 'Enviar mensagem'} disabled={chat.sending || chat.conversationLoading || chat.loading || !draft.trim() || draft.trim().length > 3000} className="h-8 w-8 shrink-0"><Send className="h-3.5 w-3.5" /></Button>
    </form>
  </>;
}

export default function SupabaseChatPanel({ floating = false, mobile = false }) {
  const chat = useSupabaseChat();
  return <div className="flex h-full max-h-[inherit] min-h-0 min-w-0 flex-col overflow-hidden bg-card">
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
      {chat.activeFriend ? <div className="flex min-w-0 items-center gap-2"><Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Voltar às conversas" onClick={chat.back}><ChevronLeft className="h-4 w-4" /></Button><ChatAvatar profile={chat.activeFriend.profile} /><Link to={`/u/${chat.activeId}`} onClick={chat.close} className="truncate text-sm font-semibold hover:text-primary">{nameOf(chat.activeFriend.profile)}</Link></div> : <span className="text-sm font-semibold">Mensagens {chat.totalUnread > 0 && <span className="text-primary">({chat.totalUnread})</span>}</span>}
      {floating && <div className="flex shrink-0 items-center gap-1">{!mobile && <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Minimizar chat" onClick={chat.minimize}><Minimize2 className="h-3.5 w-3.5" /></Button>}<Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Fechar chat" onClick={chat.close}><X className="h-4 w-4" /></Button></div>}
    </header>
    {(chat.error || chat.realtimeError) && <div className="shrink-0 border-b border-border p-3 text-xs"><p role="alert" className="break-words text-destructive">{chat.error || chat.realtimeError}</p><button className="mt-1 text-primary underline" disabled={chat.loading} onClick={chat.refresh}>Atualizar conversas</button></div>}
    {chat.activeFriend ? <ConversationView key={chat.activeId} /> : <ConversationList />}
  </div>;
}
