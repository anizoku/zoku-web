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
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Banner — shared component */}
      <ProfileBanner bannerUrl={profile?.banner_url} bannerCrop={profile?.banner_crop} />

      <div className="px-5 sm:px-6 pb-5">
        {/* Avatar + Identity */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
          {/* Avatar — overlapping banner, no level badge, achievement badge bottom-right */}
          <div className="flex justify-center sm:justify-start shrink-0 -mt-10 sm:-mt-12 relative z-10">
            <div className="w-20 h-20 rounded-full border-4 border-card bg-secondary overflow-hidden relative">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" style={getAvatarCropStyle(profile?.avatar_crop)} />
                : <span className={`w-full h-full flex items-center justify-center font-bold text-2xl font-space ${rank.color}`}>{(displayName)[0].toUpperCase()}</span>
              }
              {BadgeIcon && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-card flex items-center justify-center bg-secondary z-10" title={selectedAchievement.label}>
                  <BadgeIcon className={`w-3.5 h-3.5 ${getAchievementColor(selectedBadgeId)}`} />
                </div>
              )}
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0 text-center sm:text-left sm:pt-8">
            <h1 className="font-space font-bold text-xl text-foreground">{displayName}</h1>
            {profile?.username && (
              <p className="text-sm text-primary/80 font-medium">@{profile.username}</p>
            )}
            <p className={`text-sm font-semibold ${rank.color} mt-0.5`}>{rank.title}</p>
            {profile?.bio && (
              <p className="text-sm text-foreground/70 leading-relaxed mt-2 max-w-md mx-auto sm:mx-0">{profile.bio}</p>
            )}
            {profile?.links && Object.values(profile.links).some(Boolean) && (
              <div className="flex items-center gap-3 mt-2 flex-wrap justify-center sm:justify-start">
                {profile.links.twitter && (
                  <a href={`https://x.com/${profile.links.twitter.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <Twitter className="w-3 h-3" /> {profile.links.twitter}
                  </a>
                )}
                {profile.links.instagram && (
                  <a href={`https://instagram.com/${profile.links.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> {profile.links.instagram}
                  </a>
                )}
                {profile.links.website && (
                  <a href={profile.links.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Site
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions — below banner, not overlapping */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end mt-4">
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

        {/* Progress — full width */}
        <div className="mt-5 pt-5 border-t border-border">
          <XpProgressBar totalXp={totalXp} />
        </div>

        {/* Favorites — shared component */}
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