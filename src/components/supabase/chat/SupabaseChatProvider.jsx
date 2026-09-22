import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSupabaseAuthClient } from '../../../api/supabaseClient';
import { useSupabaseAuth } from '../../../lib/SupabaseAuthContext';

const ChatContext = createContext(null);
export const useSupabaseChat = () => useContext(ChatContext);
const belongs = (message, me, other) =>
  (message.sender_id === me && message.receiver_id === other) ||
  (message.sender_id === other && message.receiver_id === me);

// UUID merging handles local sends plus INSERT echoes, and preserves a receipt
// if an older SELECT/INSERT arrives after its UPDATE event.
function merge(current, incoming) {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    const previous = messages.get(message.id);
    messages.set(message.id, { ...previous, ...message, read_at: message.read_at || previous?.read_at || null });
  }
  return [...messages.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export default function SupabaseChatProvider({ children }) {
  const { user, profile, friendService, directMessageService } = useSupabaseAuth();
  const myId = user?.id;
  const enabled = !!myId && !!profile?.profile_setup_completed;
  const services = useRef({ friendService, directMessageService });
  useEffect(() => { services.current = { friendService, directMessageService }; }, [friendService, directMessageService]);
  const { pathname } = useLocation();
  const standalone = pathname === '/messages';
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [realtimeError, setRealtimeError] = useState('');
  const [visibleDocument, setVisibleDocument] = useState(!document.hidden);
  const live = useRef(false);
  const loadVersion = useRef(0);
  const sendLock = useRef(false);
  const reading = useRef(new Set());
  const visible = visibleDocument && (standalone || (open && !minimized));
  const currentView = useRef({ activeId, visible });
  useEffect(() => { currentView.current = { activeId, visible }; }, [activeId, visible]);

  useEffect(() => {
    const update = () => setVisibleDocument(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const ticket = ++loadVersion.current;
    setLoading(true);
    setError('');
    const { friendService: fs, directMessageService: dm } = services.current;
    try {
      const rows = await fs.list();
      const ids = [...new Set(rows.filter((row) => row.status === 'accepted' &&
        (row.requester_id === myId || row.receiver_id === myId))
        .map((row) => row.requester_id === myId ? row.receiver_id : row.requester_id))].filter((id) => id !== myId);
      const [profiles, inbox] = await Promise.all([fs.profilesByIds(ids), dm.inbox()]);
      if (!live.current || ticket !== loadVersion.current) return;
      setFriends(ids.map((id) => ({ id, profile: profiles.find((item) => item.id === id) })));
      setActiveId((id) => ids.includes(id) ? id : null);
      setMessages((previous) => merge(previous, inbox.filter((message) => message.sender_id === myId || message.receiver_id === myId)));
      const view = currentView.current;
      if (view.visible && ids.includes(view.activeId)) {
        await dm.markConversationRead(view.activeId);
        const history = await dm.conversation(view.activeId);
        if (live.current && ticket === loadVersion.current) setMessages((previous) => merge(previous, history));
      }
    } catch (err) {
      if (live.current && ticket === loadVersion.current) {
        setFriends([]);
        setActiveId(null);
        setError(err?.message || 'Não foi possível carregar as conversas.');
      }
    } finally {
      if (live.current && ticket === loadVersion.current) setLoading(false);
    }
  }, [enabled, myId]);

  useEffect(() => {
    live.current = true;
    void refresh();
    return () => { live.current = false; loadVersion.current += 1; };
  }, [refresh]);

  const previousStandalone = useRef(standalone);
  useEffect(() => {
    // The shell persists across routes; pick up friendships changed elsewhere.
    if (standalone && !previousStandalone.current) void refresh();
    previousStandalone.current = standalone;
  }, [standalone, refresh]);

  // One account-scoped subscription also updates previews while the popup is
  // closed. RLS remains the authorization boundary; only our own rows are merged.
  useEffect(() => {
    if (!enabled) return undefined;
    let disposed = false;
    let supabase;
    let channel;
    let subscribed = false;
    const receive = ({ new: message }) => {
      if (disposed || !message?.id || (message.sender_id !== myId && message.receiver_id !== myId)) return;
      setMessages((previous) => merge(previous, [message]));
      const view = currentView.current;
      if (view.visible && message.sender_id === view.activeId && message.receiver_id === myId && !message.read_at && !reading.current.has(message.id)) {
        reading.current.add(message.id);
        void services.current.directMessageService.markRead(message.id).then((updated) => {
          if (!disposed && updated) setMessages((previous) => merge(previous, [updated]));
        }).catch(() => {
          if (!disposed) setError('Não foi possível atualizar a leitura. Tente abrir a conversa novamente.');
        }).finally(() => { reading.current.delete(message.id); });
      }
    };
    try {
      supabase = getSupabaseAuthClient();
      if (!supabase) throw new Error('Realtime unavailable');
      channel = supabase.channel(`zoku-chat:${myId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, receive)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, receive)
        .subscribe((status) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') {
            setRealtimeError('');
            // Reconcile messages missed during a disconnect.
            if (subscribed) void refresh();
            subscribed = true;
          } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
            setRealtimeError('Atualizações ao vivo indisponíveis. Reabra a conversa ou atualize a lista.');
          }
        });
    } catch {
      setRealtimeError('Atualizações ao vivo indisponíveis. Reabra a conversa ou atualize a lista.');
    }
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel).catch(() => {});
    };
  }, [enabled, myId, refresh]);

  useEffect(() => {
    if (!enabled || !visible || !activeId) return undefined;
    let disposed = false;
    const dm = services.current.directMessageService;
    setConversationLoading(true);
    setError('');
    void (async () => {
      try {
        const rows = await dm.conversation(activeId);
        if (disposed) return;
        setMessages((previous) => merge(previous, rows));
        // Only mark read while this conversation is actually visible.
        await dm.markConversationRead(activeId);
        if (disposed) return;
        const refreshed = await dm.conversation(activeId);
        if (!disposed) setMessages((previous) => merge(previous, refreshed));
      } catch (err) {
        if (!disposed) setError(err?.message || 'Não foi possível carregar a conversa.');
      } finally {
        if (!disposed) setConversationLoading(false);
      }
    })();
    return () => { disposed = true; };
  }, [enabled, activeId, visible]);

  async function send(content) {
    const receiver = activeId;
    const text = content.trim();
    if (sendLock.current || !text || text.length > 3000 || receiver === myId || !friends.some((friend) => friend.id === receiver)) return false;
    sendLock.current = true;
    setSending(true);
    setError('');
    const dm = services.current.directMessageService;
    let sent = false;
    try {
      const message = await dm.send(receiver, text);
      sent = true;
      if (!live.current) return true;
      if (message) setMessages((previous) => merge(previous, [message]));
      // Deterministic fallback if the INSERT echo is delayed or disconnected.
      const rows = await dm.conversation(receiver);
      if (live.current) setMessages((previous) => merge(previous, rows));
      return true;
    } catch (err) {
      if (live.current) setError(sent ? 'Mensagem enviada; não foi possível atualizar a conversa.' :
        ['42501', 'PGRST301'].includes(err?.code) ? 'Você só pode enviar mensagens para amigos.' : err?.message || 'Não foi possível enviar a mensagem.');
      return sent;
    } finally {
      sendLock.current = false;
      if (live.current) setSending(false);
    }
  }

  const conversations = useMemo(() => friends.map((friend) => {
    const history = messages.filter((message) => belongs(message, myId, friend.id));
    return { ...friend, latest: history.at(-1), unread: history.filter((message) => message.receiver_id === myId && !message.read_at).length };
  }).sort((a, b) => (Date.parse(b.latest?.created_at) || 0) - (Date.parse(a.latest?.created_at) || 0)), [friends, messages, myId]);
  const totalUnread = conversations.filter((conversation) => conversation.unread > 0).length;
  const close = () => { setOpen(false); setMinimized(false); setActiveId(null); };
  const show = () => { setOpen(true); setMinimized(false); void refresh(); };
  const select = (id) => { if (friends.some((friend) => friend.id === id)) setActiveId(id); };

  return <ChatContext.Provider value={{ enabled, myId, standalone, open, minimized, show, close,
    minimize: () => setMinimized(true), activeId, select, back: () => setActiveId(null),
    activeFriend: friends.find((friend) => friend.id === activeId), conversations, totalUnread,
    messages: messages.filter((message) => belongs(message, myId, activeId)),
    loading, conversationLoading, sending, error, realtimeError, refresh, send }}>
    {children}
  </ChatContext.Provider>;
}
