import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export default function AchievementCard({ achievement, unlocked, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-all
        ${unlocked
          ? "bg-card border-primary/25 hover:border-primary/50 shadow-sm shadow-primary/5"
          : "bg-card/50 border-border opacity-50 grayscale"
        }`}
    >
      {/* Glow behind emoji when unlocked */}
      {unlocked && (
        <div className="absolute inset-0 rounded-xl bg-primary/3 pointer-events-none" />
      )}

      <div className={`text-3xl mb-2 ${unlocked ? "" : "opacity-40"}`}>
        {unlocked ? achievement.emoji : <Lock className="w-6 h-6 text-muted-foreground" />}
      </div>

      <p className={`text-xs font-semibold leading-tight mb-1 ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
        {achievement.label}
      </p>
      <p className="text-[10px] text-muted-foreground leading-tight">
        {achievement.desc}
      </p>

      {unlocked && (
        <div className="mt-2 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
          +{achievement.xp} XP
        </div>
      )}
    </motion.div>
  );
}