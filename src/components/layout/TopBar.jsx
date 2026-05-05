import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/social/NotificationBell";
import UserMenuButton from "@/components/layout/UserMenuButton";

const LOGO_ICON = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/deb2fc23d_LOGOAZ.png";
const LOGO_HORIZONTAL = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/c61581414_aniZoku.png";

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u.email)).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 shrink-0">
          <img src={LOGO_ICON} alt="AniZoku" className="w-8 h-8 rounded-lg object-contain" />
          <img src={LOGO_HORIZONTAL} alt="AniZoku" className="h-6 object-contain" />
        </Link>

        {/* Search */}
        <div className="flex-1 min-w-0">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar animes, mangás, discussões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-none h-9 text-sm placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Actions — fixed to the right */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <NotificationBell userEmail={userEmail} />
          <UserMenuButton />
        </div>
      </div>
    </header>
  );
}