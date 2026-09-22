import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useProfileMedia } from '../ProfileMedia';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import SupabaseSidebar from './SupabaseSidebar';
import SupabaseTopBar from './SupabaseTopBar';
import SupabaseMobileNav from './SupabaseMobileNav';
import SupabaseChatProvider from '../chat/SupabaseChatProvider';
import SupabaseChatOverlay from '../chat/SupabaseChatOverlay';

export default function SupabaseAppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { profile } = useSupabaseAuth();
  // Sign the avatar once for both shell surfaces through existing private storage.
  const { avatar } = useProfileMedia(profile ? { ...profile, banner_url: null } : null);
  const sidebarWidth = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56';

  return <SupabaseChatProvider><div className="flex bg-background text-foreground min-h-screen">
    <SupabaseSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => !value)} avatar={avatar} />
    <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarWidth}`}>
      <SupabaseTopBar avatar={avatar} />
      <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto">
        <Breadcrumbs />
        {/* Current page interiors rely on shell padding; preserve it without the old width cap. */}
        <div className="p-4 lg:p-6"><Outlet /></div>
      </main>
    </div>
    <SupabaseMobileNav />
    <SupabaseChatOverlay />
  </div></SupabaseChatProvider>;
}
