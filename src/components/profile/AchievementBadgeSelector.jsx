import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ACHIEVEMENTS, getAchievementColor } from "@/lib/achievements";
import { getAchievementIcon } from "@/lib/achievementIcons";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AchievementBadgeSelector({ unlockedIds, selectedBadgeId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const unlockedSet = new Set(unlockedIds);
  const available = ACHIEVEMENTS.filter(
    (a) => unlockedSet.has(a.id) && (!search || a.label.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedAchievement = ACHIEVEMENTS.find((a) => a.id === selectedBadgeId);
  const SelectedIcon = selectedAchievement ? getAchievementIcon(selectedAchievement.icon) : null;

  const handleSelect = (id) => {
    onSelect(id === selectedBadgeId ? null : id);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      {/* Badge overlay on avatar */}
      <button
        onClick={() => setOpen(true)}
        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-card flex items-center justify-center bg-secondary hover:bg-primary/20 transition-colors z-10"
        title="Escolher ícone de conquista"
      >
        {SelectedIcon
          ? <SelectedIcon className={`w-3.5 h-3.5 ${getAchievementColor(selectedBadgeId)}`} />
          : <Plus className="w-3 h-3 text-muted-foreground" />
        }
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-space text-sm">Ícone de Conquista no Perfil</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-2">
            Escolha uma conquista desbloqueada para exibir ao lado da sua foto de perfil.
          </p>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar conquista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary border-none pl-8 h-8 text-xs"
            />
          </div>

          {available.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {unlockedIds.length === 0
                ? "Desbloqueie conquistas para escolher um ícone."
                : "Nenhuma conquista encontrada."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
              {/* None option */}
              <button
                onClick={() => handleSelect(null)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all
                  ${!selectedBadgeId ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-[9px] text-muted-foreground leading-tight">Nenhum</span>
              </button>

              {available.map((a) => {
                const IconComp = getAchievementIcon(a.icon);
                const isSelected = a.id === selectedBadgeId;
                const color = getAchievementColor(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(a.id)}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all
                      ${isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2 h-2 text-primary-foreground" />
                      </div>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? "bg-primary/15" : "bg-secondary"}`}>
                      <IconComp className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{a.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}