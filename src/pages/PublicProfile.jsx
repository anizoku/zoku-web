import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Tv, BookOpen, Star, Trophy, Calendar, Users } from "lucide-react";
import AchievementsPanel from "@/components/profile/AchievementsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { computeStats, computeTotalXp, getUnlockedAchievements } from "@/lib/xpSystem";
import { getMyFriends } from "@/lib/social";
import PublicProfileHero from "@/components/profile/PublicProfileHero";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import WorkLink from "@/components/media/WorkLink";
import PublicProfileStats from "@/components/profile/PublicProfileStats";
import CommonWorksSection from "@/components/profile/CommonWorksSection";
import ReportModal from "@/components/moderation/ReportModal";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

const statusLabels = { watching: "Assistindo", reading: "Lendo", completed: "Concluído", planned: "Planejado", dropped: "Dropado", on_hold: "Pausado" };
const statusColors = {
  watching: "bg-primary/15 text-primary", reading: "bg-chart-2/15 text-chart-2",
  completed: "bg-chart-4/15 text-chart-4", planned: "bg-secondary text-secondary-foreground",
  dropped: "bg-destructive/15 text-destructive", on_hold: "bg-chart-3/15 text-chart-3"
};

export default function PublicProfile() {
  const { userEmail } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: allUsers } = useQuery({ queryKey: ["all-users"], queryFn: () => base44.entities.User.list("-created_date", 200), initialData: [] });
  const { data: profiles } = useQuery({ queryKey: ["user-profiles"], queryFn: () => base44.entities.UserProfile.list("-created_date", 200), initialData: [] });
  const { data: entries } = useQuery({ queryKey: ["all-entries-public"], queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 500), initialData: [] });
  const { data: posts } = useQuery({ queryKey: ["posts"], queryFn: () => base44.entities.Post.list("-created_date", 50), initialData: [] });
  const { data: friendships } = useQuery({ queryKey: ["friendships"], queryFn: () => base44.entities.Friendship.list("-created_date", 200), initialData: [] });
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.SocialEvent.list("-event_date", 20), initialData: [] });

  const targetUser = allUsers.find(u => u.email === userEmail);
  const profile = profiles.find(p => p.user_email === userEmail);

  // Redirect own profile to /profile
  useEffect(() => {
    if (currentUser?.email && userEmail === currentUser.email) navigate("/profile");
  }, [currentUser, userEmail]);

  const userEntries = entries.filter(e => e.created_by === userEmail);
  const userPosts = posts.filter(p => p.created_by === userEmail);
  const userFriends = getMyFriends(friendships, userEmail);
  // Verifica se o visitante atual é amigo do perfil visitado
  const currentUserFriends = currentUser ? getMyFriends(friendships, currentUser.email) : [];
  const isFriendOfTarget = currentUserFriends.some(f => f.email === userEmail);
  const isOwnProfile = currentUser?.email === userEmail;

  // Mostra eventos públicos para todos; eventos "friends" apenas se for amigo ou o próprio dono
  const userEvents = events.filter(e => {
    if (e.organizer_email !== userEmail && !e.participants?.includes(userEmail)) return false;
    if (e.visibility === "public") return true;
    if (e.visibility === "friends" && (isFriendOfTarget || isOwnProfile)) return true;
    if (e.visibility === "private" && isOwnProfile) return true;
    return false;
  });

  const stats = computeStats(userEntries, userPosts, [], [], profile);
  const totalXp = computeTotalXp(stats);
  const publicUnlocked = getUnlockedAchievements(stats).map(a => a.id);

  const [listStatusFilter, setListStatusFilter] = useState("all");
  const [listTypeFilter, setListTypeFilter] = useState("all");
  const [showReportProfile, setShowReportProfile] = useState(false);

  usePageTitle(targetUser ? `@${profile?.username || targetUser.full_name}` : null);

  const displayName = targetUser?.full_name || userEmail;

  const handleShareProfile = () => {
    const url = `${window.location.origin}/u/${userEmail}`;
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Link copiado!");
  };

  // My entries for compatibility section
  const myOwnEntries = currentUser ? entries.filter(e => e.created_by === currentUser.email) : [];

  if (!targetUser && allUsers.length > 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Perfil não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-5">
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Button>

      <PublicProfileHero
        profile={profile}
        displayName={displayName}
        totalXp={totalXp}
        isOwnProfile={isOwnProfile}
        currentUser={currentUser}
        targetEmail={userEmail}
        friendships={friendships}
        onShare={handleShareProfile}
        onReport={() => setShowReportProfile(true)}
      />

      <ReportModal
        open={showReportProfile}
        onClose={() => setShowReportProfile(false)}
        contentType="profile"
        contentId={userEmail}
        contentPreview={`Perfil de @${profile?.username || displayName}`}
        authorEmail={userEmail}
        userEmail={currentUser?.email}
      />

      {/* Detailed Stats */}
      <PublicProfileStats entries={userEntries} />

      {/* Compatibility section (friends only) */}
      {isFriendOfTarget && !isOwnProfile && currentUser && (
        <CommonWorksSection
          myEntries={myOwnEntries}
          theirEntries={userEntries}
          targetUser={targetUser}
          currentUser={currentUser}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { icon: Tv, label: "Assistindo", value: userEntries.filter(e=>e.status==="watching").length, color: "text-primary" },
          { icon: BookOpen, label: "Lendo", value: userEntries.filter(e=>e.status==="reading").length, color: "text-chart-2" },
          { icon: Trophy, label: "Concluídos", value: userEntries.filter(e=>e.status==="completed").length, color: "text-chart-4" },
          { icon: Star, label: "Posts", value: userPosts.length, color: "text-chart-5" },
          { icon: Tv, label: "Eps.", value: stats.totalEpisodes, color: "text-primary" },
          { icon: BookOpen, label: "Caps.", value: stats.totalChapters, color: "text-chart-2" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
            <p className="font-space font-bold text-base text-foreground">{s.value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list">
        <TabsList className="bg-secondary flex-wrap h-auto gap-1">
          <TabsTrigger value="list"><Tv className="w-3.5 h-3.5 mr-1" />Lista</TabsTrigger>
          <TabsTrigger value="friends"><Users className="w-3.5 h-3.5 mr-1" />Amigos ({userFriends.length})</TabsTrigger>
          <TabsTrigger value="events"><Calendar className="w-3.5 h-3.5 mr-1" />Eventos</TabsTrigger>
          <TabsTrigger value="achievements"><Trophy className="w-3.5 h-3.5 mr-1" />Conquistas ({publicUnlocked.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {userEntries.length === 0
            ? <div className="bg-card rounded-xl border border-border p-8 text-center"><p className="text-muted-foreground text-sm">Lista vazia ou privada</p></div>
            : (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {["all", "anime", "manga", "movie"].map(t => (
                    <button key={t} onClick={() => setListTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${listTypeFilter === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {t === "all" ? "Todos" : t === "anime" ? "Anime" : t === "manga" ? "Mangá" : "Filme"}
                    </button>
                  ))}
                  <span className="text-muted-foreground">|</span>
                  {["all", ...Object.keys(statusLabels)].map(s => (
                    <button key={s} onClick={() => setListStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${listStatusFilter === s ? "bg-secondary text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
                      {s === "all" ? "Todos status" : statusLabels[s]}
                    </button>
                  ))}
                </div>

                {Object.entries(statusLabels).map(([status, label]) => {
                  if (listStatusFilter !== "all" && listStatusFilter !== status) return null;
                  const items = userEntries.filter(e =>
                    e.status === status &&
                    (listTypeFilter === "all" || e.type === listTypeFilter)
                  );
                  if (!items.length) return null;
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
                                <WorkLink title={entry.title} className="text-sm font-medium text-foreground hover:text-primary transition-colors" />
                                <p className="text-xs text-muted-foreground">{isAnime ? `Ep. ${current}` : `Cap. ${current}`}{total > 0 ? ` / ${total}` : ""}</p>
                              </div>
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

        <TabsContent value="friends" className="mt-4">
          {userFriends.length === 0
            ? <div className="bg-card rounded-xl border border-border p-8 text-center"><p className="text-muted-foreground text-sm">Sem amigos visíveis</p></div>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userFriends.map(f => {
                  const fp = profiles.find(p => p.user_email === f.email);
                  return (
                    <button key={f.email} onClick={() => navigate(`/u/${f.email}`)}
                      className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-colors text-left w-full">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                        {fp?.avatar_url ? <img src={fp.avatar_url} className="w-full h-full object-cover" /> : (f.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{f.name || f.email}</p>
                        {fp?.username && <p className="text-xs text-primary/70">@{fp.username}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {userEvents.length === 0
            ? <div className="bg-card rounded-xl border border-border p-8 text-center"><Calendar className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" /><p className="text-muted-foreground text-sm">Nenhum evento público</p></div>
            : (
              <div className="grid gap-3">
                {userEvents.map(event => (
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
                    </div>
                  </div>
                ))}
              </div>
            )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <AchievementsPanel
            unlockedIds={publicUnlocked}
            unlockedDates={{}}
            isOwn={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}