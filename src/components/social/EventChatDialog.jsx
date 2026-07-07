import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EventChatDialog({ event, user, open, onClose }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const dialogOpenRef = useRef(false);
  dialogOpenRef.current = open;

  // Initial load
  useEffect(() => {
    if (!event?.id || !open) return;
    setLoading(true);
    base44.entities.EventComment.filter({ event_id: event.id }, "-created_date", 50)
      .then((data) => {
        setMessages([...data].reverse());
      })
      .finally(() => setLoading(false));
  }, [event?.id, open]);

  // Realtime subscription — updates from any participant without local action
  useEffect(() => {
    if (!event?.id || !open) return;
    const unsubscribe = base44.entities.EventComment.subscribe((ev) => {
      if (ev?.data?.event_id !== event.id) return;
      setMessages((prev) => {
        if (ev.type === "create") {
          if (prev.some((m) => m.id === ev.data.id)) return prev;
          return [...prev, ev.data];
        }
        if (ev.type === "delete") {
          return prev.filter((m) => m.id !== ev.data.id);
        }
        if (ev.type === "update") {
          return prev.map((m) => (m.id === ev.data.id ? ev.data : m));
        }
        return prev;
      });
    });
    return () => unsubscribe();
  }, [event?.id, open]);

  async function handleSend() {
    if (!message.trim()) return;
    const content = message.trim();
    setMessage("");
    const created = await base44.entities.EventComment.create({
      event_id: event.id,
      content,
      author_name: user?.full_name || "Anônimo",
      author_email: user?.email,
    });
    // Optimistic add (subscription may also deliver it)
    setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
    queryClient.invalidateQueries({ queryKey: ["event-comments", event?.id] });

    // Notify other participants (not the author); skip if chat window is the one open (it is, but
    // we still notify so it shows in the bell — the in-dialog view already shows it live).
    const participants = event.participants || [];
    const others = participants.filter((e) => e !== user?.email);
    for (const email of others) {
      base44.entities.Notification.create({
        recipient_email: email,
        type: "event_message",
        message: `${user?.full_name || "Alguém"} enviou uma mensagem no chat de "${event.title}"`,
        from_name: user?.full_name || "ZOKU",
        from_email: user?.email,
        reference_id: event.id,
        is_read: false,
      }).catch(() => {});
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-space text-sm">{event?.title} — Chat</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-72">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
            {loading ? (
              <p className="text-muted-foreground text-xs text-center py-6">Carregando...</p>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-6">Nenhuma mensagem ainda. Seja o primeiro!</p>
            ) : (
              messages.map((c) => (
                <div key={c.id} className={`flex gap-2 ${c.author_email === user?.email ? "flex-row-reverse" : ""}`}>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(c.author_name || "A")[0].toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    c.author_email === user?.email
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}>
                    {c.author_email !== user?.email && (
                      <p className="text-[10px] font-semibold mb-0.5 opacity-70">{c.author_name}</p>
                    )}
                    {c.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && message.trim() && handleSend()}
              className="bg-secondary border-none text-sm"
            />
            <Button
              size="icon"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              disabled={!message.trim()}
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}