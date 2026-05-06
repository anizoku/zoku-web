import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { sendFriendRequest, acceptFriendRequest, getFriendshipStatus, getMyFriends } from "@/lib/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, UserPlus, UserMinus, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FriendManagement({ currentUser }) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: () => base44.entities.Friendship.list("-created_date", 200),
    initialData: [],
  });
  const { data: profiles } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 200),
    initialData: [],
  });
  // Use UserProfile (publicly readable) instead of User.list() which is admin-only
  const allUsers = profiles.map(p => ({ id: p.id, email: p.user_email, full_name: p.username || p.user_email, avatar_url: p.avatar_url }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["friendships"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const sendMutation = useMutation({
    mutationFn: ({ targetEmail, targetName }) => sendFriendRequest(currentUser, targetEmail, targetName),
    onSuccess: invalidate,
  });
  const acceptMutation = useMutation({
    mutationFn: ({ id, friendship }) => acceptFriendRequest(id, friendship, currentUser),
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
  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Friendship.delete(id),
    onSuccess: invalidate,
  });

  const myFriends = currentUser ? getMyFriends(friendships, currentUser.email) : [];
  const pendingReceived = friendships.filter(f => f.receiver_email === currentUser?.email && f.status === "pending");
  const pendingSent = friendships.filter(f => f.requester_email === currentUser?.email && f.status === "pending");

  const searchResults = search.length >= 2
    ? allUsers.filter(u =>
        u.email !== currentUser?.email &&
        (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  function getFship(email) {
    return friendships.find(f =>
      f.status === "accepted" &&
      ((f.requester_email === currentUser?.email && f.receiver_email === email) ||
       (f.receiver_email === currentUser?.email && f.requester_email === email))
    );
  }

  return (
    <div className="space-y-6">
      {/* Friends list */}
      {myFriends.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Amigos ({myFriends.length})</p>
          <div className="space-y-2">
            {myFriends.map(f => {
              const profile = profiles.find(p => p.user_email === f.email);
              const fship = getFship(f.email);
              return (
                <div key={f.email} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <button onClick={() => navigate(`/u/${f.email}`)}
                    className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden shrink-0 hover:opacity-80">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt={f.name} className="w-full h-full object-cover" />
                      : <span className="text-sm">{(f.name || "A")[0].toUpperCase()}</span>
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/u/${f.email}`)} className="font-medium text-sm hover:text-primary transition-colors truncate block text-left">
                      {f.name || f.email}
                    </button>
                    {profile?.username && <p className="text-[10px] text-primary/70">@{profile.username}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive px-2"
                    onClick={() => fship && removeMutation.mutate(fship.id)}>
                    <UserMinus className="w-3 h-3" /> Remover
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Solicitações recebidas</p>
          <div className="space-y-2">
            {pendingReceived.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="w-9 h-9 rounded-full bg-chart-2/10 flex items-center justify-center font-bold text-chart-2 text-sm shrink-0">
                  {(f.requester_name || "A")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{f.requester_name}</p>
                  <p className="text-xs text-muted-foreground">{f.requester_email}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="icon" className="h-7 w-7 bg-primary text-primary-foreground"
                    onClick={() => acceptMutation.mutate({ id: f.id, friendship: f })}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7 border-border hover:border-destructive hover:text-destructive"
                    onClick={() => rejectMutation.mutate(f.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Solicitações enviadas</p>
          <div className="space-y-2">
            {pendingSent.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-sm shrink-0">
                  {(f.receiver_name || "A")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{f.receiver_name}</p>
                  <p className="text-xs text-muted-foreground">{f.receiver_email}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => cancelMutation.mutate(f.id)}>
                  Cancelar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add friends search */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Adicionar amigos</p>
        <div className="relative mb-3">
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
            {searchResults.map(u => {
              const status = getFriendshipStatus(friendships, currentUser?.email, u.email);
              const profile = profiles.find(p => p.user_email === u.email);
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden shrink-0">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                      : <span className="text-sm">{(u.full_name || "A")[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  {!status ? (
                    <Button size="sm" className="bg-primary text-primary-foreground gap-1 text-xs h-7"
                      onClick={() => sendMutation.mutate({ targetEmail: u.email, targetName: u.full_name })}>
                      <UserPlus className="w-3 h-3" /> Adicionar
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
        {search.length < 2 && myFriends.length === 0 && pendingReceived.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Digite ao menos 2 caracteres para buscar</p>
          </div>
        )}
      </div>
    </div>
  );
}