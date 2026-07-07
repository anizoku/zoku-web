import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/social/NotificationBell";
import UserMenuButton from "@/components/layout/UserMenuButton";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { useSiteConfig } from "@/hooks/useSiteConfig";

export default function TopBar() {
  const [userEmail, setUserEmail] = useState(null);
  const { logo_compact_url: LOGO_ICON, logo_full_url: LOGO_HORIZONTAL } = useSiteConfig();

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u.email)).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 shrink-0">
          <img src={LOGO_ICON} alt="ZOKU" className="w-8 h-8 rounded-lg object-contain" />
          <img src={LOGO_HORIZONTAL} alt="ZOKU" className="h-6 object-contain" />
        </Link>

        {/* Search */}
        <div className="flex-1 min-w-0">
          <GlobalSearchBar />
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