import { getRankForLevel } from "@/lib/xpSystem";
import { Zap } from "lucide-react";

export default function LevelBadge({ level, size = "md" }) {
  const rank = getRankForLevel(level);

  const sizes = {
    sm: { outer: "px-2 py-0.5 text-[10px] gap-1", icon: "w-2.5 h-2.5" },
    md: { outer: "px-2.5 py-1 text-xs gap-1.5", icon: "w-3 h-3" },
    lg: { outer: "px-3 py-1.5 text-sm gap-2", icon: "w-4 h-4" },
  };
  const s = sizes[size];

  return (
    <span className={`inline-flex items-center rounded-full border font-bold font-space ${rank.bg} ${rank.color} ${rank.border} ${s.outer}`}>
      <Zap className={s.icon} />
      Lv.{level}
    </span>
  );
}