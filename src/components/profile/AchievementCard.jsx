import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { getAchievementIcon } from "@/lib/achievementIcons";
import { getAchievementColor } from "@/lib/achievements";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AchievementCard({ achievement, unlocked, index, unlockedAt }) {
  const IconComponent = getAchievementIcon(achievement.icon);
  const colorClass = unlocked ? getAchievementColor(achievement.id) : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.25 }}
      className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all
        ${unlocked
          ? "bg-card border-primary/20 hover:border-primary/50 shadow-sm"
          : "bg-card/40 border-border opacity-50"
        }`}
    >
      {unlocked && <div className="absolute inset-0 rounded-xl bg-primary/3 pointer-events-none" />}

      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${unlocked ? "bg-primary/10" : "bg-secondary"}`}>
        {unlocked
          ? <IconComponent className={`w-5 h-5 ${colorClass}`} />
          : <Lock className="w-4 h-4 text-muted-foreground/50" />
        }
      </div>

      <p className={`text-xs font-semibold leading-tight mb-1 ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
        {achievement.label}
      </p>
      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
        {achievement.desc}
      </p>

      {unlocked && (
        <div className="mt-2 flex flex-col items-center gap-0.5">
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
            +{achievement.xp} XP
          </span>
          {unlockedAt && (
            <span className="text-[9px] text-muted-foreground/60">
              {format(new Date(unlockedAt), "dd/MM/yy", { locale: ptBR })}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}