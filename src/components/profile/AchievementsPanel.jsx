import { Trophy } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/xpSystem";
import AchievementCard from "./AchievementCard";

export default function AchievementsPanel({ unlockedIds }) {
  const unlockedSet = new Set(unlockedIds);
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id));
  const locked = ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id));

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="font-space font-semibold text-base text-foreground">Conquistas</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">{unlocked.length}</span> / {ACHIEVEMENTS.length}
        </span>
      </div>

      {unlocked.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">✅ Desbloqueadas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlocked.map((a, i) => (
              <AchievementCard key={a.id} achievement={a} unlocked={true} index={i} />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">🔒 Bloqueadas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {locked.map((a, i) => (
            <AchievementCard key={a.id} achievement={a} unlocked={false} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}