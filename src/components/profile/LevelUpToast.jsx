import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { getRankForLevel } from "@/lib/xpSystem";

export default function LevelUpToast({ level, onClose }) {
  const rank = getRankForLevel(level);

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-24 lg:bottom-6 right-4 z-50 bg-card border border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 p-4 w-72"
        >
          <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-widest">Nível Acima! 🎉</p>
              <p className="font-space font-bold text-foreground">Nível {level}</p>
              <p className={`text-sm font-medium ${rank.color}`}>{rank.title}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}