import { UserPlus, Check, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFriendshipStatus } from "@/lib/social";

export default function SearchResults({ results, profiles, friendships, currentUser, onAdd, onRespond, disabled }) {
  if (results.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">Nenhum usuário encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((u) => {
        const status = getFriendshipStatus(friendships, currentUser?.email, u.email);
        const profile = profiles.find(p => p.user_email === u.email);
        return (
          <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                : <span>{(u.full_name || "A")[0].toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{u.full_name}</p>
              {profile?.username && <p className="text-xs text-primary/70">@{profile.username}</p>}
            </div>
            {!status || status.status === "rejected" ? (
              <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={disabled}
                onClick={() => onAdd(u.email, u.full_name)}>
                <UserPlus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            ) : status.status === "accepted" ? (
              <Badge className="bg-primary/10 text-primary border-none text-xs gap-1">
                <Check className="w-3 h-3" /> Amigo
              </Badge>
            ) : status.status === "pending" ? (
              status.iAmRequester ? (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground gap-1">
                  <Clock className="w-3 h-3" /> Aguardando
                </Badge>
              ) : (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onRespond}>
                  <MessageCircle className="w-3.5 h-3.5" /> Responder
                </Button>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}