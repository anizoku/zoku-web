import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Film, Users, ChevronDown } from "lucide-react";
import { sendWatchTogetherInvite } from "@/lib/social";

export default function WatchTogetherButton({ currentUser, friendEmail, friendName, prefilledTitle, prefilledType, prefilledEp, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [mediaTitle, setMediaTitle] = useState(prefilledTitle || "");
  const [mediaType, setMediaType] = useState(prefilledType === "manga" ? "anime" : (prefilledType || "anime"));
  const [targetEp, setTargetEp] = useState(prefilledEp ? String(prefilledEp) : "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();

  const epLabel = "Episódio alvo";
  const Icon = mediaType === "movie" ? Film : Play;
  const action = "Assistir Juntos";

  // Fetch all entries to find common titles between both users
  const { data: allEntries } = useQuery({
    queryKey: ["all-entries-public"],
    queryFn: () => base44.entities.AnimeEntry.list("-created_date", 500),
    initialData: [],
    enabled: open,
  });

  // Find titles present in BOTH users' lists
  const myEntries = allEntries.filter(e => e.created_by === currentUser?.email);
  const friendEntries = allEntries.filter(e => e.created_by === friendEmail);
  const myTitles = new Set(myEntries.map(e => e.title.toLowerCase()));
  const friendTitles = new Set(friendEntries.map(e => e.title.toLowerCase()));

  const commonTitles = [...new Set([
    ...myEntries.filter(e => friendTitles.has(e.title.toLowerCase())).map(e => e.title),
    ...friendEntries.filter(e => myTitles.has(e.title.toLowerCase())).map(e => e.title),
  ])].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const filtered = search
    ? commonTitles.filter(t => t.toLowerCase().includes(search.toLowerCase()))
    : commonTitles;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
            <Icon className="w-5 h-5 text-chart-2" />
            {action} com {friendName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de mídia</label>
            <Select value={mediaType} onValueChange={v => { setMediaType(v); setMediaTitle(""); setTargetEp(""); }}>
              <SelectTrigger className="bg-secondary border-none text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anime">📺 Anime</SelectItem>
                <SelectItem value="movie">🎬 Filme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="text-xs text-muted-foreground mb-1 block">
              Título <span className="text-primary/60">(obras em comum com {friendName})</span>
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-secondary rounded-md text-sm text-left hover:bg-secondary/80 transition-colors"
            >
              <span className={mediaTitle ? "text-foreground" : "text-muted-foreground"}>
                {mediaTitle || "Selecionar obra..."}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            {dropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-secondary border-none h-7 text-xs"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 px-3">
                      {commonTitles.length === 0
                        ? `Nenhuma obra em comum com ${friendName}`
                        : "Nenhuma obra encontrada"}
                    </p>
                  ) : (
                    filtered.map(title => (
                      <button
                        key={title}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors text-foreground"
                        onClick={() => { setMediaTitle(title); setDropdownOpen(false); setSearch(""); }}
                      >
                        {title}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{epLabel}</label>
            <Input
              type="number"
              placeholder="Ex: 12"
              value={targetEp}
              onChange={e => setTargetEp(e.target.value)}
              className="bg-secondary border-none"
            />
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground border border-border">
            {friendName} receberá: <span className="text-foreground font-medium">
              "{currentUser?.full_name} quer assistir {mediaTitle || "..."} {targetEp ? `EP ${targetEp}` : ""} com você"
            </span>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            disabled={!mediaTitle.trim() || !targetEp || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate()}
          >
            <Users className="w-4 h-4" /> Enviar convite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}