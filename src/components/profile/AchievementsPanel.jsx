import { Trophy, Lock } from "lucide-react";
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, getAchievementColor } from "@/lib/achievements";
import { getAchievementIcon } from "@/lib/achievementIcons";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function AchievementItem({ achievement, unlocked, unlockedAt, isOwn, selectedBadgeId, onSelectBadge }) {
  const IconComp  = getAchievementIcon(achievement.icon);
  const colorClass = unlocked ? getAchievementColor(achievement.id) : "text-muted-foreground/40";
  const isSelected = selectedBadgeId === achievement.id;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-default
        ${unlocked
          ? isSelected
            ? "bg-primary/10 border-primary/50 shadow-md"
            : "bg-card border-primary/15 hover:border-primary/35 shadow-sm"
          : "bg-card/30 border-border opacity-50"
        }
        ${unlocked && isOwn ? "cursor-pointer" : ""}
      `}
      onClick={() => { if (unlocked && isOwn && onSelectBadge) onSelectBadge(achievement.id); }}
      title={unlocked && isOwn ? "Clique para usar como badge" : undefined}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" title="Em uso" />
      )}

      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${unlocked ? "bg-primary/10" : "bg-secondary"}`}>
        {unlocked
          ? <IconComp className={`w-5 h-5 ${colorClass}`} />
          : <Lock className="w-4 h-4 text-muted-foreground/30" />
        }
      </div>

      <p className={`text-xs font-semibold leading-tight mb-1 ${unlocked ? "text-foreground" : "text-muted-foreground/60"}`}>
        {achievement.label}
      </p>

      {unlocked ? (
        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{achievement.desc}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground/40 leading-tight">???</p>
      )}

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

export default function AchievementsPanel({
  unlockedIds = [],
  unlockedDates = {},
  isOwn = false,         // true = próprio perfil (mostra todas + badge selector)
  selectedBadgeId = null,
  onSelectBadge = null,
}) {
  const unlockedSet = new Set(unlockedIds);

  // Group by category
  const byCategory = Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => {
    const all = ACHIEVEMENTS.filter(a => a.category === key);
    // On public profile, only show unlocked ones
    const visible = isOwn ? all : all.filter(a => unlockedSet.has(a.id));
    return { key, cat, visible };
  }).filter(g => g.visible.length > 0);

  const totalUnlocked = unlockedIds.length;
  const total = ACHIEVEMENTS.length;

  return (
    <div className="space-y-6">
      {/* Header counter */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-space font-semibold text-foreground">Conquistas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${Math.round((totalUnlocked / total) * 100)}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            <span className="text-primary font-bold">{totalUnlocked}</span>
            <span className="text-muted-foreground/60"> / {total}</span>
          </span>
        </div>
      </div>

      {/* Categories */}
      {byCategory.map(({ key, cat, visible }) => {
        const catUnlocked = visible.filter(a => unlockedSet.has(a.id)).length;
        return (
          <div key={key} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className={`px-4 py-3 border-b border-border flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${cat.bg.replace("/10","")}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
              </div>
              {isOwn && (
                <span className="text-[10px] text-muted-foreground">
                  {catUnlocked}/{visible.length}
                </span>
              )}
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visible.map(a => (
                <AchievementItem
                  key={a.id}
                  achievement={a}
                  unlocked={unlockedSet.has(a.id)}
                  unlockedAt={unlockedDates[a.id]}
                  isOwn={isOwn}
                  selectedBadgeId={selectedBadgeId}
                  onSelectBadge={onSelectBadge}
                />
              ))}
            </div>
          </div>
        );
      })}

      {byCategory.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Lock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma conquista desbloqueada ainda</p>
        </div>
      )}
    </div>
  );
}