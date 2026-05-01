import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, UserPlus, Check, X, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { sendFriendRequest, acceptFriendRequest, getMyFriends, getFriendshipStatus } from "@/lib/social";

export default function Friends() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
    initialData: [],
  });

  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: () => base44.entities.Friendship.list("-created_date", 200),
    initialData: [],
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => base44.entities.Notification.list("-created_date", 50),
    initialData: [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["friendships"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const sendMutation = useMutation({
    mutationFn: ({ targetEmail, targetName }) => sendFriendRequest(user, targetEmail, targetName),
    onSuccess: invalidate,
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, friendship }) => acceptFriendRequest(id, friendship, user),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.Friendship.update(id, { status: "rejected" }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.Friendship.delete(id),
    onSuccess: invalidate,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const myFriends = user ? getMyFriends(friendships, user.email) : [];
  const pendingReceived = friendships.filter(f => f.receiver_email === user?.email && f.status === "pending");
  const pendingSent = friendships.filter(f => f.requester_email === user?.email && f.status === "pending");

  const searchResults = search.length >= 2
    ? allUsers.filter(u =>
        u.email !== user?.email &&
        (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
         u.email?.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  const myNotifs = notifications.filter(n => n.recipient_email === user?.email);
  const unreadCount = myNotifs.filter(n => !n.is_read).length;

  function FriendRow({ email, name, friendshipId }) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
        <Avatar className="w-10 h-10 bg-primary/10 rounded-xl">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm rounded-xl">
            {(name || email || "A")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{name || email}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => removeMutation.mutate(friendshipId)}
        >
          <UserMinus className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Amigos</h1>
            <p className="text-sm text-muted-foreground">{myFriends.length} amigos</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">{unreadCount} novas</Badge>
        )}
      </div>

      <Tabs defaultValue="friends">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="friends">Amigos ({myFriends.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Solicitações
            {pendingReceived.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {pendingReceived.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="find">Buscar</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>

        {/* Friends list */}
        <TabsContent value="friends">
          {myFriends.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Você ainda não tem amigos na plataforma</p>
              <p className="text-xs text-muted-foreground mt-1">Use "Buscar" para encontrar pessoas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myFriends.map((f) => {
                const fship = friendships.find(
                  fs => fs.status === "accepted" &&
                    ((fs.requester_email === user.email && fs.receiver_email === f.email) ||
                     (fs.receiver_email === user.email && fs.requester_email === f.email))
                );
                return <FriendRow key={f.email} email={f.email} name={f.name} friendshipId={fship?.id} />;
              })}
            </div>
          )}
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests">
          <div className="space-y-4">
            {pendingReceived.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recebidas</p>
                <div className="space-y-2">
                  {pendingReceived.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <Avatar className="w-10 h-10 rounded-xl">
                        <AvatarFallback className="bg-chart-2/10 text-chart-2 font-bold rounded-xl">
                          {(f.requester_name || "A")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{f.requester_name}</p>
                        <p className="text-xs text-muted-foreground">{f.requester_email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => acceptMutation.mutate({ id: f.id, friendship: f })}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 border-border hover:border-destructive hover:text-destructive"
                          onClick={() => rejectMutation.mutate(f.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingSent.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Enviadas</p>
                <div className="space-y-2">
                  {pendingSent.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <Avatar className="w-10 h-10 rounded-xl">
                        <AvatarFallback className="bg-secondary text-muted-foreground font-bold rounded-xl">
                          {(f.receiver_name || "A")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{f.receiver_name}</p>
                        <p className="text-xs text-muted-foreground">{f.receiver_email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">Pendente</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingReceived.length === 0 && pendingSent.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <p className="text-muted-foreground text-sm">Nenhuma solicitação pendente</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Find users */}
        <TabsContent value="find">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-none"
              />
            </div>
            {search.length >= 2 && (
              <div className="space-y-2">
                {searchResults.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhum usuário encontrado</p>
                )}
                {searchResults.map((u) => {
                  const status = getFriendshipStatus(friendships, user?.email, u.email);
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <Avatar className="w-10 h-10 rounded-xl">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl">
                          {(u.full_name || "A")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      {!status ? (
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs"
                          onClick={() => sendMutation.mutate({ targetEmail: u.email, targetName: u.full_name })}
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Adicionar
                        </Button>
                      ) : status.status === "accepted" ? (
                        <Badge className="bg-primary/10 text-primary border-none text-xs">Amigo</Badge>
                      ) : status.status === "pending" ? (
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          {status.iAmRequester ? "Aguardando" : "Responder"}
                        </Badge>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {search.length < 2 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Digite ao menos 2 caracteres para buscar</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          {myNotifs.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myNotifs.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    notif.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"
                  }`}
                  onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notif.is_read ? "bg-border" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notif.created_date ? new Date(notif.created_date).toLocaleDateString("pt-BR") : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}