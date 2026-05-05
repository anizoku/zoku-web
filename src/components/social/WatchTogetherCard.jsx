import { useState } from "react";
import { Play, BookOpen, Check, X, Users, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WatchTogetherEditDialog from "@/components/social/WatchTogetherEditDialog";

const statusLabel = { pending: "Aguardando resposta", accepted: "Ativo", rejected: "Recusado", completed: "Concluído" };
const statusColors = {
  pending: "bg-chart-4/15 text-chart-4",
  accepted: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
  completed: "bg-chart-2/15 text-chart-2",
};

export default function WatchTogetherCard({ wt, currentUser, onAccept, onReject, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isInitiator = wt.initiator_email === currentUser?.email;
  const isAdmin = currentUser?.role === "admin";
  const canManage = isInitiator || isAdmin;
  const partnerName = isInitiator ? wt.friend_name : wt.initiator_name;
  const action = wt.media_type === "manga" ? "Ler Juntos" : "Assistir Juntos";
  const Icon = wt.media_type === "manga" ? BookOpen : Play;
  const epLabel = wt.media_type === "manga"
    ? (wt.target_chapter ? `Capítulo ${wt.target_chapter}` : "")
    : (wt.target_episode ? `EP ${wt.target_episode}` : "");
  const isPendingReceived = wt.status === "pending" && wt.friend_email === currentUser?.email;

  return (
    <>
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

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <WatchTogetherEditDialog
                  wt={wt}
                  trigger={
                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="gap-2 text-sm cursor-pointer">
                      <Pencil className="w-4 h-4" /> Editar
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="gap-2 text-sm text-destructive cursor-pointer focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Assistir Juntos?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação não pode ser desfeita. O convite será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-none">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmDelete(false); onDelete && onDelete(); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}