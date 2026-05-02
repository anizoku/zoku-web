import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, BookOpen, Users } from "lucide-react";
import { sendWatchTogetherInvite } from "@/lib/social";

export default function WatchTogetherButton({ currentUser, friendEmail, friendName, prefilledTitle, prefilledType, prefilledEp, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [mediaTitle, setMediaTitle] = useState(prefilledTitle || "");
  const [mediaType, setMediaType] = useState(prefilledType || "anime");
  const [targetEp, setTargetEp] = useState(prefilledEp ? String(prefilledEp) : "");
  const queryClient = useQueryClient();

  const action = mediaType === "manga" ? "Ler Juntos" : "Assistir Juntos";
  const epLabel = mediaType === "manga" ? "Capítulo alvo" : "Episódio alvo";
  const Icon = mediaType === "manga" ? BookOpen : Play;

  const inviteMutation = useMutation({
    mutationFn: () => sendWatchTogetherInvite(
      currentUser, friendEmail, friendName,
      mediaTitle, mediaType, parseInt(targetEp)
    ),
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["watch-together"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs">
          <Users className="w-3.5 h-3.5" /> {action}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-space flex items-center gap-2 text-base">
            <Icon className={`w-5 h-5 ${mediaType === "manga" ? "text-chart-3" : "text-chart-2"}`} />
            {action} com {friendName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de mídia</label>
            <Select value={mediaType} onValueChange={v => { setMediaType(v); setTargetEp(""); }}>
              <SelectTrigger className="bg-secondary border-none text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anime">📺 Anime</SelectItem>
                <SelectItem value="manga">📖 Mangá</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título</label>
            <Input
              placeholder="Ex: Solo Leveling, One Piece..."
              value={mediaTitle}
              onChange={e => setMediaTitle(e.target.value)}
              className="bg-secondary border-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{epLabel}</label>
            <Input
              type="number"
              placeholder={mediaType === "manga" ? "Ex: 1120" : "Ex: 12"}
              value={targetEp}
              onChange={e => setTargetEp(e.target.value)}
              className="bg-secondary border-none"
            />
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground border border-border">
            {friendName} receberá: <span className="text-foreground font-medium">
              "{currentUser?.full_name} quer {mediaType === "manga" ? "ler" : "assistir"} {mediaTitle || "..."} {targetEp ? (mediaType === "manga" ? `Capítulo ${targetEp}` : `EP ${targetEp}`) : ""} com você"
            </span>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            disabled={!mediaTitle.trim() || !targetEp || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate()}
          >
            <Users className="w-4 h-4" /> Enviar convite para {action}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}