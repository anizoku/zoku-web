import { useState } from "react";
import { Twitter, Instagram, Globe, Flag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import XpProgressBar from "@/components/profile/XpProgressBar";
import FriendshipButton from "@/components/profile/FriendshipButton";
import DirectChatDialog from "@/components/social/DirectChatDialog";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileFavorites from "@/components/profile/ProfileFavorites";
import { getAvatarCropStyle } from "@/lib/cropHelpers";
import { getXpProgress, getRankForLevel } from "@/lib/xpSystem";
import { getFriendshipStatus } from "@/lib/social";
import { ACHIEVEMENTS, getAchievementColor } from "@/lib/achievements";
import { getAchievementIcon } from "@/lib/achievementIcons";

export default function PublicProfileHero({
  profile, displayName, totalXp,
  isOwnProfile, currentUser, targetEmail, friendships,
  onReport,
}) {
  const [showChat, setShowChat] = useState(false);
  const { level } = getXpProgress(totalXp);
  const rank = getRankForLevel(level);
  const friendshipStatus = getFriendshipStatus(friendships, currentUser?.email, targetEmail);
  const isFriend = friendshipStatus?.status === "accepted";

  // Selected achievement badge (read-only)
  const selectedBadgeId = profile?.selected_badge_id;
  const selectedAchievement = ACHIEVEMENTS.find(a => a.id === selectedBadgeId);
  const BadgeIcon = selectedAchievement ? getAchievementIcon(selectedAchievement.icon) : null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Banner */}
      <ProfileBanner bannerUrl={profile?.banner_url} bannerCrop={profile?.banner_crop} />

      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full border-4 border-card flex items-center justify-center relative overflow-hidden bg-secondary">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName}
                  className="w-full h-full object-cover"
                  style={getAvatarCropStyle(profile?.avatar_crop)}
                />
              ) : (
                <span className={`font-bold text-3xl font-space ${rank.color}`}>
                  {(displayName || "A")[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Achievement badge bottom-right (read-only) */}
            {BadgeIcon && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-card flex items-center justify-center bg-secondary z-20 shadow-lg" title={selectedAchievement.label}>
                <BadgeIcon className={`w-4 h-4 ${getAchievementColor(selectedBadgeId)}`} />
              </div>
            )}
          </div>

          {/* Name / rank / bio / links — pushed below banner overlap on desktop */}
          <div className="flex-1 pt-2 sm:pt-12 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-0.5">
              <h1 className="font-space font-bold text-xl text-foreground leading-tight">
                {displayName}
              </h1>
              <span className={`text-sm font-semibold ${rank.color}`}>{rank.title}</span>
            </div>

            {profile?.username && (
              <p className="text-sm text-muted-foreground font-medium mb-1">
                <span className="text-primary/70">@</span>{profile.username}
              </p>
            )}

            {profile?.bio && (
              <p className="text-sm text-foreground/70 mt-1 leading-relaxed">{profile.bio}</p>
            )}

            {/* Social links */}
            {profile?.links && Object.values(profile.links).some(Boolean) && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {profile.links.twitter && (
                  <a href={`https://x.com/${profile.links.twitter.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                    <Twitter className="w-3 h-3" /> {profile.links.twitter}
                  </a>
                )}
                {profile.links.instagram && (
                  <a href={`https://instagram.com/${profile.links.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                    <Instagram className="w-3 h-3" /> {profile.links.instagram}
                  </a>
                )}
                {profile.links.website && (
                  <a href={profile.links.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                    <Globe className="w-3 h-3" /> Site
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions — inline, right-aligned (same as profile próprio) */}
          <div className="flex items-center gap-2 sm:pt-12">
            {!isOwnProfile && currentUser && (
              <FriendshipButton
                currentUser={currentUser}
                targetEmail={targetEmail}
                targetName={displayName}
                targetProfile={profile}
                friendships={friendships}
              />
            )}
            {isFriend && (
              <Button size="sm" variant="outline" onClick={() => setShowChat(true)} className="h-8 text-xs gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Mensagem
              </Button>
            )}
            {!isOwnProfile && currentUser && (
              <Button size="sm" variant="ghost" onClick={onReport}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive">
                <Flag className="w-3.5 h-3.5" /> Reportar
              </Button>
            )}
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-5 pt-4 border-t border-border">
          <XpProgressBar totalXp={totalXp} />
        </div>

        {/* Favorites */}
        <ProfileFavorites profile={profile} />
      </div>

      {/* Direct chat dialog — only for accepted friends */}
      {isFriend && (
        <DirectChatDialog
          open={showChat}
          onClose={() => setShowChat(false)}
          currentUser={currentUser}
          friendEmail={targetEmail}
          friendName={displayName}
          friendAvatar={profile?.avatar_url}
        />
      )}
    </div>
  );
}