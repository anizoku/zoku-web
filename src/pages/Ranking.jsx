import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Trophy, Medal, Crown, Zap, BookOpen, Tv } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { computeStats, computeTotalXp, getXpProgress, getRankForLevel, getLevelFromXp } from "@/lib/xpSystem";
import AchievementBadge from "@/components/profile/AchievementBadge";
import LevelBadge from "@/components/profile/LevelBadge";

function getMedalStyle(pos) {
  if (pos === 1) return { border: "border-yellow-400", bg: "bg-yellow-400/10", text: "text-yellow-400", icon: Crown };
  if (pos === 2) return { border: "border-slate-400", bg: "bg-slate-400/10", text: "text-slate-400", icon: Medal };
  if (pos === 3) return { border: "border-orange-400", bg: "bg-orange-400/10", text: "text-orange-400", icon: Trophy };
  return { border: "border-border", bg: "bg-card", text: "text-muted-foreground", icon: null };
}

function RankRow({ position, entry, isCurrentUser }) {
  const navigate = useNavigate();
  const medal = getMedalStyle(position);
  const MedalIcon = medal.icon;
  const rank = getRankForLevel(entry.level);
  const isTop3 = position <= 3;

  return (
    <button
      onClick={() => navigate(`/u/${entry.email}`)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:border-primary/40 hover:shadow-sm text-left
        ${isCurrentUser ? "border-primary/50 bg-primary/5 shadow-sm" : `${medal.border} ${medal.bg}`}
        ${isTop3 && !isCurrentUser ? "shadow-md" : ""}
      `}
    >
      {/* Position */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-space font-bold text-sm ${isTop3 ? medal.text : "text-muted-foreground"}`}>
        {MedalIcon && !isCurrentUser ? <MedalIcon className="w-5 h-5" /> : <span>#{position}</span>}
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden ${isTop3 ? medal.border : "border-border"}`}>
          {entry.avatar_url
            ? <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
            : <span className="font-bold text-sm font-space text-primary">{(entry.name || "?")[0].toUpperCase()}</span>
          }
        </div>
        {entry.selected_badge_id && (
          <div className="absolute -bottom-1 -right-1">
            <AchievementBadge badgeId={entry.selected_badge_id} size="xs" />
          </div>
        )}
      </div>

      {/* Name / rank */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold text-sm truncate ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
            {entry.username ? `@${entry.username}` : entry.name || entry.email}
          </p>
          {isCurrentUser && (
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">Você</span>
          )}
        </div>
        <p className={`text-xs font-medium ${rank.color}`}>
          Nível {entry.level} — {rank.title}
        </p>
      </div>

      {/* XP + completed */}
      <div className="text-right shrink-0">
        <p className={`font-space font-bold text-sm ${isTop3 ? medal.text : "text-foreground"}`}>
          {entry.xp.toLocaleString()} XP
        </p>
        <p className="text-[10px] text-muted-foreground">{entry.completed} obras concluídas</p>
      </div>
    </button>
  );
}

export default function Ranking() {
  usePageTitle("Ranking");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: allUsers = [] }  = useQuery({ queryKey: ["all-users"],     queryFn: () => base44.entities.User.list("-created_date", 200)            });
  const { data: profiles = [] }  = useQuery({ queryKey: ["all-profiles"],  queryFn: () => base44.entities.UserProfile.list("-created_date", 200)      });
  const { data: entries = [] }   = useQuery({ queryKey: ["all-entries"],   queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 1000)       });
  const { data: posts = [] }     = useQuery({ queryKey: ["all-posts"],     queryFn: () => base44.entities.Post.list("-created_date", 500)              });
  const { data: xpEvents = [] }  = useQuery({ queryKey: ["xp-events"],     queryFn: () => base44.entities.XpEvent.list("-event_date", 2000)           , initialData: [] });

  // Build per-user ranking data
  const rankingData = allUsers.map(u => {
    const profile  = profiles.find(p => p.user_email === u.email);
    const myEntries = entries.filter(e => e.created_by === u.email);
    const myPosts   = posts.filter(p => p.created_by === u.email);
    const stats    = computeStats(myEntries, myPosts, [], [], profile);
    const xp       = computeTotalXp(stats);
    const level    = getLevelFromXp(xp);
    const completed = stats.completedTitles;

    // Period XP from xpEvents
    const now = new Date();
    const weekAgo  = new Date(now - 7 * 86400000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    const userEvents = xpEvents.filter(ev => ev.user_email === u.email);
    const weeklyXp  = userEvents.filter(ev => new Date(ev.event_date) >= weekAgo ).reduce((s, ev) => s + (ev.xp_amount || 0), 0);
    const monthlyXp = userEvents.filter(ev => new Date(ev.event_date) >= monthAgo).reduce((s, ev) => s + (ev.xp_amount || 0), 0);

    return {
      email: u.email,
      name:  u.full_name || u.email,
      username: profile?.username || null,
      avatar_url: profile?.avatar_url || null,
      selected_badge_id: profile?.selected_badge_id || null,
      xp, level, completed, weeklyXp, monthlyXp,
    };
  });

  function buildRanking(tab) {
    const sorted = [...rankingData].sort((a, b) => {
      if (tab === "weekly")  return b.weeklyXp  - a.weeklyXp;
      if (tab === "monthly") return b.monthlyXp - a.monthlyXp;
      return b.xp - a.xp;
    });
    return sorted;
  }

  function RankingList({ tab }) {
    const sorted = buildRanking(tab);
    const top50  = sorted.slice(0, 50);
    const currentUserIdx = sorted.findIndex(e => e.email === currentUser?.email);
    const currentUserEntry = sorted[currentUserIdx];
    const currentUserPos  = currentUserIdx + 1;
    const isInTop50 = currentUserIdx >= 0 && currentUserIdx < 50;

    const getXpForTab = (entry) => {
      if (tab === "weekly")  return entry.weeklyXp;
      if (tab === "monthly") return entry.monthlyXp;
      return entry.xp;
    };

    return (
      <div className="space-y-2">
        {top50.map((entry, i) => (
          <RankRow
            key={entry.email}
            position={i + 1}
            entry={{ ...entry, xp: getXpForTab(entry) }}
            isCurrentUser={entry.email === currentUser?.email}
          />
        ))}

        {!isInTop50 && currentUserEntry && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">Sua posição</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <RankRow
              position={currentUserPos}
              entry={{ ...currentUserEntry, xp: getXpForTab(currentUserEntry) }}
              isCurrentUser={true}
            />
          </>
        )}

        {top50.length === 0 && (
          <div className="py-12 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="font-space font-bold text-xl text-foreground">Ranking Global</h1>
          <p className="text-xs text-muted-foreground">Top usuários do ZOKU</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {(() => {
        const top3 = buildRanking("general").slice(0, 3);
        if (top3.length === 0) return null;
        // Order: 2nd (left), 1st (center), 3rd (right)
        const podiumOrder = [top3[1], top3[0], top3[2]];
        const podiumPos   = [2, 1, 3];
        const podiumStyles = {
          1: { border: "border-[#FFD700]", bg: "bg-[#FFD700]/10", text: "text-[#FFD700]", avatarSize: "w-20 h-20", cardPad: "pb-6 pt-4", nameSize: "text-sm", xpSize: "text-sm" },
          2: { border: "border-[#C0C0C0]", bg: "bg-[#C0C0C0]/10", text: "text-[#C0C0C0]", avatarSize: "w-16 h-16", cardPad: "pb-4 pt-3", nameSize: "text-xs", xpSize: "text-xs" },
          3: { border: "border-[#CD7F32]", bg: "bg-[#CD7F32]/10", text: "text-[#CD7F32]", avatarSize: "w-14 h-14", cardPad: "pb-3 pt-3", nameSize: "text-xs", xpSize: "text-xs" },
        };
        return (
          <div className="hidden sm:flex items-end justify-center gap-2">
            {podiumOrder.map((entry, vi) => {
              if (!entry) return <div key={vi} className="flex-1 max-w-[140px]" />;
              const pos = podiumPos[vi];
              const s   = podiumStyles[pos];
              const rank = getRankForLevel(entry.level);
              return (
                <button
                  key={entry.email}
                  onClick={() => window.location.href = `/u/${entry.email}`}
                  className={`flex-1 max-w-[160px] flex flex-col items-center ${s.cardPad} px-2 rounded-xl border-2 ${s.border} ${s.bg} transition-all hover:opacity-90`}
                >
                  {/* Medal / Crown above avatar */}
                  <div className="mb-1.5">
                    {pos === 1 && (
                      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#FFD700]" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L9 8L2 9.5L7 14.5L5.5 22L12 18.5L18.5 22L17 14.5L22 9.5L15 8Z" />
                      </svg>
                    )}
                    {pos === 2 && <Medal className="w-5 h-5 text-[#C0C0C0]" />}
                    {pos === 3 && <Trophy className="w-5 h-5 text-[#CD7F32]" />}
                  </div>
                  <div className={`${s.avatarSize} rounded-full border-2 ${s.border} flex items-center justify-center overflow-hidden mb-2 shrink-0`}>
                    {entry.avatar_url
                      ? <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                      : <span className={`font-bold font-space ${s.text} ${pos === 1 ? "text-2xl" : "text-xl"}`}>{(entry.name || "?")[0].toUpperCase()}</span>
                    }
                  </div>
                  <p className={`font-bold ${s.nameSize} text-foreground truncate w-full text-center`}>
                    {entry.username ? `@${entry.username}` : entry.name?.split(" ")[0]}
                  </p>
                  <p className={`text-[10px] font-medium ${rank.color} mt-0.5`}>Lv.{entry.level}</p>
                  <p className={`font-space font-bold mt-1 ${s.xpSize} ${s.text}`}>{entry.xp.toLocaleString()} XP</p>
                  <div className={`font-bold text-[10px] mt-1 ${s.text}`}>#{pos}</div>
                </button>
              );
            })}
          </div>
        );
      })()}
      {/* Mobile top 3 — vertical */}
      {(() => {
        const top3 = buildRanking("general").slice(0, 3);
        if (top3.length === 0) return null;
        return (
          <div className="flex sm:hidden flex-col gap-2">
            {top3.map((entry, i) => (
              <RankRow key={entry.email} position={i + 1} entry={entry} isCurrentUser={entry.email === currentUser?.email} />
            ))}
          </div>
        );
      })()}

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList className="bg-secondary w-full">
          <TabsTrigger value="general"  className="flex-1"><Trophy className="w-3.5 h-3.5 mr-1.5" />Geral</TabsTrigger>
          <TabsTrigger value="monthly"  className="flex-1"><Zap    className="w-3.5 h-3.5 mr-1.5" />Mensal</TabsTrigger>
          <TabsTrigger value="weekly"   className="flex-1"><Tv     className="w-3.5 h-3.5 mr-1.5" />Semanal</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4"><RankingList tab="general"  /></TabsContent>
        <TabsContent value="monthly" className="mt-4"><RankingList tab="monthly"  /></TabsContent>
        <TabsContent value="weekly"  className="mt-4"><RankingList tab="weekly"   /></TabsContent>
      </Tabs>
    </div>
  );
}