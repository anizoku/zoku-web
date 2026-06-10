import { Calendar, Users, Clock, Tv, BookOpen, MapPin, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import EventChatDialog from "./EventChatDialog";

const typeLabels = {
  watch_episode: "Assistir",
  watch_marathon: "Assistir",   // legado
  watch_party: "Assistir",      // legado
  read_chapter: "Ler",
  debate: "Discussão pós-episódio",
  theory_night: "Noite de Teorias",
};

const typeColors = {
  watch_episode: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  watch_marathon: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  watch_party: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  read_chapter: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  debate: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  theory_night: "bg-chart-4/15 text-chart-4 border-chart-4/20",
};

const statusColors = {
  scheduled: "bg-primary/15 text-primary",
  happening: "bg-chart-4/80 text-card",
  finished: "bg-secondary text-muted-foreground",
};

export default function EventCard({ event, user, onJoin }) {
  const [chatOpen, setChatOpen] = useState(false);
  const isParticipating = event.participants?.includes(user?.email);
  const isFull = event.max_participants > 0 && event.participants?.length >= event.max_participants;
  const dateStr = event.event_date
    ? format(new Date(event.event_date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : "";

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 hover:border-primary/20 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge variant="outline" className={`text-[10px] px-1.5 ${typeColors[event.event_type] || ""}`}>
                {typeLabels[event.event_type] || event.event_type}
              </Badge>
              <Badge className={`text-[10px] border-none ${statusColors[event.status] || ""}`}>
                {event.status === "scheduled" ? "Agendado" : event.status === "happening" ? "🔴 Ao Vivo" : "Encerrado"}
              </Badge>
              {event.media_type === "anime"
                ? <Tv className="w-3.5 h-3.5 text-chart-2" />
                : <BookOpen className="w-3.5 h-3.5 text-chart-3" />
              }
            </div>
            <h3 className="font-semibold text-foreground text-base leading-tight">{event.title}</h3>
            {event.media_title && (
              <p className="text-xs text-muted-foreground mt-0.5">📺 {event.media_title}</p>
            )}
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground/80 mb-3 leading-relaxed line-clamp-2">{event.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
          {dateStr && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {dateStr}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {event.participants?.length || 0}
            {event.max_participants > 0 ? ` / ${event.max_participants}` : ""} participantes
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Org. por {event.organizer_name || "?"}
          </span>
        </div>

        {event.participants_names?.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {event.participants_names.slice(0, 5).map((name, i) => (
              <span key={i} className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                {name[0]?.toUpperCase()}
              </span>
            ))}
            {event.participants_names.length > 5 && (
              <span className="text-xs text-muted-foreground">+{event.participants_names.length - 5}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          {event.status !== "finished" && user?.email !== event.organizer_email && (
            <Button
              size="sm"
              variant={isParticipating ? "outline" : "default"}
              disabled={!isParticipating && isFull}
              onClick={onJoin}
              className={isParticipating
                ? "text-xs border-border hover:border-destructive hover:text-destructive"
                : "text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              }
            >
              {isParticipating ? "Sair do evento" : isFull ? "Lotado" : "Participar"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle className="w-3.5 h-3.5" /> Chat
          </Button>
        </div>
      </div>

      <EventChatDialog event={event} user={user} open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}