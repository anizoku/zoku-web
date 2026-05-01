import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Users, Clock, Film, BookOpen, Tv, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import EventCard from "@/components/social/EventCard";
import CreateEventDialog from "@/components/social/CreateEventDialog";

export default function Events() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.SocialEvent.list("-event_date", 50),
    initialData: [],
  });

  const joinMutation = useMutation({
    mutationFn: ({ event }) => {
      const already = event.participants?.includes(user.email);
      const participants = already
        ? event.participants.filter((e) => e !== user.email)
        : [...(event.participants || []), user.email];
      const participants_names = already
        ? (event.participants_names || []).filter((n) => n !== user.full_name)
        : [...(event.participants_names || []), user.full_name];
      return base44.entities.SocialEvent.update(event.id, { participants, participants_names });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const myEvents = events.filter(e => e.organizer_email === user?.email);
  const joined = events.filter(e => e.participants?.includes(user?.email) && e.organizer_email !== user?.email);
  const publicEvents = events.filter(e => e.visibility === "public" && e.organizer_email !== user?.email);

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-chart-5" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Eventos</h1>
            <p className="text-sm text-muted-foreground">Watch parties e debates em grupo</p>
          </div>
        </div>
        {user && <CreateEventDialog user={user} onCreated={() => queryClient.invalidateQueries({ queryKey: ["events"] })} />}
      </div>

      <Tabs defaultValue="public">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="public">Públicos</TabsTrigger>
          <TabsTrigger value="joined">Participando</TabsTrigger>
          <TabsTrigger value="mine">Meus Eventos</TabsTrigger>
        </TabsList>

        {[
          { key: "public", data: publicEvents },
          { key: "joined", data: joined },
          { key: "mine", data: myEvents },
        ].map(({ key, data }) => (
          <TabsContent key={key} value={key}>
            {data.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum evento aqui ainda</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {data.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    user={user}
                    onJoin={() => joinMutation.mutate({ event })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}