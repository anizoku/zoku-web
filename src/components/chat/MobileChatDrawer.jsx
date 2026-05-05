import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { getMyFriends } from "@/lib/social";

function initials(name) { return (name || "?")[0].toUpperCase(); }

export default function MobileChatDrawer({ open, onClose }) {
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  useEffect(() => {
    if (!currentUser?.email) return;
    const unsub = base44.entities.DirectMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["dm-all", currentUser.email] });
    });
    return unsub;
  }, [currentUser?.email]);

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
    enabled: !!currentUser?.email,
    initialData: [],
    refetchInterval: 8000,
  });

  const friends = currentUser ? getMyFriends(friendships, currentUser.email) : [];

  const unreadCountByFriend = {};
  allMessages.forEach(m => {
    if (m.receiver_email === currentUser?.email && !m.is_read) {
      unreadCountByFriend[m.sender_email] = (unreadCountByFriend[m.sender_email] || 0) + 1;
    }
  });
  const totalUnread = Object.keys(unreadCountByFriend).length;

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

  const handleClose = () => {
    setActiveChat(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Drawer panel */}
      <div className="absolute bottom-16 left-0 right-0 bg-card border-t border-border rounded-t-2xl flex flex-col overflow-hidden" style={{ maxHeight: "75vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border shrink-0">
          {activeChat ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveChat(null)} className="text-muted-foreground hover:text-foreground p-0.5">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                {activeChat.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" alt="" /> : initials(activeChat.name)}
              </div>
              <button
                onClick={() => { navigate(`/u/${activeChat.email}`); handleClose(); }}
                className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
              >
                {activeChat.name}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">
                Mensagens {totalUnread > 0 && <span className="text-primary">({totalUnread})</span>}
              </span>
            </div>
          )}
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {!activeChat ? (
          <div className="flex-1 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-12">Nenhum amigo ainda</p>
            ) : (
              friends.map(f => {
                const fp = profiles.find(p => p.user_email === f.email);
                const lastMsg = [...allMessages]
                  .filter(m => (m.sender_email === f.email && m.receiver_email === currentUser.email) ||
                               (m.sender_email === currentUser.email && m.receiver_email === f.email))
                  .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
                const unreadCount = unreadCountByFriend[f.email] || 0;
                return (
                  <button
                    key={f.email}
                    onClick={() => setActiveChat({ email: f.email, name: f.name || f.email, avatar: fp?.avatar_url })}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                      {fp?.avatar_url ? <img src={fp.avatar_url} className="w-full h-full object-cover" alt="" /> : initials(f.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">{f.name || f.email}</p>
                        {unreadCount > 0 && (
                          <span className="text-xs font-bold text-primary">({unreadCount})</span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className={`text-[11px] truncate ${unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
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
          <>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {conversation.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 gap-1">
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
                        {msg.created_date ? new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="px-3 pb-3 pt-1 border-t border-border flex gap-1.5 shrink-0">
              <Input
                placeholder="Mensagem..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && message.trim() && sendMutation.mutate()}
                className="bg-secondary border-none text-sm h-8"
              />
              <Button
                size="icon"
                className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                disabled={!message.trim() || sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}