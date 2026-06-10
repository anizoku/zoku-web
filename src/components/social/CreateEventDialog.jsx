import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Plus, Calendar, Search, X, UserPlus } from "lucide-react";
import { notifyEventInvite } from "@/lib/social";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const eventTypes = [
  { value: "watch_episode", label: "Assistir Episódio" },
  { value: "watch_marathon", label: "Maratonar Temporada" },
  { value: "read_chapter", label: "Ler Capítulo Novo" },
  { value: "debate", label: "Debate Pós-episódio" },
  { value: "theory_night", label: "Noite de Teorias" },
  { value: "watch_party", label: "Watch Party" },
];

const eventTypeLabels = {
  watch_episode: "Assistir Episódio",
  watch_marathon: "Maratonar Temporada",
  read_chapter: "Ler Capítulo Novo",
  debate: "Debate Pós-episódio",
  theory_night: "Noite de Teorias",
  watch_party: "Watch Party",
};

/** Gera título automático baseado no tipo e obra */
function generateTitle(eventType, mediaTitle) {
  const typeLabel = eventTypeLabels[eventType] || eventType;
  if (!mediaTitle?.trim()) return typeLabel;
  return `${typeLabel} - ${mediaTitle.trim()}`;
}

const EMPTY_FORM = {
  description: "",
  media_title: "",
  event_type: "watch_episode",
  media_type: "anime",
  event_date: null,   // Date object
  event_time: "",     // "HH:mm" string, optional
  visibility: "public",
};

export default function CreateEventDialog({ user, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Invite search state
  const [inviteSearch, setInviteSearch] = useState("");
  const [invitedPeople, setInvitedPeople] = useState([]); // [{email, full_name, avatar_url}]

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Busca de usuários — reutiliza o mesmo padrão de UserProfile da FriendManagement
  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 200),
    enabled: open,
  });

  const allUsers = profiles
    .filter(p => p.user_email && p.user_email !== user?.email)
    .map(p => ({
      email: p.user_email,
      full_name: p.username || p.user_email,
      avatar_url: p.avatar_url,
    }));

  const searchResults = inviteSearch.length >= 2
    ? allUsers.filter(u =>
        !invitedPeople.some(i => i.email === u.email) &&
        (u.full_name?.toLowerCase().includes(inviteSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(inviteSearch.toLowerCase()))
      ).slice(0, 5)
    : [];

  function addInvite(person) {
    setInvitedPeople(prev => [...prev, person]);
    setInviteSearch("");
  }

  function removeInvite(email) {
    setInvitedPeople(prev => prev.filter(p => p.email !== email));
  }

  // Monta a data final combinando date + time opcionais
  function buildEventDate() {
    if (!form.event_date) return "";
    const d = new Date(form.event_date);
    if (form.event_time) {
      const [h, m] = form.event_time.split(":").map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d.toISOString();
  }

  const autoTitle = generateTitle(form.event_type, form.media_title);

  const createMutation = useMutation({
    mutationFn: async () => {
      const invitedEmails = invitedPeople.map(p => p.email);
      const invitedNames = invitedPeople.map(p => p.full_name);
      await base44.entities.SocialEvent.create({
        title: autoTitle,
        description: form.description,
        media_title: form.media_title,
        event_type: form.event_type,
        media_type: form.media_type,
        event_date: buildEventDate(),
        visibility: form.visibility,
        organizer_email: user.email,
        organizer_name: user.full_name,
        participants: [user.email, ...invitedEmails],
        participants_names: [user.full_name, ...invitedNames],
        status: "scheduled",
      });
      // Notifica os convidados reutilizando a função já existente em social.js
      for (const email of invitedEmails) {
        await notifyEventInvite(autoTitle, email, user.full_name);
      }
    },
    onSuccess: () => {
      setOpen(false);
      setForm(EMPTY_FORM);
      setInvitedPeople([]);
      setInviteSearch("");
      onCreated?.();
    },
  });

  const canCreate = !!form.event_date && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setInvitedPeople([]); setInviteSearch(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Criar Evento
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-space flex items-center gap-2">
            <Calendar className="w-5 h-5 text-chart-5" /> Novo Evento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Título gerado automaticamente — somente preview */}
          {(form.event_type || form.media_title) && (
            <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-[10px] text-primary/70 uppercase tracking-wide font-semibold mb-0.5">Título gerado</p>
              <p className="text-sm font-medium text-foreground">{autoTitle}</p>
            </div>
          )}

          {/* Descrição */}
          <Textarea
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={e => set("description", e.target.value)}
            className="bg-secondary border-none resize-none h-20 text-sm"
          />

          {/* Obra relacionada */}
          <Input
            placeholder="Obra relacionada (ex: Jujutsu Kaisen)"
            value={form.media_title}
            onChange={e => set("media_title", e.target.value)}
            className="bg-secondary border-none"
          />

          {/* Tipo de evento + tipo de mídia */}
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

          {/* Data (calendário) + Hora (opcional) */}
          <div className="grid grid-cols-2 gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 h-9 px-3 rounded-md bg-secondary text-sm text-left w-full hover:bg-secondary/80 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className={form.event_date ? "text-foreground" : "text-muted-foreground"}>
                    {form.event_date
                      ? format(form.event_date, "dd/MM/yyyy", { locale: ptBR })
                      : "Escolher data *"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <CalendarUI
                  mode="single"
                  selected={form.event_date}
                  onSelect={(date) => { set("event_date", date); setCalendarOpen(false); }}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Input
              type="time"
              placeholder="Horário (opcional)"
              value={form.event_time}
              onChange={e => set("event_time", e.target.value)}
              className="bg-secondary border-none text-sm"
            />
          </div>
          {!form.event_date && (
            <p className="text-[10px] text-muted-foreground -mt-1">* A data é obrigatória. O horário é opcional.</p>
          )}

          {/* Privacidade */}
          <Select value={form.visibility} onValueChange={v => set("visibility", v)}>
            <SelectTrigger className="bg-secondary border-none text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">🌐 Público</SelectItem>
              <SelectItem value="friends">👥 Apenas amigos</SelectItem>
              <SelectItem value="private">🔒 Privado</SelectItem>
            </SelectContent>
          </Select>

          {/* Convidar pessoas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Convidar pessoas</p>

            {/* Pessoas já selecionadas */}
            {invitedPeople.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {invitedPeople.map(p => (
                  <div key={p.email} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
                    <span className="font-medium text-primary">{p.full_name}</span>
                    <button onClick={() => removeInvite(p.email)} className="text-primary/60 hover:text-primary ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
                className="pl-8 bg-secondary border-none text-sm h-9"
              />
            </div>

            {/* Resultados da busca */}
            {inviteSearch.length >= 2 && (
              <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
                {searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum usuário encontrado</p>
                )}
                {searchResults.map(u => (
                  <div key={u.email} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold text-primary">{(u.full_name || "?")[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                      onClick={() => addInvite(u)}>
                      <UserPlus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão criar */}
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!canCreate}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Criando..." : "Criar Evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}