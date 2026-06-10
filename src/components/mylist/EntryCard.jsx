import { useState } from "react";
import { Tv, BookOpen, Film, Minus, Plus, Zap, Star, MoreVertical, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import ProgressInput from "@/components/media/ProgressInput";
import WorkLink from "@/components/media/WorkLink";
import { XP_REWARDS } from "@/lib/xpSystem";
import { CATALOG } from "@/lib/catalog";

// ── helpers ──────────────────────────────────────────────────
const STATUS_LABELS = {
  watching: "Assistindo", reading: "Lendo", completed: "Concluído",
  planned: "Planejado", dropped: "Dropado", on_hold: "Pausado",
};

const STATUS_COLORS = {
  watching: "bg-primary/15 text-primary border-primary/20",
  reading: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  completed: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  planned: "bg-secondary text-secondary-foreground border-border",
  dropped: "bg-destructive/15 text-destructive border-destructive/20",
  on_hold: "bg-chart-3/15 text-chart-3 border-chart-3/20",
};

const MEDIA_TYPE_LABEL = { anime: "Anime", manga: "Mangá", movie: "Filme", liveaction: "Live-Action" };

function getMediaTypeFromEntry(entry) {
  const fmt = entry.genre?.startsWith("__format:") ? entry.genre.replace("__format:", "") : null;
  if (fmt === "movie" || entry.type === "movie") return "movie";
  if (fmt === "liveaction") return "liveaction";
  if (fmt === "manga" || entry.type === "manga") return "manga";
  return "anime";
}

function getCatalogEntry(title) {
  return CATALOG.find(c => c.title.toLowerCase() === title?.toLowerCase()) || null;
}

function getCoverUrl(entry) {
  const cat = getCatalogEntry(entry.title);
  return cat?.cover || entry.cover_url || null;
}

function getReleaseStatusLabel(entry, mediaType) {
  const cat = getCatalogEntry(entry.title);
  if (!cat) return null;
  if (mediaType === "movie") return null;
  if (mediaType === "anime") {
    if (cat.animeStatus === "Em exibição") return { label: "Em exibição", airing: true };
    if (cat.animeStatus === "Finalizado") return { label: "Concluído", airing: false };
  }
  if (mediaType === "manga") {
    if (cat.mangaStatus === "Em publicação" || cat.mangaStatus === "Hiato") return { label: "Em publicação", airing: true };
    if (cat.mangaStatus === "Finalizado") return { label: "Concluído", airing: false };
  }
  return null;
}

function calculateProgress(current, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

function formatProgressLabel(current, total, isAnime) {
  const unit = isAnime ? "Ep." : "Cap.";
  if (total > 0) return `${unit} ${current} / ${total}`;
  return `${unit} ${current}`;
}

// ── Remove confirm dialog ─────────────────────────────────────
function RemoveConfirmDialog({ open, onOpenChange, onConfirm, title }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-space">Remover da lista?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja remover <span className="font-medium text-foreground">"{title}"</span> da sua lista?
        </p>
        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Remover</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Change status dialog ──────────────────────────────────────
function ChangeStatusDialog({ open, onOpenChange, currentStatus, onConfirm }) {
  const [selected, setSelected] = useState(currentStatus);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-space">Alterar status</DialogTitle>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { onConfirm(selected); onOpenChange(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cover thumbnail ───────────────────────────────────────────
function CoverThumb({ coverUrl, mediaType, title }) {
  const [imgError, setImgError] = useState(false);
  const Icon = mediaType === "movie" || mediaType === "liveaction"
    ? Film
    : mediaType === "manga"
      ? BookOpen
      : Tv;
  const iconColor = mediaType === "manga" ? "text-chart-3" : mediaType === "movie" ? "text-chart-5" : "text-chart-2";

  if (coverUrl && !imgError) {
    return (
      <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 border border-border/60">
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`w-14 h-20 rounded-lg shrink-0 border border-border/60 bg-secondary flex items-center justify-center`}>
      <Icon className={`w-6 h-6 ${iconColor} opacity-60`} />
    </div>
  );
}

// ── Main EntryCard ────────────────────────────────────────────
export default function EntryCard({ entry, onUpdate, onRemove }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const mediaType = getMediaTypeFromEntry(entry);
  const isAnime = mediaType === "anime" || mediaType === "liveaction";
  const isMovie = mediaType === "movie";
  const current = isAnime ? (entry.current_episode || 0) : (entry.current_chapter || 0);
  const total = isAnime ? (entry.total_episodes || 0) : (entry.total_chapters || 0);
  const progress = calculateProgress(current, total);
  const coverUrl = getCoverUrl(entry);
  const releaseStatus = getReleaseStatusLabel(entry, mediaType);
  const xpPerAction = isAnime ? XP_REWARDS.episode_watched : XP_REWARDS.chapter_read;

  function increment() {
    if (isMovie) return;
    const field = isAnime ? "current_episode" : "current_chapter";
    const newVal = total > 0 ? Math.min(current + 1, total) : current + 1;
    const updates = { [field]: newVal };
    if (total > 0 && newVal >= total) updates.status = "completed";
    onUpdate(entry.id, updates);
  }

  function decrement() {
    if (current <= 0 || isMovie) return;
    const field = isAnime ? "current_episode" : "current_chapter";
    onUpdate(entry.id, { [field]: current - 1 });
  }

  function jumpTo(newVal) {
    if (isMovie) return;
    const clamped = total > 0 ? Math.min(Math.max(0, newVal), total) : Math.max(0, newVal);
    const field = isAnime ? "current_episode" : "current_chapter";
    const updates = { [field]: clamped };
    if (total > 0 && clamped >= total) updates.status = "completed";
    onUpdate(entry.id, updates);
  }

  // Only show release status badge if it differs from user status (avoid duplicate "Concluído")
  const showReleaseBadge = releaseStatus && !(
    releaseStatus.label === "Concluído" && entry.status === "completed"
  );

  return (
    <>
      <RemoveConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={entry.title}
        onConfirm={() => { setConfirmOpen(false); onRemove(entry.id); }}
      />
      <ChangeStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        currentStatus={entry.status}
        onConfirm={(s) => onUpdate(entry.id, { status: s })}
      />

      <div className="bg-card rounded-xl border border-border p-3 hover:border-primary/20 transition-all flex gap-3">
        {/* Capa */}
        <CoverThumb coverUrl={coverUrl} mediaType={mediaType} title={entry.title} />

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Linha 1: título + menu */}
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <WorkLink
                title={entry.title}
                className="font-semibold text-sm text-foreground hover:text-primary transition-colors leading-tight line-clamp-2"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {MEDIA_TYPE_LABEL[mediaType] || "Anime"}
                {showReleaseBadge && (
                  <span className={`ml-1.5 ${releaseStatus.airing ? "text-primary" : "text-muted-foreground"}`}>
                    • {releaseStatus.label}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Status do usuário */}
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${STATUS_COLORS[entry.status] || ""}`}>
                {STATUS_LABELS[entry.status] || "—"}
              </Badge>

              {/* Menu de ações */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border min-w-[160px]">
                  <DropdownMenuItem onClick={() => setStatusDialogOpen(true)}>
                    Alterar status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Remover da lista
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Linha 2: progresso */}
          {!isMovie && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatProgressLabel(current, total, isAnime)}</span>
                {total > 0 && <span className="text-[10px]">{progress}%</span>}
              </div>
              {total > 0 && <Progress value={progress} className="h-1.5" />}
            </div>
          )}

          {/* Linha 3: ações rápidas */}
          {!isMovie && (
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={decrement}
                  disabled={current <= 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 hover:text-primary hover:bg-primary/10"
                  onClick={increment}
                  disabled={total > 0 && current >= total}
                  title={`+${xpPerAction} XP`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <ProgressInput
                  current={current}
                  total={total}
                  prefix={isAnime ? "EP" : "CP"}
                  onConfirm={jumpTo}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-primary/70 flex items-center gap-0.5 font-medium">
                  <Zap className="w-2.5 h-2.5" /> +{xpPerAction} XP
                </span>
                {entry.rating > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-chart-4">
                    <Star className="w-3 h-3 fill-chart-4" /> {entry.rating}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}