import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EventChatDialog({ event, user, open, onClose }) {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: comments } = useQuery({
    queryKey: ["event-comments", event?.id],
    queryFn: () => base44.entities.EventComment.filter({ event_id: event.id }, "-created_date", 50),
    enabled: !!event?.id && open,
    initialData: [],
  });

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.EventComment.create({
      event_id: event.id,
      content: message.trim(),
      author_name: user?.full_name || "Anônimo",
      author_email: user?.email,
    }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["event-comments", event?.id] });
    },
  });

  const sorted = [...comments].reverse();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-space text-sm">{event?.title} — Chat</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-72">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
            {sorted.length === 0 && (
              <p className="text-muted-foreground text-xs text-center py-6">Nenhuma mensagem ainda. Seja o primeiro!</p>
            )}
            {sorted.map((c) => (
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
            ))}
          </div>
          <div className="flex gap-2">
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