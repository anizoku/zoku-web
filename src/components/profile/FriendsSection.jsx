import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageCircle, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DirectChatDialog from "@/components/social/DirectChatDialog";
import WatchTogetherButton from "@/components/social/WatchTogetherButton";
import { getMyFriends } from "@/lib/social";

function FriendCard({ friend, currentUser, profiles, entries }) {
  const [chatOpen, setChatOpen] = useState(false);
  const profile = profiles.find(p => p.user_email === friend.email);

  // Find what this friend is currently watching/reading
  const friendEntries = entries.filter(e => e.created_by === friend.email);
  const activeEntry = friendEntries.find(e => e.status === "watching" || e.status === "reading");

  const statusLabel = activeEntry
    ? `${activeEntry.status === "watching" ? "Assistindo" : "Lendo"} ${activeEntry.title}`
    : "Inativo";

  const statusDot = activeEntry
    ? "bg-primary"
    : "bg-muted-foreground/40";

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-3 hover:border-primary/20 transition-colors">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                : <span>{(friend.name || "A")[0].toUpperCase()}</span>
              }
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusDot}`} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{friend.name}</p>
            {profile?.username && (
              <p className="text-[10px] text-primary/70">@{profile.username}</p>
            )}
            <p className="text-xs text-muted-foreground truncate mt-0.5">{statusLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle className="w-3 h-3" /> Chat
          </Button>
          <WatchTogetherButton
            currentUser={currentUser}
            friendEmail={friend.email}
            friendName={friend.name}
            prefilledTitle={activeEntry?.title}
            prefilledType={activeEntry?.type}
            prefilledEp={activeEntry
              ? (activeEntry.type === "anime" ? (activeEntry.current_episode || 0) + 1 : (activeEntry.current_chapter || 0) + 1)
              : undefined
            }
            size="sm"
          />
        </div>
      </div>

      <DirectChatDialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUser={currentUser}
        friendEmail={friend.email}
        friendName={friend.name}
        friendAvatar={profile?.avatar_url}
      />
    </>
  );
}

export default function FriendsSection({ currentUser }) {
  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: () => base44.entities.Friendship.list("-created_date", 200),
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 200),
    initialData: [],
  });

  const { data: allEntries } = useQuery({
    queryKey: ["all-entries-public"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 500),
    initialData: [],
  });

  const friends = currentUser ? getMyFriends(friendships, currentUser.email) : [];

  if (friends.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Nenhum amigo ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Vá em "Amigos" para conectar-se</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-chart-2" />
        <span className="font-semibold text-sm text-foreground">{friends.length} amigo{friends.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {friends.map(f => (
          <FriendCard
            key={f.email}
            friend={f}
            currentUser={currentUser}
            profiles={profiles}
            entries={allEntries}
          />
        ))}
      </div>
    </div>
  );
}