// ============================================================
// unlockAchievement — Backend authority for achievement validation
// ============================================================
// The client NO LONGER creates UserAchievement directly.
// All achievement unlocks go through this function, which:
//   1. Authenticates via base44.auth.me()
//   2. Validates achievement_id exists
//   3. Computes real user stats from DB (not client claims)
//   4. Checks the achievement condition server-side
//   5. If met: creates UserAchievement + grants XP (idempotent)
//   6. If not met: rejects (CONDITION_NOT_MET)
//   7. Returns structured result
//
// KNOWN LIMITATIONS (backend can't access src/lib/catalog.js):
//   - five_genres: uniqueGenres not computable → always false
//   - first_comment: totalComments not fetched → always false
//   - streak_weeks_4: activeWeeks not tracked → always false
//   - same_day_complete: not computable → always false
// These 4 achievements cannot be unlocked via backend.
// Existing client-side unlocks are preserved (ALREADY_GRANTED).
// ============================================================

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  ACHIEVEMENT_XP, getLevelFromXp, updateStreak, findExisting, createEvent,
} from "../../shared/xpConstants.ts";

// ── Achievement conditions (duplicated from src/lib/achievements.js) ──
// Backend is authoritative; frontend copy is display-only.
const ACHIEVEMENT_CONDITIONS: Record<string, (s: any) => boolean> = {
  // Episodes
  first_episode: (s) => s.totalEpisodes >= 1,
  ep_10: (s) => s.totalEpisodes >= 10,
  ep_50: (s) => s.totalEpisodes >= 50,
  ep_100: (s) => s.totalEpisodes >= 100,
  ep_500: (s) => s.totalEpisodes >= 500,
  ep_1000: (s) => s.totalEpisodes >= 1000,
  // Chapters
  first_chapter: (s) => s.totalChapters >= 1,
  ch_20: (s) => s.totalChapters >= 20,
  ch_100: (s) => s.totalChapters >= 100,
  ch_500: (s) => s.totalChapters >= 500,
  ch_1000: (s) => s.totalChapters >= 1000,
  // Movies
  first_movie: (s) => s.totalMovies >= 1,
  movie_10: (s) => s.totalMovies >= 10,
  movie_25: (s) => s.totalMovies >= 25,
  movie_50: (s) => s.totalMovies >= 50,
  // Library
  first_add: (s) => s.totalTitles >= 1,
  list_5: (s) => s.totalTitles >= 5,
  list_10: (s) => s.totalTitles >= 10,
  list_25: (s) => s.totalTitles >= 25,
  list_50: (s) => s.totalTitles >= 50,
  list_100: (s) => s.totalTitles >= 100,
  first_complete: (s) => s.completedTitles >= 1,
  complete_5: (s) => s.completedTitles >= 5,
  complete_10: (s) => s.completedTitles >= 10,
  complete_25: (s) => s.completedTitles >= 25,
  four_categories: (s) => s.categoryCount >= 3,
  planned_10: (s) => s.plannedTitles >= 10,
  // Consistency
  streak_3: (s) => s.currentStreak >= 3,
  streak_7: (s) => s.currentStreak >= 7,
  streak_30: (s) => s.currentStreak >= 30,
  login_3: (s) => s.loginStreak >= 3,
  login_7: (s) => s.loginStreak >= 7,
  login_30: (s) => s.loginStreak >= 30,
  streak_weeks_4: () => false, // activeWeeks not tracked in backend
  // Social
  first_friend: (s) => s.friendsCount >= 1,
  friends_5: (s) => s.friendsCount >= 5,
  friends_10: (s) => s.friendsCount >= 10,
  friends_25: (s) => s.friendsCount >= 25,
  first_post: (s) => s.totalPosts >= 1,
  post_liked_5: (s) => s.maxLikesOnPost >= 5,
  post_liked_10: (s) => s.maxLikesOnPost >= 10,
  post_10: (s) => s.totalPosts >= 10,
  first_comment: () => false, // totalComments not fetched
  comment_received: (s) => s.commentsReceived >= 1,
  first_community: (s) => s.communitiesJoined >= 1,
  watch_together_first: (s) => s.watchTogetherCount >= 1,
  watch_together_done: (s) => s.watchTogetherCompleted >= 1,
  friend_request_sent: (s) => s.friendRequestsSent >= 1,
  // Community
  post_community_10: (s) => s.communityPosts >= 10,
  founded_community: (s) => s.communitiesCreated >= 1,
  community_10m: (s) => s.communityMaxMembers >= 10,
  first_event: (s) => s.eventsJoined >= 1,
  create_event: (s) => s.eventsCreated >= 1,
  communities_5: (s) => s.communitiesJoined >= 5,
  // Collector
  both_types: (s) => s.hasAnime && s.hasManga,
  multimedia: (s) => s.hasAnime && s.hasManga && s.hasMovie,
  five_genres: () => false, // uniqueGenres not computable without catalog
  movie_and_live: (s) => s.hasMovie && s.hasLiveaction,
  same_work_types: (s) => s.sameWorkBothTypes >= 1,
  long_anime: (s) => s.completedLongAnime >= 1,
  long_manga: (s) => s.completedLongManga >= 1,
  // Profile
  profile_complete: (s) => s.profileComplete,
  has_avatar: (s) => s.hasAvatar,
  has_banner: (s) => s.hasBanner,
  has_badge: (s) => s.hasSelectedBadge,
  level_5: (s) => s.currentLevel >= 5,
  level_10: (s) => s.currentLevel >= 10,
  level_25: (s) => s.currentLevel >= 25,
  level_50: (s) => s.currentLevel >= 50,
  // Special
  founder: (s) => s.isFounder === true,
  same_day_complete: () => false, // not computable without timestamps
  complete_100: (s) => s.completedTitles >= 100,
  max_level: (s) => s.currentLevel >= 100,
  otaku_supreme: (s) => s.totalEpisodes >= 100 && s.totalChapters >= 100 && s.completedTitles >= 10 && s.totalPosts >= 10,
};

// ── Compute stats from DB data (simplified version of computeStats) ──
function computeStatsBackend(
  entries: any[], posts: any[], profile: any, friendships: any[],
  events: any[], communities: any[], watchTogether: any[], totalXp: number, isFounder: boolean
): any {
  const myAnime = entries.filter((e) => e.type === "anime");
  const myManga = entries.filter((e) => e.type === "manga");
  const myMovies = entries.filter((e) => e.type === "movie" || e.type === "liveaction");
  const myLiveact = entries.filter((e) => e.type === "liveaction");

  const totalEpisodes = myAnime.reduce((s, e) => s + (e.current_episode || 0), 0);
  const totalChapters = myManga.reduce((s, e) => s + (e.current_chapter || 0), 0);
  const totalMovies = myMovies.filter((e) => e.status === "completed").length;
  const completedTitles = entries.filter((e) => e.status === "completed").length;
  const totalTitles = entries.length;
  const plannedTitles = entries.filter((e) => e.status === "planned").length;

  const hasAnime = myAnime.length > 0;
  const hasManga = myManga.length > 0;
  const hasMovie = myMovies.length > 0;
  const hasLiveaction = myLiveact.length > 0;
  const categoryCount = [hasAnime, hasManga, hasMovie, hasLiveaction].filter(Boolean).length;

  const completedLongAnime = myAnime.filter((e) => e.status === "completed" && (e.total_episodes || 0) >= 100).length;
  const completedLongManga = myManga.filter((e) => e.status === "completed" && (e.total_chapters || 0) >= 100).length;

  const animeTitles = new Set(myAnime.map((e) => e.title?.toLowerCase().trim()));
  const mangaTitles = new Set(myManga.map((e) => e.title?.toLowerCase().trim()));
  const sameWorkBothTypes = [...animeTitles].filter((t) => mangaTitles.has(t)).length;

  const totalPosts = posts.length;
  const maxLikesOnPost = posts.reduce((m, p) => Math.max(m, p.likes_count || 0), 0);
  const commentsReceived = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
  const communityPosts = posts.filter((p) => p.community_id).length;

  const friendsCount = friendships.filter((f) => f.status === "accepted").length;
  const friendRequestsSent = friendships.filter((f) => f.requester_email === profile?.user_email).length;

  const communitiesJoined = communities.filter((c) => c.created_by !== profile?.user_email).length;
  const communitiesCreated = communities.filter((c) => c.created_by === profile?.user_email).length;
  const communityMaxMembers = communities.reduce((m, c) => {
    const members = c.member_count || c.members?.length || 0;
    return Math.max(m, members);
  }, 0);

  const eventsJoined = events.length;
  const eventsCreated = events.filter((e) => e.organizer_email === profile?.user_email || e.created_by === profile?.user_email).length;

  const watchTogetherCount = watchTogether.length;
  const watchTogetherCompleted = watchTogether.filter((w) => w.status === "completed").length;

  const currentStreak = profile?.current_streak || 0;
  const loginStreak = profile?.login_streak || 0;

  const profileComplete = !!(profile?.username && profile?.avatar_url && profile?.bio);
  const hasAvatar = !!profile?.avatar_url;
  const hasBanner = !!profile?.banner_url;
  const hasSelectedBadge = !!(profile?.selected_badge_id && profile.selected_badge_id !== "");

  const currentLevel = getLevelFromXp(totalXp);

  return {
    totalEpisodes, totalChapters, totalMovies, completedTitles, totalTitles, plannedTitles,
    hasAnime, hasManga, hasMovie, hasLiveaction, categoryCount,
    completedLongAnime, completedLongManga, sameWorkBothTypes,
    totalPosts, maxLikesOnPost, commentsReceived, communityPosts,
    friendsCount, friendRequestsSent,
    communitiesJoined, communitiesCreated, communityMaxMembers,
    eventsJoined, eventsCreated,
    watchTogetherCount, watchTogetherCompleted,
    currentStreak, loginStreak,
    profileComplete, hasAvatar, hasBanner, hasSelectedBadge,
    currentLevel, isFounder,
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ status: "UNAUTHORIZED" }, { status: 401 });

    const svc = base44.asServiceRole;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ status: "INVALID_BODY" }, { status: 400 });
    }

    const { achievement_id } = body;
    if (!achievement_id) return Response.json({ status: "INVALID_ACHIEVEMENT" }, { status: 400 });

    // Validate achievement exists
    const xpAmount = ACHIEVEMENT_XP[achievement_id];
    if (xpAmount == null) return Response.json({ status: "INVALID_ACHIEVEMENT" }, { status: 400 });

    // Check if already unlocked (idempotent)
    const existingUA = await svc.entities.UserAchievement.filter({
      user_email: user.email,
      achievement_key: achievement_id,
    });
    if (existingUA && existingUA.length > 0) {
      return Response.json({ status: "ALREADY_GRANTED", xp_amount: xpAmount });
    }

    // Compute stats from DB
    const entries = await svc.entities.AnimeEntry.filter({ created_by: user.email });
    const posts = await svc.entities.Post.filter({ created_by: user.email });
    const profiles = await svc.entities.UserProfile.filter({ user_email: user.email });
    const profile = profiles?.[0] || null;

    // Fetch friendships (user is requester or receiver)
    const allFriendships = await svc.entities.Friendship.list("-created_date", 500);
    const friendships = allFriendships.filter(
      (f: any) => f.requester_email === user.email || f.receiver_email === user.email
    );

    // Fetch events
    const allEvents = await svc.entities.SocialEvent.list("-created_date", 500);
    const events = allEvents.filter((e: any) => {
      const participants = e.participants || e.invited_emails || [];
      return e.created_by === user.email || e.organizer_email === user.email ||
        (Array.isArray(participants) && participants.includes(user.email));
    });

    // Fetch communities
    const allCommunities = await svc.entities.Community.list("-created_date", 500);
    const communities = allCommunities.filter((c: any) => {
      const members = c.member_emails || c.members || [];
      return c.created_by === user.email ||
        (Array.isArray(members) && members.includes(user.email));
    });

    // Fetch watch together
    const allWatchTogether = await svc.entities.WatchTogether.list("-created_date", 500);
    const watchTogether = allWatchTogether.filter((w: any) => {
      const participants = w.participants || w.invited_emails || [];
      return w.created_by === user.email ||
        (Array.isArray(participants) && participants.includes(user.email));
    });

    // Fetch XP events for level calculation
    const xpEvents = await svc.entities.XpEvent.filter({ user_email: user.email });
    const totalXp = xpEvents.reduce((sum: number, ev: any) => sum + (ev.xp_amount || 0), 0);

    // Check founder status
    const first10Users = await svc.entities.User.list("created_date", 10);
    const isFounder = first10Users.some((u: any) => u.email === user.email);

    // Compute stats
    const stats = computeStatsBackend(entries, posts, profile, friendships, events, communities, watchTogether, totalXp, isFounder);

    // Check condition
    const condition = ACHIEVEMENT_CONDITIONS[achievement_id];
    if (!condition) return Response.json({ status: "INVALID_ACHIEVEMENT" }, { status: 400 });

    const conditionMet = condition(stats);
    if (!conditionMet) {
      return Response.json({ status: "CONDITION_NOT_MET" }, { status: 403 });
    }

    // Create UserAchievement (service role bypasses RLS)
    await svc.entities.UserAchievement.create({
      user_email: user.email,
      achievement_key: achievement_id,
      unlocked_at: new Date().toISOString(),
    });

    // Grant XP via XpEvent (idempotent)
    const xpKey = `achievement:${achievement_id}`;
    const existingXp = await findExisting(svc, user.email, xpKey);
    let grantedXp = 0;
    if (!existingXp) {
      await createEvent(svc, user.email, "achievement_unlocked", xpAmount, "achievement", achievement_id, xpKey, achievement_id);
      grantedXp = xpAmount;
      await updateStreak(svc, user.email);
    }

    return Response.json({
      status: "GRANTED",
      xp_amount: grantedXp,
      achievement_id,
    });
  } catch (error: any) {
    return Response.json({ status: "ERROR", error: error?.message || "Unknown error" }, { status: 500 });
  }
}