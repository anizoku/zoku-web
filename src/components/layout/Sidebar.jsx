import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Tv, BookOpen, Users, List, User, Flame } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: TrendingUp, label: "Trending", path: "/trending" },
  { icon: Tv, label: "Animes", path: "/animes" },
  { icon: BookOpen, label: "Mangás", path: "/mangas" },
  { icon: Users, label: "Comunidades", path: "/communities" },
  { icon: List, label: "Minha Lista", path: "/my-list" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-space font-bold text-xl text-foreground tracking-tight">
            Otaku<span className="text-primary">Hub</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              {item.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="px-3 py-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
          <p className="font-medium text-secondary-foreground mb-1">OtakuHub v1.0</p>
          <p>Sua comunidade anime & mangá</p>
        </div>
      </div>
    </aside>
  );
}