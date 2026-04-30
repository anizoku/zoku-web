import { getXpProgress, getRankForLevel } from "@/lib/xpSystem";
import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function XpProgressBar({ totalXp }) {
  const { level, currentLevelXp, nextLevelXp, percent } = getXpProgress(totalXp);
  const rank = getRankForLevel(level);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold font-space ${rank.bg} ${rank.color} ${rank.border}`}>
            <Zap className="w-3 h-3" />
            Nível {level}
          </div>
          <span className={`text-sm font-semibold ${rank.color}`}>{rank.title}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            <span className={`font-bold ${rank.color}`}>{currentLevelXp.toLocaleString()}</span>
            {" / "}{nextLevelXp.toLocaleString()} XP
          </span>
        </div>
      </div>

      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`absolute inset-y-0 left-0 rounded-full ${rank.color.replace("text-", "bg-").replace("text-muted-foreground", "bg-muted-foreground")}`}
          style={{ background: "hsl(var(--primary))" }}
        />
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{totalXp.toLocaleString()} XP total</span>
        <span>{percent}% para nível {level + 1}</span>
      </div>
    </div>
  );
}