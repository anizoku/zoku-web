import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Zap, ArrowUp } from "lucide-react";
import { getAchievementIcon } from "@/lib/achievementIcons";
import { getAchievementColor } from "@/lib/achievements";
import { getRankForLevel } from "@/lib/xpSystem";

// ── Toast for achievement unlock ─────────────────────────────
function AchievementToastItem({ achievement, onClose }) {
  const IconComp = getAchievementIcon(achievement.icon);
  const color = getAchievementColor(achievement.id);

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="relative w-80 bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 p-4 flex items-center gap-3"
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20`}>
        <IconComp className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Trophy className="w-3 h-3 text-yellow-400" />
          <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider">Conquista desbloqueada!</p>
        </div>
        <p className="font-space font-bold text-sm text-foreground leading-tight">{achievement.label}</p>
        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">
          +{achievement.xp} XP
        </span>
      </div>
    </motion.div>
  );
}

// ── Toast for level up ────────────────────────────────────────
function LevelUpToastItem({ level, onClose }) {
  const rank = getRankForLevel(level);

  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="relative w-80 bg-card border border-yellow-400/40 rounded-2xl shadow-2xl shadow-yellow-400/10 p-4 flex items-center gap-3"
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-yellow-400/10 border border-yellow-400/30">
        <ArrowUp className="w-6 h-6 text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Zap className="w-3 h-3 text-yellow-400" />
          <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider">Subiu de nível! 🎉</p>
        </div>
        <p className="font-space font-bold text-sm text-foreground">Nível {level}</p>
        <p className={`text-xs font-semibold ${rank.color}`}>{rank.title}</p>
      </div>
    </motion.div>
  );
}

// ── Toast Queue Manager ───────────────────────────────────────
export default function AchievementToastQueue({ queue, onDismiss }) {
  if (!queue || queue.length === 0) return null;
  const current = queue[0];

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        <div key={current.id} className="pointer-events-auto">
          {current.type === "level_up"
            ? <LevelUpToastItem level={current.level} onClose={() => onDismiss(current.id)} />
            : <AchievementToastItem achievement={current.achievement} onClose={() => onDismiss(current.id)} />
          }
        </div>
      </AnimatePresence>
    </div>
  );
}