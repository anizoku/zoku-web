// Hook that manages the achievement/level-up toast queue + founder check
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getLevelFromXp } from "@/lib/xpSystem";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useAchievementSound } from "@/hooks/useAchievementSound";

// Check if user is among first 10 registered users
export async function checkIsFounder(userEmail) {
  const allUsers = await base44.entities.User.list("created_date", 10);
  const first10 = allUsers.slice(0, 10);
  return first10.some(u => u.email === userEmail);
}

let toastIdCounter = 0;

export function useAchievementToasts({ stats, totalXp, userEmail, enabled = true }) {
  const [queue, setQueue] = useState([]);
  const prevUnlockedRef = useRef(null);
  const prevLevelRef = useRef(null);
  const { play: playAchievementSound } = useAchievementSound(userEmail);

  const dismiss = useCallback((id) => {
    setQueue(q => {
      const rest = q.filter(x => x.id !== id);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !stats || totalXp == null) return;

    const currentLevel = getLevelFromXp(totalXp);
    const currentUnlocked = ACHIEVEMENTS.filter(a => a.condition(stats)).map(a => a.id);

    // First render — establish baseline without firing toasts
    if (prevUnlockedRef.current === null) {
      prevUnlockedRef.current = new Set(currentUnlocked);
      prevLevelRef.current = currentLevel;
      return;
    }

    const newItems = [];

    // Check level up first (higher priority)
    if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current) {
      newItems.push({
        id: `level_${++toastIdCounter}`,
        type: "level_up",
        level: currentLevel,
      });
    }
    prevLevelRef.current = currentLevel;

    // Check new achievements
    const newIds = currentUnlocked.filter(id => !prevUnlockedRef.current.has(id));
    for (const id of newIds) {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
        newItems.push({
          id: `ach_${++toastIdCounter}`,
          type: "achievement",
          achievement,
        });
        // Fire achievement notification + persist unlock record (with real timestamp)
        if (userEmail) {
          base44.entities.Notification.create({
            recipient_email: userEmail,
            type: "list_update",
            message: `Você desbloqueou a conquista "${achievement.label}" (+${achievement.xp} XP)`,
            from_name: "ZOKU",
            reference_id: "achievements",
            is_read: false,
          }).catch(() => {});
          base44.entities.UserAchievement.create({
            user_email: userEmail,
            achievement_key: id,
            unlocked_at: new Date().toISOString(),
          }).catch(() => {});
        }
      }
    }
    prevUnlockedRef.current = new Set(currentUnlocked);

    if (newItems.length > 0) {
      // Toca o som apenas uma vez por batch de desbloqueios (evita sobreposição)
      const hasNewAchievement = newItems.some(i => i.type === "achievement");
      if (hasNewAchievement) playAchievementSound();
      setQueue(q => [...newItems, ...q]);
    }
  }, [stats, totalXp, enabled, userEmail]);

  return { queue, dismiss };
}