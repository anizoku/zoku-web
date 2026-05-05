import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Tv, Film, BookOpen, List, User, Users, Calendar, MessageSquare } from "lucide-react";

const LOGO_ICON = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/deb2fc23d_LOGOAZ.png";
const LOGO_HORIZONTAL = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/c61581414_aniZoku.png";

const navItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: TrendingUp, label: "Trending", path: "/trending" },
  { icon: Tv, label: "Animes", path: "/animes" },
  { icon: Film, label: "Filmes", path: "/films" },
  { icon: BookOpen, label: "Mangás", path: "/mangas" },
  { icon: List, label: "Minha Lista", path: "/my-list" },
  { icon: Users, label: "Comunidades", path: "/communities" },
  { icon: User, label: "Amigos", path: "/friends" },
  { icon: Calendar, label: "Eventos", path: "/events" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside
      className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors shrink-0 w-full"
      >
        <img src={LOGO_ICON} alt="AniZoku" className="w-8 h-8 rounded-lg object-contain shrink-0" />
        {!collapsed && (
          <img src={LOGO_HORIZONTAL} alt="AniZoku" className="h-6 object-contain" />
        )}
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
    </aside>
  );
}