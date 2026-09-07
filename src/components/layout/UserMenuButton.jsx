import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { User, List, Users, Calendar, LogOut, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRankForLevel } from "@/lib/xpSystem";
import { useAuth } from "@/lib/AuthContext";

export default function UserMenuButton() {
  const { user, isAdmin } = useAuth();

  const { data: profiles } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 100),
    enabled: !!user,
    initialData: [],
  });

  const myProfile = profiles.find(p => p.user_email === user?.email);

  if (!user) return null;

  const initial = (user.full_name || "A")[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-full border-2 border-border hover:border-primary/50 transition-colors overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0">
          {myProfile?.avatar_url ? (
            <img src={myProfile.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {initial}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-card border-border">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border">
          <p className="font-semibold text-sm text-foreground truncate">{user.full_name}</p>
          {myProfile?.username && (
            <p className="text-xs text-primary/80">@{myProfile.username}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <DropdownMenuItem asChild className="gap-2 cursor-pointer mt-1">
          <Link to="/profile">
            <User className="w-4 h-4 text-muted-foreground" /> Ver Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link to="/my-list">
            <List className="w-4 h-4 text-muted-foreground" /> Minha Lista
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link to="/friends">
            <Users className="w-4 h-4 text-muted-foreground" /> Amigos
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link to="/events">
            <Calendar className="w-4 h-4 text-muted-foreground" /> Eventos
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem asChild className="gap-2 cursor-pointer text-primary focus:text-primary">
              <Link to="/admin">
                <ShieldCheck className="w-4 h-4" /> Área admin
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}