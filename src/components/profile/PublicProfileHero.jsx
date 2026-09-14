import { Twitter, Instagram, Globe, Share2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import XpProgressBar from "@/components/profile/XpProgressBar";
import FriendshipButton from "@/components/profile/FriendshipButton";
import { getXpProgress, getRankForLevel } from "@/lib/xpSystem";

export default function PublicProfileHero({
  profile, displayName, totalXp,
  isOwnProfile, currentUser, targetEmail, friendships,
  onShare, onReport,
}) {
  const { level } = getXpProgress(totalXp);
  const rank = getRankForLevel(level);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Banner — standard height, no overlays */}
      <div className="h-32 sm:h-52 relative overflow-hidden">
        {profile?.banner_url
          ? <img src={profile.banner_url} alt="banner" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-r from-primary/20 via-chart-2/10 to-chart-3/5" />
        }
      </div>

      <div className="px-5 sm:px-6 pb-5">
        {/* Avatar + Identity */}
        <div className="flex flex-col sm:flex-row gap-4 -mt-12 sm:-mt-14">
          {/* Avatar — no badge */}
          <div className="flex justify-center sm:block shrink-0">
            <div className="w-20 h-20 rounded-full border-4 border-card bg-secondary overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                : <span className={`w-full h-full flex items-center justify-center font-bold text-2xl font-space ${rank.color}`}>{(displayName)[0].toUpperCase()}</span>
              }
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0 text-center sm:text-left pt-1">
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
          <Button size="sm" variant="outline" onClick={onShare} className="h-8 text-xs gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Compartilhar
          </Button>
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
      </div>
    </div>
  );
}