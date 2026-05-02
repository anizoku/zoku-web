import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tv, BookOpen, Star, Trophy, Zap, Flame, Twitter, Instagram, Globe, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PostCard from "@/components/feed/PostCard";
import XpProgressBar from "@/components/profile/XpProgressBar";
import AchievementsPanel from "@/components/profile/AchievementsPanel";
import RankCard from "@/components/profile/RankCard";
import LevelBadge from "@/components/profile/LevelBadge";
import LevelUpToast from "@/components/profile/LevelUpToast";
import EditProfileDialog from "@/components/profile/EditProfileDialog";
import FriendsSection from "@/components/profile/FriendsSection";
import ActivityFeedSection from "@/components/profile/ActivityFeedSection";
import { computeStats, computeTotalXp, getUnlockedAchievements, getXpProgress, getRankForLevel } from "@/lib/xpSystem";
import { getMyFriends } from "@/lib/social";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels = { watching: "Assistindo", reading: "Lendo", completed: "Concluído", planned: "Planejado", dropped: "Dropado", on_hold: "Pausado" };
const statusColors = {
  watching: "bg-primary/15 text-primary", reading: "bg-chart-2/15 text-chart-2",
  completed: "bg-chart-4/15 text-chart-4", planned: "bg-secondary text-secondary-foreground",
  dropped: "bg-destructive/15 text-destructive", on_hold: "bg-chart-3/15 text-chart-3"
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [levelUpNotif, setLevelUpNotif] = useState(null);
  const prevLevelRef = useRef(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: entries } = useQuery({ queryKey: ["profile-entries"], queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 200), initialData: [] });
  const { data: posts } = useQuery({ queryKey: ["profile-posts"], queryFn: () => base44.entities.Post.list("-created_date", 20), initialData: [] });
  const { data: profiles } = useQuery({ queryKey: ["user-profiles"], queryFn: () => base44.entities.UserProfile.list("-created_date", 100), initialData: [] });
  const { data: friendships } = useQuery({ queryKey: ["friendships"], queryFn: () => base44.entities.Friendship.list("-created_date", 200), initialData: [] });
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.SocialEvent.list("-event_date", 20), initialData: [] });

  const myEntries = entries.filter((e) => e.created_by === user?.email);
  const myPosts = posts.filter((p) => p.created_by === user?.email);
  const myProfile = profiles.find(p => p.user_email === user?.email);
  const myFriends = user ? getMyFriends(friendships, user.email) : [];
  const myEvents = events.filter(e => e.organizer_email === user?.email || e.participants?.includes(user?.email));

  const stats = computeStats(myEntries, myPosts);
  const totalXp = computeTotalXp(stats);
  const { level, percent } = getXpProgress(totalXp);
  const rank = getRankForLevel(level);
  const unlockedAchievements = getUnlockedAchievements(stats);

  useEffect(() => {
    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      setLevelUpNotif(level);
      setTimeout(() => setLevelUpNotif(null), 5000);
    }
    prevLevelRef.current = level;
  }, [level]);

  const statsCards = [
    { icon: Tv, label: "Assistindo", value: myEntries.filter(e => e.status === "watching").length, color: "text-primary" },
    { icon: BookOpen, label: "Lendo", value: myEntries.filter(e => e.status === "reading").length, color: "text-chart-2" },
    { icon: Trophy, label: "Concluídos", value: myEntries.filter(e => e.status === "completed").length, color: "text-chart-4" },
    { icon: Star, label: "Posts", value: myPosts.length, color: "text-chart-5" },
    { icon: Tv, label: "Eps. Vistos", value: stats.totalEpisodes, color: "text-primary" },
    { icon: BookOpen, label: "Caps. Lidos", value: stats.totalChapters, color: "text-chart-2" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Banner */}
        <div className="h-36 relative overflow-hidden">
          {myProfile?.banner_url ? (
            <img src={myProfile.banner_url} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/30 via-chart-2/15 to-chart-3/10" />
          )}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar circular */}
            <div className="w-24 h-24 rounded-full border-4 border-card flex items-center justify-center relative shrink-0 overflow-hidden bg-secondary">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className={`font-bold text-3xl font-space ${rank.color}`}>
                  {(user?.full_name || "A")[0].toUpperCase()}
                </span>
              )}
              <div className="absolute -bottom-1 -right-1">
                <LevelBadge level={level} size="sm" />
              </div>
            </div>

            <div className="flex-1 pt-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className="font-space font-bold text-xl text-foreground">{user?.full_name || "Carregando..."}</h1>
                <span className={`text-sm font-semibold ${rank.color}`}>{rank.title}</span>
              </div>
              {myProfile?.username && (
                <p className="text-sm text-primary/80 font-medium mb-0.5">@{myProfile.username}</p>
              )}
              <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              {myProfile?.bio && (
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{myProfile.bio}</p>
              )}

              {/* Social links */}
              {myProfile?.links && Object.values(myProfile.links).some(Boolean) && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {myProfile.links.twitter && (
                    <a href={`https://x.com/${myProfile.links.twitter.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                      <Twitter className="w-3 h-3" /> {myProfile.links.twitter}
                    </a>
                  )}
                  {myProfile.links.instagram && (
                    <a href={`https://instagram.com/${myProfile.links.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                      <Instagram className="w-3 h-3" /> {myProfile.links.instagram}
                    </a>
                  )}
                  {myProfile.links.website && (
                    <a href={myProfile.links.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                      <Globe className="w-3 h-3" /> Site
                    </a>
                  )}
                </div>
              )}

              <div className="max-w-sm mt-3">
                <XpProgressBar totalXp={totalXp} />
              </div>
            </div>

            <EditProfileDialog user={user} />
          </div>

          {/* Favorites */}
          {(myProfile?.favorite_animes?.length > 0 || myProfile?.favorite_mangas?.length > 0) && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {myProfile.favorite_animes?.length > 0 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Tv className="w-3 h-3" /> Animes fav.:
                  </span>
                  {myProfile.favorite_animes.map(a => (
                    <Badge key={a} variant="outline" className="text-[10px] border-chart-2/20 text-chart-2 px-1.5 py-0">{a}</Badge>
                  ))}
                </div>
              )}
              {myProfile.favorite_mangas?.length > 0 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <BookOpen className="w-3 h-3" /> Mangás fav.:
                  </span>
                  {myProfile.favorite_mangas.map(m => (
                    <Badge key={m} variant="outline" className="text-[10px] border-chart-3/20 text-chart-3 px-1.5 py-0">{m}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
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
      <Tabs defaultValue="friends">
        <TabsList className="bg-secondary flex-wrap h-auto gap-1">
          <TabsTrigger value="friends"><Users className="w-3.5 h-3.5 mr-1" />Amigos ({myFriends.length})</TabsTrigger>
          <TabsTrigger value="activity"><Flame className="w-3.5 h-3.5 mr-1" />Atividades</TabsTrigger>
          <TabsTrigger value="list"><Tv className="w-3.5 h-3.5 mr-1" />Minha Lista</TabsTrigger>
          <TabsTrigger value="events"><Calendar className="w-3.5 h-3.5 mr-1" />Eventos</TabsTrigger>
          <TabsTrigger value="achievements"><Trophy className="w-3.5 h-3.5 mr-1" />Conquistas</TabsTrigger>
          <TabsTrigger value="ranks"><Zap className="w-3.5 h-3.5 mr-1" />Ranks</TabsTrigger>
          <TabsTrigger value="posts"><Star className="w-3.5 h-3.5 mr-1" />Posts</TabsTrigger>
        </TabsList>

        {/* Friends */}
        <TabsContent value="friends" className="mt-4">
          <FriendsSection currentUser={user} />
        </TabsContent>

        {/* Activity Feed */}
        <TabsContent value="activity" className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Atividades com amigos</h2>
          </div>
          <ActivityFeedSection userEmail={user?.email} friends={myFriends} />
        </TabsContent>

        {/* List */}
        <TabsContent value="list" className="mt-4">
          {myEntries.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum item na lista ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(statusLabels).map(([status, label]) => {
                const items = myEntries.filter(e => e.status === status);
                if (items.length === 0) return null;
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs border-none ${statusColors[status]}`}>{label}</Badge>
                      <span className="text-xs text-muted-foreground">{items.length} título{items.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map(entry => {
                        const isAnime = entry.type === "anime";
                        const current = isAnime ? entry.current_episode || 0 : entry.current_chapter || 0;
                        const total = isAnime ? entry.total_episodes || 0 : entry.total_chapters || 0;
                        return (
                          <div key={entry.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAnime ? "bg-chart-2/10" : "bg-chart-3/10"}`}>
                              {isAnime ? <Tv className="w-4 h-4 text-chart-2" /> : <BookOpen className="w-4 h-4 text-chart-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{entry.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {isAnime ? `Ep. ${current}` : `Cap. ${current}`}{total > 0 ? ` / ${total}` : ""}
                              </p>
                            </div>
                            {entry.rating > 0 && (
                              <div className="flex items-center gap-0.5 text-xs text-chart-4 shrink-0">
                                <Star className="w-3 h-3 fill-chart-4" />{entry.rating}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Events */}
        <TabsContent value="events" className="mt-4">
          {myEvents.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum evento ainda</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {myEvents.map(event => (
                <div key={event.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-chart-5/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-chart-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{event.title}</p>
                    {event.media_title && <p className="text-xs text-primary/70">📺 {event.media_title}</p>}
                    {event.event_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(event.event_date), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge className={`text-[10px] border-none ${event.organizer_email === user?.email ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {event.organizer_email === user?.email ? "Organizador" : "Participante"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{event.participants?.length || 0} participantes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <AchievementsPanel unlockedIds={unlockedAchievements.map(a => a.id)} />
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
            myPosts.map(post => <PostCard key={post.id} post={post} userEmail={user?.email} />)
          )}
        </TabsContent>
      </Tabs>

      <LevelUpToast level={levelUpNotif} onClose={() => setLevelUpNotif(null)} />
    </div>
  );
}