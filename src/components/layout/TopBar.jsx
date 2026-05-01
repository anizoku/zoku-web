import { useState, useEffect } from "react";
import { Search, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/social/NotificationBell";

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u.email)).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-4 px-4 lg:px-6 h-14">
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-space font-bold text-lg">
            Otaku<span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-auto lg:mx-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar animes, mangás, discussões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-none h-9 text-sm placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center gap-2">
          <NotificationBell userEmail={userEmail} />
        </div>
      </div>
    </header>
  );
}