import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, TrendingUp, Tv, Film, BookOpen, List, User, Users, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getXpProgress, getRankForLevel, getLevelFromXp } from "@/lib/xpSystem";

const LOGO_ICON = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/deb2fc23d_LOGOAZ.png";
const LOGO_HORIZONTAL = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/c61581414_aniZoku.png";

const navItems = [
  { icon: Home,       label: "Início",       path: "/" },
  { icon: TrendingUp, label: "Trending",     path: "/trending" },
  { icon: Tv,         label: "Animes",       path: "/animes" },
  { icon: Film,       label: "Filmes",       path: "/films" },
  { icon: BookOpen,   label: "Mangás",       path: "/mangas" },
  { icon: List,       label: "Minha Lista",  path: "/my-list" },
  { icon: Users,      label: "Comunidades",  path: "/communities" },
  { icon: User,       label: "Amigos",       path: "/friends" },
  { icon: Calendar,   label: "Eventos",      path: "/events" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.UserProfile.filter({ user_email: user.email }, "-created_date", 1)
      .then((res) => setProfile(res?.[0] || null))
      .catch(() => {});
  }, [user?.email]);

  // XP / rank
  const xp      = user?.xp ?? 0;
  const xpData  = getXpProgress(xp);
  const rank    = getRankForLevel(xpData.level);
  const avatar  = profile?.avatar_url;
  const name    = user?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <aside
      className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo / Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors shrink-0 w-full"
      >
        <img src={LOGO_ICON} alt="AniZoku" className="w-8 h-8 rounded-lg object-contain shrink-0" />
        {!collapsed && (
          <>
            <img src={LOGO_HORIZONTAL} alt="AniZoku" className="h-6 object-contain flex-1" />
            <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
          </>
        )}
        {collapsed && <ChevronRight className="w-4 h-4 text-muted-foreground absolute right-1 hidden" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
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

      {/* Profile block — bottom */}
      <div className="shrink-0 p-2 border-t border-sidebar-border">
        {collapsed ? (
          /* ── Collapsed: only avatar ── */
          <button
            onClick={() => navigate("/profile")}
            title="Perfil"
            className="flex items-center justify-center w-full py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-8 h-8 rounded-full object-cover border-2 border-primary/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
          </button>
        ) : (
          /* ── Expanded: full profile card ── */
          <button
            onClick={() => navigate("/profile")}
            className="w-full text-left rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors p-3 space-y-2"
          >
            {/* Avatar + name + rank */}
            <div className="flex items-center gap-2.5">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-primary/40 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40 shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {name}
                </p>
                <p className={`text-xs font-medium truncate leading-tight ${rank.color}`}>
                  {rank.title}
                </p>
              </div>
              <span className="text-xs font-bold text-primary shrink-0">
                Lv.{xpData.level}
              </span>
            </div>

            {/* XP bar */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-sidebar-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${xpData.percent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right leading-none">
                {xpData.currentLevelXp} / {xpData.nextLevelXp} XP
              </p>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}