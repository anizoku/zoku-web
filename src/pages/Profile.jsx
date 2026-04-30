import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tv, BookOpen, Star, Trophy, Edit2, Zap, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/feed/PostCard";
import XpProgressBar from "@/components/profile/XpProgressBar";
import AchievementsPanel from "@/components/profile/AchievementsPanel";
import RankCard from "@/components/profile/RankCard";
import LevelBadge from "@/components/profile/LevelBadge";
import LevelUpToast from "@/components/profile/LevelUpToast";
import { computeStats, computeTotalXp, getUnlockedAchievements, getXpProgress, getRankForLevel } from "@/lib/xpSystem";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [levelUpNotif, setLevelUpNotif] = useState(null);
  const prevLevelRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries } = useQuery({
    queryKey: ["profile-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 200),
    initialData: [],
  });

  const { data: posts } = useQuery({
    queryKey: ["profile-posts"],
    queryFn: () => base44.entities.Post.list("-created_date", 20),
    initialData: [],
  });

  const myEntries = entries.filter((e) => e.created_by === user?.email);
  const myPosts = posts.filter((p) => p.created_by === user?.email);

  const stats = computeStats(myEntries, myPosts);
  const totalXp = computeTotalXp(stats);
  const { level, percent } = getXpProgress(totalXp);
  const rank = getRankForLevel(level);
  const unlockedAchievements = getUnlockedAchievements(stats);

  // Detect level up
  useEffect(() => {
    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      setLevelUpNotif(level);
      setTimeout(() => setLevelUpNotif(null), 5000);
    }
    prevLevelRef.current = level;
  }, [level]);

  const statsCards = [
    { icon: Tv,      label: "Assistindo",   value: myEntries.filter((e) => e.status === "watching").length,  color: "text-primary" },
    { icon: BookOpen, label: "Lendo",       value: myEntries.filter((e) => e.status === "reading").length,   color: "text-chart-2" },
    { icon: Trophy,  label: "Concluídos",   value: myEntries.filter((e) => e.status === "completed").length, color: "text-chart-4" },
    { icon: Star,    label: "Posts",        value: myPosts.length,                                            color: "text-chart-5" },
    { icon: Tv,      label: "Eps. Vistos",  value: stats.totalEpisodes,                                      color: "text-primary" },
    { icon: BookOpen, label: "Caps. Lidos", value: stats.totalChapters,                                      color: "text-chart-2" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Banner with rank gradient */}
        <div className={`h-36 bg-gradient-to-r from-primary/30 via-chart-2/15 to-chart-3/10 relative`}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(160 84% 39% / 0.4) 0%, transparent 60%), radial-gradient(circle at 80% 20%, hsl(200 70% 50% / 0.3) 0%, transparent 50%)" }}
          />
          {/* XP bar inside banner */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className={`w-24 h-24 rounded-2xl border-4 border-card flex items-center justify-center relative shrink-0 ${rank.bg}`}>
              <span className={`font-bold text-3xl font-space ${rank.color}`}>
                {(user?.full_name || "A")[0].toUpperCase()}
              </span>
              {/* Level badge overlay */}
              <div className="absolute -bottom-2 -right-2">
                <LevelBadge level={level} size="sm" />
              </div>
            </div>

            <div className="flex-1 pt-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-space font-bold text-xl text-foreground">{user?.full_name || "Carregando..."}</h1>
                <span className={`text-sm font-semibold ${rank.color}`}>{rank.title}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{user?.email || ""}</p>
              {/* XP mini bar */}
              <div className="max-w-sm">
                <XpProgressBar totalXp={totalXp} />
              </div>
            </div>

            <Button variant="outline" size="sm" className="gap-2 border-border text-muted-foreground shrink-0">
              <Edit2 className="w-3.5 h-3.5" /> Editar Perfil
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {statsCards.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1.5`} />
            <p className="font-space font-bold text-lg text-foreground">{stat.value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="achievements">
        <TabsList className="bg-secondary">
          <TabsTrigger value="achievements" className="gap-2">
            <Trophy className="w-4 h-4" /> Conquistas
          </TabsTrigger>
          <TabsTrigger value="ranks" className="gap-2">
            <Zap className="w-4 h-4" /> Ranks
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-2">
            <Flame className="w-4 h-4" /> Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="mt-4">
          <AchievementsPanel unlockedIds={unlockedAchievements.map((a) => a.id)} />
        </TabsContent>

        <TabsContent value="ranks" className="mt-4">
          <RankCard currentLevel={level} />
        </TabsContent>

        <TabsContent value="posts" className="mt-4 space-y-4">
          {myPosts.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum post publicado ainda</p>
            </div>
          ) : (
            myPosts.map((post) => <PostCard key={post.id} post={post} userEmail={user?.email} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Level Up Toast */}
      <LevelUpToast level={levelUpNotif} onClose={() => setLevelUpNotif(null)} />
    </div>
  );
}