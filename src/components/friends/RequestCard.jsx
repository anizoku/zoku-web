import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function Avatar({ profile, name, variant = "primary" }) {
  const bg = variant === "primary" ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary text-muted-foreground";
  return (
    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold overflow-hidden shrink-0 ${bg}`}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} className="w-full h-full object-cover" />
        : (name || "A")[0].toUpperCase()}
    </div>
  );
}

export function ReceivedRequestCard({ friendship, profile, onAccept, onReject, disabled }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
      <Avatar profile={profile} name={friendship.requester_name} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{friendship.requester_name}</p>
        {profile?.username && <p className="text-xs text-primary/70">@{profile.username}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">quer adicionar você</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={disabled} onClick={onAccept}>
          <Check className="w-3.5 h-3.5" /> Aceitar
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-border hover:border-destructive hover:text-destructive" disabled={disabled} onClick={onReject}>
          <X className="w-3.5 h-3.5" /> Recusar
        </Button>
      </div>
    </div>
  );
}

export function SentRequestCard({ friendship, profile, onCancel, disabled }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
      <Avatar profile={profile} name={friendship.receiver_name} variant="secondary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{friendship.receiver_name}</p>
        {profile?.username && <p className="text-xs text-primary/70">@{profile.username}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:inline">Solicitação enviada</span>
        <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" disabled={disabled} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}