import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tv, BookOpen, Star, Trophy, Zap, Flame, Twitter, Instagram, Globe, Calendar, Users, Lightbulb } from "lucide-react";
import WorkLink from "@/components/media/WorkLink";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PostCard from "@/components/feed/PostCard";
import XpProgressBar from "@/components/profile/XpProgressBar";
import AchievementsPanel from "@/components/profile/AchievementsPanel";
import RankCard from "@/components/profile/RankCard";
import LevelBadge from "@/components/profile/LevelBadge";
import AchievementToastQueue from "@/components/profile/AchievementToast";
import { useAchievementToasts } from "@/hooks/useAchievementToasts";
import EditProfileDialog from "@/components/profile/EditProfileDialog";
import AchievementBadgeSelector from "@/components/profile/AchievementBadgeSelector";
import FriendManagement from "@/components/profile/FriendManagement";
import ActivityFeedSection from "@/components/profile/ActivityFeedSection";
import { computeStats, computeTotalXp, getUnlockedAchievements, getXpProgress, getRankForLevel, getLevelFromXp } from "@/lib/xpSystem";
import { getAchievementIcon } from "@/lib/achievementIcons";
import { getAchievementColor, ACHIEVEMENTS } from "@/lib/achievements";
import { getMyFriends } from "@/lib/social";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MySuggestions from "@/components/profile/MySuggestions";

const statusLabels = { watching: "Assistindo", reading: "Lendo", completed: "Concluído", planned: "Planejado", dropped: "Dropado", on_hold: "Pausado" };
const statusColors = {
  watching: "bg-primary/15 text-primary", reading: "bg-chart-2/15 text-chart-2",
  completed: "bg-chart-4/15 text-chart-4", planned: "bg-secondary text-secondary-foreground",
  dropped: "bg-destructive/15 text-destructive", on_hold: "bg-chart-3/15 text-chart-3"
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

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

  // Compute communities stats
  const { data: allCommunities = [] } = useQuery({ queryKey: ["all-communities-profile"], queryFn: () => base44.entities.Community.list("-created_date", 200), initialData: [] });
  const joinedCommunities = allCommunities.filter(c => c.members?.includes(user?.email));
  const createdCommunities = allCommunities.filter(c => c.creator_email === user?.email);
  const maxMembersInMyCommunity = createdCommunities.reduce((m, c) => Math.max(m, c.members_count || c.members?.length || 0), 0);

  // XP for current level (needed for level achievements)
  const tempStats0 = computeStats(myEntries, myPosts, friendships, myEvents, myProfile);
  const tempXp0 = computeTotalXp(tempStats0);
  const currentLevel0 = getLevelFromXp(tempXp0);

  const stats = computeStats(myEntries, myPosts, friendships, myEvents, myProfile, {
    communitiesJoined: joinedCommunities.length,
    communitiesCreated: createdCommunities.length,
    communityMaxMembers: maxMembersInMyCommunity,
    currentLevel: currentLevel0,
  });
  const totalXp = computeTotalXp(stats);
  const { level, percent } = getXpProgress(totalXp);
  const rank = getRankForLevel(level);
  const unlockedAchievements = getUnlockedAchievements(stats);
  const unlockedIds = unlockedAchievements.map(a => a.id);

  const { queue: toastQueue, dismiss: dismissToast } = useAchievementToasts({
    stats, totalXp, userEmail: user?.email, enabled: !!user,
  });

  // Save selected badge
  const saveBadgeMutation = useMutation({
    mutationFn: (badgeId) => {
      if (!myProfile) return Promise.resolve();
      return base44.entities.UserProfile.update(myProfile.id, { selected_badge_id: badgeId || "" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-profiles"] }),
  });

  const selectedBadgeId = myProfile?.selected_badge_id || null;
  const selectedAchievement = ACHIEVEMENTS.find(a => a.id === selectedBadgeId);
  const BadgeIcon = selectedAchievement ? getAchievementIcon(selectedAchievement.icon) : null;

  const statsCards = [
    { icon: Tv, label: "Assistindo", value: myEntries.filter(e => e.status === "watching").length, color: "text-primary" },
    { icon: BookOpen, label: "Lendo", value: myEntries.filter(e => e.status === "reading").length, color: "text-chart-2" },
    { icon: Trophy, label: "Concluídos", value: myEntries.filter(e => e.status === "completed").length, color: "text-chart-4" },
    { icon: Star, label: "Posts", value: myPosts.length, color: "text-chart-5" },
    { icon: Tv, label: "Eps. Vistos", value: stats.totalEpisodes, color: "text-primary" },
    { icon: BookOpen, label: "Caps. Lidos", value: stats.totalChapters, color: "text-chart-2" },
  ];

  const avatarCrop = myProfile?.avatar_crop;
  const bannerCrop = myProfile?.banner_crop;

  const avatarStyle = avatarCrop ? {
    transform: `translate(${avatarCrop.offsetX || 0}px, ${avatarCrop.offsetY || 0}px) scale(${avatarCrop.scale || 1})`,
    transformOrigin: "center center",
  } : {};

  const bannerStyle = bannerCrop ? {
    transform: `translate(${bannerCrop.offsetX || 0}px, ${bannerCrop.offsetY || 0}px) scale(${bannerCrop.scale || 1})`,
    transformOrigin: "center center",
    width: "100%", height: "100%", position: "absolute",
  } : {};

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Banner */}
        <div className="h-36 relative overflow-hidden">
          {myProfile?.banner_url ? (
            <img src={myProfile.banner_url} alt="banner" style={bannerStyle.transform ? bannerStyle : {}} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/30 via-chart-2/15 to-chart-3/10" />
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full border-4 border-card flex items-center justify-center relative overflow-hidden bg-secondary">
                {myProfile?.avatar_url ? (
                  <img src={myProfile.avatar_url} alt="avatar"
                    className="w-full h-full object-cover"
                    style={avatarStyle.transform ? avatarStyle : {}}
                  />
                ) : (
                  <span className={`font-bold text-3xl font-space ${rank.color}`}>
                    {(user?.full_name || "A")[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Level badge bottom-left */}
              <div className="absolute -bottom-1 -left-1">
                <LevelBadge level={level} size="sm" />
              </div>

              {/* Achievement badge selector bottom-right */}
              <AchievementBadgeSelector
                unlockedIds={unlockedIds}
                selectedBadgeId={selectedBadgeId}
                onSelect={(id) => saveBadgeMutation.mutate(id)}
              />
            </div>

            {/* Name / rank / XP info */}
            <div className="flex-1 pt-2 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-0.5">
                <h1 className="font-space font-bold text-xl text-foreground leading-tight">
                  {user?.full_name || "Carregando..."}
                </h1>
                <span className={`text-sm font-semibold ${rank.color}`}>{rank.title}</span>
              </div>

              {myProfile?.username && (
                <p className="text-sm text-muted-foreground font-medium mb-1">
                  <span className="text-primary/70">@</span>{myProfile.username}
                </p>
              )}

              {myProfile?.bio && (
                <p className="text-sm text-foreground/70 mt-1 leading-relaxed">{myProfile.bio}</p>
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
            </div>

            <EditProfileDialog user={user} />
          </div>

          {/* XP Bar — single, clean */}
          <div className="mt-5 pt-4 border-t border-border">
            <XpProgressBar totalXp={totalXp} />
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
          <TabsTrigger value="suggestions"><Lightbulb className="w-3.5 h-3.5 mr-1" />Sugestões</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          <FriendManagement currentUser={user} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Atividades com amigos</h2>
          </div>
          <ActivityFeedSection userEmail={user?.email} friends={myFriends} />
        </TabsContent>

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
                              <WorkLink title={entry.title} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block" />
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
                    {event.media_title && <WorkLink title={event.media_title} className="text-xs text-primary/70 hover:text-primary" prefix="📺 " />}
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
          <AchievementsPanel
            unlockedIds={unlockedIds}
            unlockedDates={{}}
            isOwn={true}
            selectedBadgeId={selectedBadgeId}
            onSelectBadge={(id) => saveBadgeMutation.mutate(id === selectedBadgeId ? "" : id)}
          />
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

        <TabsContent value="suggestions" className="mt-4">
          <MySuggestions userEmail={user?.email} />
        </TabsContent>
      </Tabs>

      <AchievementToastQueue queue={toastQueue} onDismiss={dismissToast} />
    </div>
  );
}