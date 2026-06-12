import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, UserPlus, Check, X, UserMinus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sendFriendRequest, acceptFriendRequest, getMyFriends, getFriendshipStatus } from "@/lib/social";
import DirectChatDialog from "@/components/social/DirectChatDialog";
import WatchTogetherButton from "@/components/social/WatchTogetherButton";
import { useNavigate, useLocation } from "react-router-dom";

function FriendCard({ friend, currentUser, profiles, entries, friendshipId, onRemove }) {
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();
  const profile = profiles.find(p => p.user_email === friend.email);
  const friendEntries = entries.filter(e => e.created_by === friend.email);
  const activeEntry = friendEntries.find(e => e.status === "watching" || e.status === "reading");
  const statusLabel = activeEntry
    ? `${activeEntry.status === "watching" ? "📺 Assistindo" : "📖 Lendo"} ${activeEntry.title}`
    : "Sem atividade recente";

  return (
    <>
      <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
        <button onClick={() => navigate(`/u/${friend.email}`)} className="relative shrink-0 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
              : <span>{(friend.name || "A")[0].toUpperCase()}</span>
            }
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${activeEntry ? "bg-primary" : "bg-muted-foreground/30"}`} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => navigate(`/u/${friend.email}`)} className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
              {friend.name || friend.email}
            </button>
            {profile?.username && <span className="text-[10px] text-primary/70">@{profile.username}</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{statusLabel}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary px-2"
              onClick={() => setChatOpen(true)}>
              <MessageCircle className="w-3 h-3" /> Chat
            </Button>
            <WatchTogetherButton
              currentUser={currentUser}
              friendEmail={friend.email}
              friendName={friend.name}
              prefilledTitle={activeEntry?.title}
              prefilledType={activeEntry?.type}
              prefilledEp={activeEntry
                ? (activeEntry.type === "anime" ? (activeEntry.current_episode || 0) + 1 : (activeEntry.current_chapter || 0) + 1)
                : undefined
              }
              size="sm"
            />
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive px-2 ml-auto"
              onClick={onRemove}>
              <UserMinus className="w-3 h-3" /> Remover
            </Button>
          </div>
        </div>
      </div>

      <DirectChatDialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUser={currentUser}
        friendEmail={friend.email}
        friendName={friend.name}
        friendAvatar={profile?.avatar_url}
      />
    </>
  );
}

export default function Friends() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const location = useLocation();

  // Support ?tab=requests from notification routing
  const urlParams = new URLSearchParams(location.search);
  const defaultTab = urlParams.get("tab") || "friends";

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: friendships } = useQuery({ queryKey: ["friendships"], queryFn: () => base44.entities.Friendship.list("-created_date", 200), initialData: [] });
  const { data: profiles } = useQuery({ queryKey: ["user-profiles"], queryFn: () => base44.entities.UserProfile.list("-created_date", 200), initialData: [] });
  // Use UserProfile (publicly readable) instead of User.list() which is admin-only
  const allUsers = profiles.map(p => ({ id: p.id, email: p.user_email, full_name: p.username || p.user_email, avatar_url: p.avatar_url }));
  const { data: allEntries } = useQuery({ queryKey: ["all-entries-public"], queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 500), initialData: [] });
  const { data: notifications } = useQuery({ queryKey: ["notifications"], queryFn: () => base44.entities.Notification.list("-created_date", 50), initialData: [] });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["friendships"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const sendMutation = useMutation({ mutationFn: ({ targetEmail, targetName }) => sendFriendRequest(user, targetEmail, targetName), onSuccess: invalidate });
  const acceptMutation = useMutation({ mutationFn: ({ id, friendship }) => acceptFriendRequest(id, friendship, user), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: (id) => base44.entities.Friendship.update(id, { status: "rejected" }), onSuccess: invalidate });
  const removeMutation = useMutation({ mutationFn: (id) => base44.entities.Friendship.delete(id), onSuccess: invalidate });
  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const myFriends = user ? getMyFriends(friendships, user.email) : [];
  const pendingReceived = friendships.filter(f => f.receiver_email === user?.email && f.status === "pending");
  const pendingSent = friendships.filter(f => f.requester_email === user?.email && f.status === "pending");
  const myNotifs = notifications.filter(n => n.recipient_email === user?.email);
  const unreadCount = myNotifs.filter(n => !n.is_read).length;

  const searchResults = search.length >= 2
    ? allUsers.filter(u => u.email !== user?.email &&
        (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())))
    : [];

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
        {unreadCount > 0 && <Badge className="bg-primary text-primary-foreground">{unreadCount} novas</Badge>}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="friends">Amigos ({myFriends.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Solicitações
            {pendingReceived.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">{pendingReceived.length}</span>
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
                return (
                  <FriendCard
                    key={f.email}
                    friend={f}
                    currentUser={user}
                    profiles={profiles}
                    entries={allEntries}
                    friendshipId={fship?.id}
                    onRemove={() => fship && removeMutation.mutate(fship.id)}
                  />
                );
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
                  {pendingReceived.map((f) => {
                    const reqProfile = profiles.find(p => p.user_email === f.requester_email);
                    return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-full bg-chart-2/10 flex items-center justify-center font-bold text-chart-2 overflow-hidden">
                      {reqProfile?.avatar_url
                        ? <img src={reqProfile.avatar_url} className="w-full h-full object-cover" />
                        : (f.requester_name || "A")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{f.requester_name}</p>
                      {reqProfile?.username
                        ? <p className="text-xs text-primary/70">@{reqProfile.username}</p>
                        : null}
                    </div>
                      <div className="flex gap-2">
                        <Button size="icon" className="h-8 w-8 bg-primary text-primary-foreground" onClick={() => acceptMutation.mutate({ id: f.id, friendship: f })}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 border-border hover:border-destructive hover:text-destructive" onClick={() => rejectMutation.mutate(f.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            )}
            {pendingSent.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Enviadas</p>
                <div className="space-y-2">
                  {pendingSent.map((f) => {
                    const recProfile = profiles.find(p => p.user_email === f.receiver_email);
                    return (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground overflow-hidden">
                        {recProfile?.avatar_url
                          ? <img src={recProfile.avatar_url} className="w-full h-full object-cover" />
                          : (f.receiver_name || "A")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{f.receiver_name}</p>
                        {recProfile?.username
                          ? <p className="text-xs text-primary/70">@{recProfile.username}</p>
                          : null}
                      </div>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">Pendente</Badge>
                    </div>
                  );})}
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
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-none" />
            </div>
            {search.length >= 2 && (
              <div className="space-y-2">
                {searchResults.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Nenhum usuário encontrado</p>}
                {searchResults.map((u) => {
                  const status = getFriendshipStatus(friendships, user?.email, u.email);
                  const profile = profiles.find(p => p.user_email === u.email);
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden">
                        {profile?.avatar_url
                          ? <img src={profile.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                          : <span>{(u.full_name || "A")[0].toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{u.full_name}</p>
                        {profiles.find(p => p.user_email === u.email)?.username && (
                          <p className="text-xs text-primary/70">@{profiles.find(p => p.user_email === u.email).username}</p>
                        )}
                      </div>
                      {!status ? (
                        <Button size="sm" className="bg-primary text-primary-foreground gap-1.5 text-xs"
                          onClick={() => sendMutation.mutate({ targetEmail: u.email, targetName: u.full_name })}>
                          <UserPlus className="w-3.5 h-3.5" /> Adicionar
                        </Button>
                      ) : status.status === "accepted" ? (
                        <Badge className="bg-primary/10 text-primary border-none text-xs">Amigo ✓</Badge>
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
                <div key={notif.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${notif.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}
                  onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}>
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