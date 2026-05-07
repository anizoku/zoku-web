import { Trophy, Search } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import AchievementCard from "./AchievementCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function AchievementsPanel({ unlockedIds, unlockedDates = {} }) {
  const [search, setSearch] = useState("");
  const unlockedSet = new Set(unlockedIds);

  const filtered = ACHIEVEMENTS.filter((a) =>
    !search || a.label.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase())
  );
  const unlocked = filtered.filter((a) => unlockedSet.has(a.id));
  const locked = filtered.filter((a) => !unlockedSet.has(a.id));

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="font-space font-semibold text-base text-foreground">Conquistas</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">{unlockedIds.length}</span> / {ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar conquista..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-secondary border-none pl-8 h-8 text-xs"
        />
      </div>

      {unlocked.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
            ✅ Desbloqueadas ({unlocked.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlocked.map((a, i) => (
              <AchievementCard
                key={a.id}
                achievement={a}
                unlocked={true}
                index={i}
                unlockedAt={unlockedDates[a.id]}
              />
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
            🔒 Bloqueadas ({locked.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {locked.map((a, i) => (
              <AchievementCard key={a.id} achievement={a} unlocked={false} index={i} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conquista encontrada</p>
      )}
    </div>
  );
}