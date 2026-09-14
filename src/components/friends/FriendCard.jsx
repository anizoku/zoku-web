import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, MoreVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import DirectChatDialog from "@/components/social/DirectChatDialog";
import WatchTogetherButton from "@/components/social/WatchTogetherButton";

export default function FriendCard({ friend, currentUser, profile, activeEntry }) {
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();

  const statusLabel = activeEntry
    ? `${activeEntry.status === "watching" ? "📺 Assistindo" : "📖 Lendo"} ${activeEntry.title}`
    : "Sem atividade recente";

  const goToProfile = () => navigate(`/u/${friend.email}`);

  return (
    <>
      <div
        className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/30 hover:border-primary/20 transition-colors cursor-pointer"
        onClick={() => setChatOpen(true)}
      >
        {/* Avatar — opens profile (stopPropagation) */}
        <button
          onClick={(e) => { e.stopPropagation(); goToProfile(); }}
          className="shrink-0 hover:opacity-80 transition-opacity"
          aria-label={`Ver perfil de ${friend.name}`}
        >
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
              : <span>{(friend.name || "A")[0].toUpperCase()}</span>}
          </div>
        </button>

        {/* Main content — opens chat */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate">{friend.name || friend.email}</span>
            {profile?.username && <span className="text-[10px] text-primary/70 truncate">@{profile.username}</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{statusLabel}</p>
        </div>

        {/* Hover hint — subtle chat icon */}
        <MessageCircle className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors hidden sm:block shrink-0" />

        {/* Actions — stopPropagation */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={goToProfile}>
                <User className="w-3.5 h-3.5 mr-2" /> Ver perfil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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