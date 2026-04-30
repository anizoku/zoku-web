import { RANKS } from "@/lib/xpSystem";
import { Zap, Lock } from "lucide-react";

export default function RankCard({ currentLevel }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="font-space font-semibold text-base text-foreground">Títulos & Ranks</h2>
      </div>
      <div className="space-y-2">
        {RANKS.map((rank) => {
          const unlocked = currentLevel >= rank.minLevel;
          return (
            <div
              key={rank.minLevel}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all
                ${unlocked ? `${rank.bg} ${rank.border}` : "bg-secondary/30 border-border opacity-50"}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${unlocked ? rank.bg : "bg-muted/50"}`}>
                {unlocked
                  ? <Zap className={`w-3.5 h-3.5 ${rank.color}`} />
                  : <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${unlocked ? rank.color : "text-muted-foreground"}`}>
                  {rank.title}
                </p>
                <p className="text-[10px] text-muted-foreground">A partir do nível {rank.minLevel}</p>
              </div>
              {unlocked && currentLevel >= rank.minLevel && (
                <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                  {currentLevel === rank.minLevel || RANKS.find(r => r.minLevel > rank.minLevel)?.minLevel > currentLevel ? "ATUAL" : "✓"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}