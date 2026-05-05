import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users } from "lucide-react";

function MemberAvatar({ email, profile, size = 10 }) {
  const navigate = useNavigate();
  const name = profile?.username || email?.split("@")[0] || "?";
  const initial = name[0].toUpperCase();

  return (
    <button
      title={name}
      onClick={() => navigate(`/u/${email}`)}
      className={`w-${size} h-${size} rounded-full border-2 border-background overflow-hidden shrink-0 hover:scale-110 transition-transform`}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{initial}</span>
        </div>
      )}
    </button>
  );
}

function MemberListItem({ email, profile }) {
  const navigate = useNavigate();
  const name = profile?.username || email?.split("@")[0] || email;

  return (
    <button
      onClick={() => navigate(`/u/${email}`)}
      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{name[0]?.toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{profile?.username || name}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
    </button>
  );
}

export default function MembersSection({ members = [] }) {
  const [open, setOpen] = useState(false);
  const VISIBLE = 10;
  const extra = members.length - VISIBLE;

  const { data: profiles = [] } = useQuery({
    queryKey: ["member-profiles", members.join(",")],
    queryFn: async () => {
      if (!members.length) return [];
      const all = await base44.entities.UserProfile.list("-created_date", 200);
      return all.filter(p => members.includes(p.user_email));
    },
    enabled: members.length > 0,
  });

  const profileMap = Object.fromEntries(profiles.map(p => [p.user_email, p]));
  const visible = members.slice(0, VISIBLE);

  if (!members.length) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>Nenhum membro ainda</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {visible.map(email => (
          <MemberAvatar key={email} email={email} profile={profileMap[email]} size={9} />
        ))}
        {extra > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
          >
            +{extra}
          </button>
        )}
        {members.length <= VISIBLE && (
          <button
            onClick={() => setOpen(true)}
            className="ml-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Ver todos
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-space flex items-center gap-2">
              <Users className="w-4 h-4" /> Membros ({members.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 pt-2">
            {members.map(email => (
              <MemberListItem key={email} email={email} profile={profileMap[email]} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}