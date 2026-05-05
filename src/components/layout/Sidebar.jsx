import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, TrendingUp, Tv, Film, BookOpen, List, User, Users, Calendar, Clapperboard } from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { computeStats, computeTotalXp, getXpProgress, getRankForLevel } from "@/lib/xpSystem";

const LOGO_ICON       = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/deb2fc23d_LOGOAZ.png";
const LOGO_HORIZONTAL = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/c61581414_aniZoku.png";

const navItems = [
  { icon: Home,       label: "Início",      path: "/" },
  { icon: TrendingUp, label: "Trending",    path: "/trending" },
  { icon: Tv,         label: "Animes",      path: "/animes" },
  { icon: Film,       label: "Filmes",      path: "/films" },
  { icon: Clapperboard, label: "Live Action", path: "/series" },
  { icon: BookOpen,   label: "Mangás",      path: "/mangas" },
  { icon: List,       label: "Minha Lista", path: "/my-list" },
  { icon: Users,      label: "Comunidades", path: "/communities" },
  { icon: User,       label: "Amigos",      path: "/friends" },
  { icon: Calendar,   label: "Eventos",     path: "/events" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [posts,   setPosts]   = useState([]);

  // Load current user once
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Load profile + initial entries + posts once we have the user email
  useEffect(() => {
    if (!user?.email) return;

    base44.entities.UserProfile
      .filter({ user_email: user.email }, "-created_date", 1)
      .then((res) => setProfile(res?.[0] || null))
      .catch(() => {});

    // Initial fetch
    base44.entities.AnimeEntry.list("-updated_date", 500)
      .then(setEntries).catch(() => {});
    base44.entities.Post.list("-created_date", 200)
      .then(setPosts).catch(() => {});
  }, [user?.email]);

  // Real-time subscriptions so XP bar updates immediately on any action
  useEffect(() => {
    if (!user?.email) return;

    const unsubEntries = base44.entities.AnimeEntry.subscribe((event) => {
      if (event.type === "create") {
        setEntries((prev) => [...prev, event.data]);
      } else if (event.type === "update") {
        setEntries((prev) => prev.map((e) => (e.id === event.id ? event.data : e)));
      } else if (event.type === "delete") {
        setEntries((prev) => prev.filter((e) => e.id !== event.id));
      }
    });

    const unsubPosts = base44.entities.Post.subscribe((event) => {
      if (event.type === "create") {
        setPosts((prev) => [...prev, event.data]);
      } else if (event.type === "update") {
        setPosts((prev) => prev.map((p) => (p.id === event.id ? event.data : p)));
      } else if (event.type === "delete") {
        setPosts((prev) => prev.filter((p) => p.id !== event.id));
      }
    });

    return () => {
      unsubEntries();
      unsubPosts();
    };
  }, [user?.email]);

  // Compute XP from real data — same logic as Profile page
  const myEntries = entries.filter((e) => e.created_by === user?.email);
  const myPosts   = posts.filter((p)   => p.created_by === user?.email);
  const stats     = computeStats(myEntries, myPosts);
  const totalXp   = computeTotalXp(stats);
  const xpData    = getXpProgress(totalXp);
  const rank      = getRankForLevel(xpData.level);

  const avatar = profile?.avatar_url;
  const name   = user?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <aside
      className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed top-0 left-0 h-screen z-40 ${
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
          <img src={LOGO_HORIZONTAL} alt="AniZoku" className="h-6 object-contain flex-1" />
        )}
      </button>

      {/* Nav items */}
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

      {/* ── Profile block — pinned to bottom ── */}
      <div className="shrink-0 p-2 border-t border-sidebar-border">
        {collapsed ? (
          /* Collapsed: generic profile icon only — no avatar photo */
          <button
            onClick={() => navigate("/profile")}
            title="Perfil"
            className="flex items-center justify-center w-full py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="w-4 h-4 text-sidebar-foreground" />
            </div>
          </button>
        ) : (
          /* Expanded: full profile card */
          <button
            onClick={() => navigate("/profile")}
            className="w-full text-left rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors p-3 space-y-2"
          >
            {/* Avatar + name + level */}
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

            {/* XP progress bar */}
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