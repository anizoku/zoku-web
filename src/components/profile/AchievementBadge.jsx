// Displays a user's selected achievement badge (read-only, for feed/comments/profile lists)
import { ACHIEVEMENTS, getAchievementColor } from "@/lib/achievements";
import { getAchievementIcon } from "@/lib/achievementIcons";

export default function AchievementBadge({ badgeId, size = "sm" }) {
  if (!badgeId) return null;
  const achievement = ACHIEVEMENTS.find(a => a.id === badgeId);
  if (!achievement) return null;

  const IconComp = getAchievementIcon(achievement.icon);
  const color = getAchievementColor(badgeId);

  const sizes = {
    xs: "w-4 h-4",
    sm: "w-5 h-5",
    md: "w-6 h-6",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-secondary border border-border ${sizes[size] || sizes.sm}`}
      title={achievement.label}
    >
      <IconComp className={`w-2.5 h-2.5 ${color}`} />
    </span>
  );
}