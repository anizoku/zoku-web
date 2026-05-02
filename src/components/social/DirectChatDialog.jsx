import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DirectChatDialog({ open, onClose, currentUser, friendEmail, friendName, friendAvatar }) {
  const [message, setMessage] = useState("");
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ["dm", currentUser?.email, friendEmail],
    queryFn: () => base44.entities.DirectMessage.list("-created_date", 100),
    enabled: !!currentUser?.email && !!friendEmail && open,
    initialData: [],
    refetchInterval: open ? 5000 : false,
  });

  // Filter to this conversation
  const conversation = [...messages]
    .filter(m =>
      (m.sender_email === currentUser?.email && m.receiver_email === friendEmail) ||
      (m.sender_email === friendEmail && m.receiver_email === currentUser?.email)
    )
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.DirectMessage.create({
      sender_email: currentUser.email,
      receiver_email: friendEmail,
      content: message.trim(),
    }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["dm", currentUser?.email, friendEmail] });
    },
  });

  // Mark unread as read
  useEffect(() => {
    if (!open || !currentUser?.email) return;
    conversation
      .filter(m => m.receiver_email === currentUser.email && !m.is_read)
      .forEach(m => base44.entities.DirectMessage.update(m.id, { is_read: true }));
  }, [open, conversation.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length]);

  const initials = (name) => (name || "?")[0].toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm overflow-hidden shrink-0">
            {friendAvatar
              ? <img src={friendAvatar} alt={friendName} className="w-full h-full object-cover" />
              : initials(friendName)
            }
          </div>
          <DialogTitle className="font-space text-base">{friendName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-96">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {conversation.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                <MessageCircle className="w-10 h-10 text-muted-foreground/20" />
                <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
                <p className="text-xs text-muted-foreground/60">Comece a conversa!</p>
              </div>
            )}
            {conversation.map((msg) => {
              const isMe = msg.sender_email === currentUser?.email;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                    style={{ background: isMe ? "hsl(var(--primary)/0.2)" : "hsl(var(--secondary))" }}>
                    {isMe
                      ? (currentUser?.avatar_url
                        ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                        : <span className="text-primary">{initials(currentUser?.full_name)}</span>)
                      : (friendAvatar
                        ? <img src={friendAvatar} className="w-full h-full object-cover" />
                        : <span className="text-foreground">{initials(friendName)}</span>)
                    }
                  </div>
                  <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-secondary text-foreground rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                      {msg.created_date
                        ? format(new Date(msg.created_date), "HH:mm", { locale: ptBR })
                        : ""}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 pb-4 pt-2 border-t border-border flex gap-2">
            <Input
              placeholder="Mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && message.trim() && sendMutation.mutate()}
              className="bg-secondary border-none text-sm"
            />
            <Button
              size="icon"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              disabled={!message.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}