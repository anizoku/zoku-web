import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Tv, BookOpen, Users, List, User, Flame, Film } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { computeStats, computeTotalXp, getXpProgress, getRankForLevel } from "@/lib/xpSystem";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: TrendingUp, label: "Trending", path: "/trending" },
  { icon: Tv, label: "Animes", path: "/animes" },
  { icon: Film, label: "Filmes", path: "/films" },
  { icon: BookOpen, label: "Mangás", path: "/mangas" },
  { icon: Users, label: "Comunidades", path: "/communities" },
  { icon: List, label: "Minha Lista", path: "/my-list" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export default function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries } = useQuery({
    queryKey: ["sidebar-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 200),
    initialData: [],
  });
  const { data: posts } = useQuery({
    queryKey: ["sidebar-posts"],
    queryFn: () => base44.entities.Post.list("-created_date", 50),
    initialData: [],
  });

  const myEntries = user ? entries.filter((e) => e.created_by === user.email) : [];
  const myPosts = user ? posts.filter((p) => p.created_by === user.email) : [];
  const stats = computeStats(myEntries, myPosts);
  const totalXp = computeTotalXp(stats);
  const { level, percent } = getXpProgress(totalXp);
  const rank = getRankForLevel(level);

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

      {/* User XP Footer */}
      <div className="p-4 border-t border-sidebar-border">
        {user ? (
          <Link to="/profile" className="block px-3 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${rank.bg} ${rank.color}`}>
                {(user.full_name || "A")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user.full_name}</p>
                <p className={`text-[10px] font-medium ${rank.color}`}>Nv.{level} · {rank.title}</p>
              </div>
            </div>
            {/* Mini XP bar */}
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 text-right">{percent}% para Nv.{level + 1}</p>
          </Link>
        ) : (
          <div className="px-3 py-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
            <p className="font-medium text-secondary-foreground mb-1">OtakuHub v1.0</p>
            <p>Sua comunidade anime & mangá</p>
          </div>
        )}
      </div>
    </aside>
  );
}