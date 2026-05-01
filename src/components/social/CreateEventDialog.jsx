import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar } from "lucide-react";

const eventTypes = [
  { value: "watch_episode", label: "Assistir Episódio" },
  { value: "watch_marathon", label: "Maratonar Temporada" },
  { value: "read_chapter", label: "Ler Capítulo Novo" },
  { value: "debate", label: "Debate Pós-episódio" },
  { value: "theory_night", label: "Noite de Teorias" },
  { value: "watch_party", label: "Watch Party" },
];

export default function CreateEventDialog({ user, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    media_title: "",
    event_type: "watch_episode",
    media_type: "anime",
    event_date: "",
    max_participants: "",
    visibility: "public",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: () => base44.entities.SocialEvent.create({
      ...form,
      max_participants: parseInt(form.max_participants) || 0,
      organizer_email: user.email,
      organizer_name: user.full_name,
      participants: [user.email],
      participants_names: [user.full_name],
      status: "scheduled",
    }),
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", media_title: "", event_type: "watch_episode", media_type: "anime", event_date: "", max_participants: "", visibility: "public" });
      onCreated?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Criar Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-space flex items-center gap-2">
            <Calendar className="w-5 h-5 text-chart-5" /> Novo Evento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <Input placeholder="Título do evento *" value={form.title} onChange={e => set("title", e.target.value)} className="bg-secondary border-none" />
          <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={e => set("description", e.target.value)} className="bg-secondary border-none resize-none h-20 text-sm" />
          <Input placeholder="Obra relacionada (ex: Jujutsu Kaisen)" value={form.media_title} onChange={e => set("media_title", e.target.value)} className="bg-secondary border-none" />

          <div className="grid grid-cols-2 gap-2">
            <Select value={form.event_type} onValueChange={v => set("event_type", v)}>
              <SelectTrigger className="bg-secondary border-none text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {eventTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.media_type} onValueChange={v => set("media_type", v)}>
              <SelectTrigger className="bg-secondary border-none text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="manga">Mangá</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="datetime-local" value={form.event_date} onChange={e => set("event_date", e.target.value)} className="bg-secondary border-none text-sm" />
            <Input type="number" placeholder="Máx. participantes" value={form.max_participants} onChange={e => set("max_participants", e.target.value)} className="bg-secondary border-none" />
          </div>

          <Select value={form.visibility} onValueChange={v => set("visibility", v)}>
            <SelectTrigger className="bg-secondary border-none text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">🌐 Público</SelectItem>
              <SelectItem value="friends">👥 Apenas amigos</SelectItem>
              <SelectItem value="private">🔒 Privado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!form.title.trim() || !form.event_date || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Criar Evento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}