import { Play, BookOpen, Check, X, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusLabel = { pending: "Aguardando resposta", accepted: "Ativo", rejected: "Recusado", completed: "Concluído" };
const statusColors = {
  pending: "bg-chart-4/15 text-chart-4",
  accepted: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
  completed: "bg-chart-2/15 text-chart-2",
};

export default function WatchTogetherCard({ wt, currentUser, onAccept, onReject }) {
  const isInitiator = wt.initiator_email === currentUser?.email;
  const partnerName = isInitiator ? wt.friend_name : wt.initiator_name;
  const action = wt.media_type === "manga" ? "Ler Juntos" : "Assistir Juntos";
  const Icon = wt.media_type === "manga" ? BookOpen : Play;
  const epLabel = wt.media_type === "manga"
    ? (wt.target_chapter ? `Capítulo ${wt.target_chapter}` : "")
    : (wt.target_episode ? `EP ${wt.target_episode}` : "");
  const isPendingReceived = wt.status === "pending" && wt.friend_email === currentUser?.email;

  return (
    <div className={`bg-card rounded-xl border p-4 transition-colors ${
      isPendingReceived ? "border-primary/30 bg-primary/5" : "border-border"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          wt.media_type === "manga" ? "bg-chart-3/10" : "bg-chart-2/10"
        }`}>
          <Icon className={`w-5 h-5 ${wt.media_type === "manga" ? "text-chart-3" : "text-chart-2"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-[10px] border-none ${statusColors[wt.status]}`}>
              {statusLabel[wt.status]}
            </Badge>
            <span className="text-xs text-primary font-semibold">{action}</span>
          </div>
          <p className="font-semibold text-sm text-foreground">{wt.media_title} {epLabel && <span className="text-primary">{epLabel}</span>}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {isInitiator
              ? `Você convidou ${partnerName}`
              : `${partnerName} te convidou`
            }
          </div>
        </div>
      </div>

      {isPendingReceived && onAccept && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 flex-1 text-xs" onClick={onAccept}>
            <Check className="w-3.5 h-3.5" /> Aceitar
          </Button>
          <Button size="sm" variant="outline" className="border-border hover:border-destructive hover:text-destructive gap-1.5 flex-1 text-xs" onClick={onReject}>
            <X className="w-3.5 h-3.5" /> Recusar
          </Button>
        </div>
      )}
    </div>
  );
}