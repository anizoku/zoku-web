import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, TrendingUp, Library, List, User, Users, Calendar, Trophy, Sparkles, Newspaper } from "lucide-react";
import { scrollMemory } from "@/lib/scrollMemory";

import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { ProfileImage } from '../ProfileMedia';
import SupabaseBrand from './SupabaseBrand';

const navItems = [
  { icon: Home,       label: "Início",        path: "/", reset: true },
  { icon: TrendingUp, label: "Trending",      path: "/trending" },
  { icon: Newspaper,  label: "Notícias",      path: "/noticias" },
  { icon: Library,    label: "Obras",         path: "/obras" },
  { icon: List,       label: "Minha Lista",   path: "/my-list" },
  { icon: Users,      label: "Comunidades",   path: "/communities" },
  { icon: User,       label: "Amigos",        path: "/friends" },
  { icon: Calendar,   label: "Eventos",       path: "/events" },
  { icon: Trophy,     label: "Ranking",       path: "/ranking" },
  { icon: Sparkles,   label: "Recomendações", path: "/recomendacoes" },
];

export default function SupabaseSidebar({ collapsed, onToggle, avatar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useSupabaseAuth();
  const name = profile?.display_name || profile?.username || user?.user_metadata?.full_name || 'Usuário';
  // Rank/XP require unmigrated activity entities. A future Supabase XP module
  // should replace these unavailable indicators, never fabricate level or XP.

  return (
    <aside
      className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed top-0 left-0 h-screen z-40 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo / Toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-expanded={!collapsed}
        className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors shrink-0 w-full"
      >
        <SupabaseBrand collapsed={collapsed} />
      </button>

      {/* Nav items */}
      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={item.reset ? () => scrollMemory.requestReset() : undefined}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-sm font-medium
                ${isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
                } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Profile block — pinned to bottom ── */}
      <div className="shrink-0 p-2 border-t border-sidebar-border">
        {collapsed ? (
          /* Collapsed: generic profile icon only — no avatar photo */
          <button
            onClick={() => navigate(user ? "/profile" : "/login")}
            title="Perfil"
            aria-label="Perfil"
            className="flex items-center justify-center w-full py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="w-4 h-4 text-sidebar-foreground" />
            </div>
          </button>
        ) : (
          /* Expanded: full profile card */
          <button
            onClick={() => navigate(user ? "/profile" : "/login")}
            className="w-full text-left rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors p-3 space-y-2"
          >
            {/* Avatar + name + level */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40 shrink-0 overflow-hidden">
                <ProfileImage src={avatar} crop={profile?.avatar_crop} alt={name}
                  className="w-full h-full object-cover"
                  fallback={<User className="w-4 h-4 text-primary" />} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {name}
                </p>
                <p className="text-xs font-medium truncate leading-tight text-muted-foreground">
                  {user ? "Rank indisponível" : "Entre na sua conta"}
                </p>
              </div>
              <span className="text-xs font-bold text-primary shrink-0">
                Lv. —
              </span>
            </div>

            {/* XP progress bar */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-sidebar-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: "0%" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right leading-none">
                XP indisponível
              </p>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}