import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function WatchTogetherEditDialog({ wt, trigger }) {
  const [open, setOpen] = useState(false);
  const [mediaTitle, setMediaTitle] = useState(wt.media_title || "");
  const [mediaType, setMediaType] = useState(wt.media_type || "anime");
  const [targetEpisode, setTargetEpisode] = useState(wt.target_episode || "");
  const [targetChapter, setTargetChapter] = useState(wt.target_chapter || "");
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () => base44.entities.WatchTogether.update(wt.id, {
      media_title: mediaTitle.trim(),
      media_type: mediaType,
      target_episode: mediaType !== "manga" ? parseInt(targetEpisode) || null : null,
      target_chapter: mediaType === "manga" ? parseInt(targetChapter) || null : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-together"] });
      setOpen(false);
    },
  });

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-space">Editar Assistir Juntos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Título da obra"
              value={mediaTitle}
              onChange={e => setMediaTitle(e.target.value)}
              className="bg-secondary border-none"
            />
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger className="bg-secondary border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="manga">Mangá</SelectItem>
              </SelectContent>
            </Select>
            {mediaType !== "manga" ? (
              <Input
                placeholder="Episódio alvo"
                type="number"
                value={targetEpisode}
                onChange={e => setTargetEpisode(e.target.value)}
                className="bg-secondary border-none"
              />
            ) : (
              <Input
                placeholder="Capítulo alvo"
                type="number"
                value={targetChapter}
                onChange={e => setTargetChapter(e.target.value)}
                className="bg-secondary border-none"
              />
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!mediaTitle.trim() || updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}