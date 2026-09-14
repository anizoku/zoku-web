import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sendFriendRequest, acceptFriendRequest, getMyFriends } from "@/lib/social";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import FriendCard from "@/components/friends/FriendCard";
import { ReceivedRequestCard, SentRequestCard } from "@/components/friends/RequestCard";
import SearchResults from "@/components/friends/SearchResults";

export default function Friends() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("friends");
  const queryClient = useQueryClient();
  const location = useLocation();

  // Support ?tab=requests from notification routing
  const urlParams = new URLSearchParams(location.search);
  const defaultTab = urlParams.get("tab") || "friends";

  useEffect(() => {
    setActiveTab(defaultTab);
    base44.auth.me().then(setUser).catch(() => {});
  }, [defaultTab]);

  const { data: friendships } = useQuery({ queryKey: ["friendships"], queryFn: () => base44.entities.Friendship.list("-created_date", 200), initialData: [] });
  const { data: profiles } = useQuery({ queryKey: ["user-profiles"], queryFn: () => base44.entities.UserProfile.list("-created_date", 200), initialData: [] });
  const allUsers = profiles.map(p => ({ id: p.id, email: p.user_email, full_name: p.username || p.user_email, avatar_url: p.avatar_url }));
  const { data: allEntries } = useQuery({ queryKey: ["all-entries-public"], queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 500), initialData: [] });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["friendships"] });
  };

  const sendMutation = useMutation({
    mutationFn: ({ targetEmail, targetName }) => sendFriendRequest(user, targetEmail, targetName),
    onSuccess: () => { invalidate(); toast.success("Solicitação enviada!"); },
  });
  const acceptMutation = useMutation({
    mutationFn: ({ id, friendship }) => acceptFriendRequest(id, friendship, user),
    onSuccess: () => { invalidate(); toast.success("Vocês agora são amigos!"); },
  });
  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.Friendship.update(id, { status: "rejected" }),
    onSuccess: () => { invalidate(); toast.success("Solicitação recusada"); },
  });
  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Friendship.delete(id),
    onSuccess: () => { invalidate(); toast.success("Solicitação cancelada"); },
  });

  const myFriends = user ? getMyFriends(friendships, user.email) : [];
  const pendingReceived = friendships.filter(f => f.receiver_email === user?.email && f.status === "pending");
  const pendingSent = friendships.filter(f => f.requester_email === user?.email && f.status === "pending");

  const isSearching = search.length >= 2;
  const searchResults = isSearching
    ? allUsers.filter(u => u.email !== user?.email &&
        (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())))
    : [];

  const handleRespond = () => {
    setSearch("");
    setActiveTab("requests");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-space font-bold text-2xl text-foreground">Amigos</h1>
        <p className="text-sm text-muted-foreground">{myFriends.length} conexões no Zoku</p>
      </div>

      {/* Search bar — fixed above tabs */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar amigos ou pessoas no Zoku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-none"
        />
      </div>

      {isSearching ? (
        <SearchResults
          results={searchResults}
          profiles={profiles}
          friendships={friendships}
          currentUser={user}
          onAdd={(email, name) => sendMutation.mutate({ targetEmail: email, targetName: name })}
          onRespond={handleRespond}
          disabled={sendMutation.isPending}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="friends">Amigos ({myFriends.length})</TabsTrigger>
            <TabsTrigger value="requests">
              Solicitações
              {pendingReceived.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">{pendingReceived.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Friends list */}
          <TabsContent value="friends">
            {myFriends.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Você ainda não tem amigos no Zoku</p>
                <p className="text-xs text-muted-foreground mt-1">Use a busca acima para encontrar pessoas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myFriends.map((f) => {
                  const profile = profiles.find(p => p.user_email === f.email);
                  const friendEntries = allEntries.filter(e => e.created_by === f.email);
                  const activeEntry = friendEntries.find(e => e.status === "watching" || e.status === "reading");
                  return (
                    <FriendCard
                      key={f.email}
                      friend={f}
                      currentUser={user}
                      profile={profile}
                      activeEntry={activeEntry}
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
                        <ReceivedRequestCard
                          key={f.id}
                          friendship={f}
                          profile={reqProfile}
                          onAccept={() => acceptMutation.mutate({ id: f.id, friendship: f })}
                          onReject={() => rejectMutation.mutate(f.id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                        />
                      );
                    })}
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
                        <SentRequestCard
                          key={f.id}
                          friendship={f}
                          profile={recProfile}
                          onCancel={() => cancelMutation.mutate(f.id)}
                          disabled={cancelMutation.isPending}
                        />
                      );
                    })}
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
        </Tabs>
      )}
    </div>
  );
}