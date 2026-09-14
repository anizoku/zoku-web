import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Check, ChevronDown, UserMinus, UserPlus, Clock, X } from "lucide-react";
import { sendFriendRequest, acceptFriendRequest, getFriendshipStatus } from "@/lib/social";
import { toast } from "sonner";

export default function FriendshipButton({ currentUser, targetEmail, targetName, targetProfile, friendships }) {
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const queryClient = useQueryClient();

  const status = getFriendshipStatus(friendships, currentUser?.email, targetEmail);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["friendships"] });
  };

  const sendMutation = useMutation({
    mutationFn: () => sendFriendRequest(currentUser, targetEmail, targetName),
    onSuccess: () => { invalidate(); toast.success("Solicitação enviada!"); },
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptFriendRequest(status.id, status, currentUser),
    onSuccess: () => { invalidate(); toast.success("Vocês agora são amigos!"); },
  });

  const rejectMutation = useMutation({
    mutationFn: () => base44.entities.Friendship.update(status.id, { status: "rejected" }),
    onSuccess: () => { invalidate(); toast.success("Solicitação recusada"); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.entities.Friendship.delete(status.id),
    onSuccess: () => { invalidate(); toast.success("Solicitação cancelada"); },
  });

  const unfriendMutation = useMutation({
    mutationFn: () => base44.entities.Friendship.delete(status.id),
    onSuccess: () => { invalidate(); toast.success("Amizade desfeita"); },
  });

  if (!currentUser || currentUser.email === targetEmail) return null;

  // No relation or previously rejected → can add
  if (!status || status.status === "rejected") {
    return (
      <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={sendMutation.isPending}
        onClick={() => sendMutation.mutate()}>
        <UserPlus className="w-3.5 h-3.5" /> Adicionar amigo
      </Button>
    );
  }

  // Pending sent → Aguardando + Cancelar
  if (status.status === "pending" && status.iAmRequester) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" /> Solicitação enviada
        </Badge>
        <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive"
          disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
          Cancelar
        </Button>
      </div>
    );
  }

  // Pending received → Aceitar + Recusar
  if (status.status === "pending" && !status.iAmRequester) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={acceptMutation.isPending}
          onClick={() => acceptMutation.mutate()}>
          <Check className="w-3.5 h-3.5" /> Aceitar
        </Button>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
          <X className="w-3.5 h-3.5" /> Recusar
        </Button>
      </div>
    );
  }

  // Accepted → Amigos ✓ dropdown → Desfazer amizade (with confirmation)
  if (status.status === "accepted") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <Check className="w-3.5 h-3.5 text-primary" /> Amigos
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive focus:text-destructive"
              onClick={() => setShowUnfriendConfirm(true)}>
              <UserMinus className="w-3.5 h-3.5 mr-2" /> Desfazer amizade
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showUnfriendConfirm} onOpenChange={setShowUnfriendConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desfazer amizade com @{targetProfile?.username || targetName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Vocês deixarão de aparecer como amigos no Zoku. Essa ação não exclui mensagens anteriores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={unfriendMutation.isPending}
                onClick={() => { unfriendMutation.mutate(); setShowUnfriendConfirm(false); }}>
                Desfazer amizade
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return null;
}