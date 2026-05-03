import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, ChevronLeft, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { getMyFriends } from "@/lib/social";

function initials(name) { return (name || "?")[0].toUpperCase(); }

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeChat, setActiveChat] = useState(null); // { email, name, avatar }
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: () => base44.entities.Friendship.list("-created_date", 200),
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: profiles } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 200),
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: allMessages } = useQuery({
    queryKey: ["dm-all", currentUser?.email],
    queryFn: () => base44.entities.DirectMessage.list("-created_date", 200),
    enabled: !!currentUser?.email && open,
    initialData: [],
    refetchInterval: open ? 5000 : false,
  });

  const friends = currentUser ? getMyFriends(friendships, currentUser.email) : [];

  // Unread count per friend
  const unreadByFriend = {};
  allMessages.forEach(m => {
    if (m.receiver_email === currentUser?.email && !m.is_read) {
      unreadByFriend[m.sender_email] = (unreadByFriend[m.sender_email] || 0) + 1;
    }
  });
  const totalUnread = Object.values(unreadByFriend).reduce((a, b) => a + b, 0);

  // Active conversation messages
  const conversation = activeChat
    ? [...allMessages]
        .filter(m =>
          (m.sender_email === currentUser?.email && m.receiver_email === activeChat.email) ||
          (m.sender_email === activeChat.email && m.receiver_email === currentUser?.email)
        )
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.DirectMessage.create({
      sender_email: currentUser.email,
      receiver_email: activeChat.email,
      content: message.trim(),
    }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["dm-all", currentUser?.email] });
    },
  });

  // Mark read when opening chat
  useEffect(() => {
    if (!activeChat || !currentUser?.email) return;
    conversation
      .filter(m => m.receiver_email === currentUser.email && !m.is_read)
      .forEach(m => base44.entities.DirectMessage.update(m.id, { is_read: true }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["dm-all", currentUser?.email] });
      }));
  }, [activeChat?.email, conversation.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length]);

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat window */}
      {open && !minimized && (
        <div className="w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "480px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
            {activeChat ? (
              <>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveChat(null)} className="text-muted-foreground hover:text-foreground p-0.5">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                    {activeChat.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : initials(activeChat.name)}
                  </div>
                  <button onClick={() => navigate(`/u/${activeChat.email}`)} className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                    {activeChat.name}
                  </button>
                </div>
              </>
            ) : (
              <span className="font-semibold text-sm text-foreground">Mensagens</span>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(true)} className="text-muted-foreground hover:text-foreground p-1">
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setOpen(false); setActiveChat(null); }} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!activeChat ? (
            // Friend list
            <div className="flex-1 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-8">Nenhum amigo ainda</p>
              ) : (
                friends.map(f => {
                  const fp = profiles.find(p => p.user_email === f.email);
                  const lastMsg = [...allMessages]
                    .filter(m => (m.sender_email === f.email && m.receiver_email === currentUser.email) ||
                                 (m.sender_email === currentUser.email && m.receiver_email === f.email))
                    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
                  const unread = unreadByFriend[f.email] || 0;
                  return (
                    <button
                      key={f.email}
                      onClick={() => setActiveChat({ email: f.email, name: f.name || f.email, avatar: fp?.avatar_url })}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden relative">
                        {fp?.avatar_url ? <img src={fp.avatar_url} className="w-full h-full object-cover" /> : initials(f.name)}
                        {unread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{f.name || f.email}</p>
                        {lastMsg && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {lastMsg.sender_email === currentUser.email ? "Você: " : ""}{lastMsg.content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            // Chat messages
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0" style={{ height: "280px" }}>
                {conversation.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-1">
                    <MessageCircle className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">Comece a conversa!</p>
                  </div>
                )}
                {conversation.map(msg => {
                  const isMe = msg.sender_email === currentUser?.email;
                  return (
                    <div key={msg.id} className={`flex gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {msg.created_date ? format(new Date(msg.created_date), "HH:mm", { locale: ptBR }) : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="px-3 pb-3 pt-1 border-t border-border flex gap-1.5">
                <Input
                  placeholder="Mensagem..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && message.trim() && sendMutation.mutate()}
                  className="bg-secondary border-none text-sm h-8 text-sm"
                />
                <Button size="icon" className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                  disabled={!message.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => { setOpen(!open); setMinimized(false); }}
        className="w-13 h-13 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center relative"
      >
        <MessageCircle className="w-5 h-5" />
        {totalUnread > 0 && !open && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center px-1">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}