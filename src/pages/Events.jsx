import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Users, Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EventCard from "@/components/social/EventCard";
import CreateEventDialog from "@/components/social/CreateEventDialog";
import WatchTogetherCard from "@/components/social/WatchTogetherCard";

export default function Events() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.SocialEvent.list("-event_date", 50),
    initialData: [],
  });

  const { data: watchTogetherList } = useQuery({
    queryKey: ["watch-together"],
    queryFn: () => base44.entities.WatchTogether.list("-created_date", 50),
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

  const respondWTMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.WatchTogether.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watch-together"] }),
  });

  const deleteWTMutation = useMutation({
    mutationFn: (id) => base44.entities.WatchTogether.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watch-together"] }),
  });

  const myEvents = events.filter(e => e.organizer_email === user?.email);
  // Participando: eventos públicos ou de amigos onde o usuário está na lista de participantes
  const joined = events.filter(e =>
    e.participants?.includes(user?.email) && e.organizer_email !== user?.email
  );
  // Feed público: apenas visibilidade pública, de outros usuários
  const publicEvents = events.filter(e =>
    e.visibility === "public" && e.organizer_email !== user?.email && !e.participants?.includes(user?.email)
  );

  const myWT = watchTogetherList.filter(w =>
    w.initiator_email === user?.email || w.friend_email === user?.email
  );
  const pendingWT = myWT.filter(w => w.status === "pending");
  const activeWT = myWT.filter(w => w.status === "accepted");

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-chart-5" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Eventos</h1>
            <p className="text-sm text-muted-foreground">Watch parties, debates e Assistir Juntos</p>
          </div>
        </div>
        {user && <CreateEventDialog user={user} onCreated={() => queryClient.invalidateQueries({ queryKey: ["events"] })} />}
      </div>

      <Tabs defaultValue="public">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="public">Públicos</TabsTrigger>
          <TabsTrigger value="joined">Participando</TabsTrigger>
          <TabsTrigger value="mine">Meus Eventos</TabsTrigger>
          <TabsTrigger value="watch-together">
            Assistir Juntos
            {pendingWT.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {pendingWT.length}
              </span>
            )}
          </TabsTrigger>
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
                  <EventCard key={event.id} event={event} user={user} onJoin={() => joinMutation.mutate({ event })} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        {/* Watch Together Tab */}
        <TabsContent value="watch-together">
          <div className="space-y-6">
            {pendingWT.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Convites Pendentes ({pendingWT.length})
                </p>
                <div className="grid gap-3">
                  {pendingWT.map(wt => (
                    <WatchTogetherCard
                      key={wt.id}
                      wt={wt}
                      currentUser={user}
                      onAccept={() => respondWTMutation.mutate({ id: wt.id, status: "accepted" })}
                      onReject={() => respondWTMutation.mutate({ id: wt.id, status: "rejected" })}
                      onDelete={() => deleteWTMutation.mutate(wt.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeWT.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ativos</p>
                <div className="grid gap-3">
                  {activeWT.map(wt => (
                    <WatchTogetherCard
                      key={wt.id}
                      wt={wt}
                      currentUser={user}
                      onDelete={() => deleteWTMutation.mutate(wt.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {myWT.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum convite de Assistir Juntos</p>
                <p className="text-xs text-muted-foreground mt-1">Vá no perfil de um amigo e clique em "Assistir Juntos"</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}