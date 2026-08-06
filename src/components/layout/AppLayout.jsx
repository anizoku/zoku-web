import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";
import FloatingChat from "@/components/chat/FloatingChat";
import Breadcrumbs from "./Breadcrumbs";
import { useAutoImageRefresh } from "@/hooks/useAutoImageRefresh";
import PushPermissionPrompt from "@/components/pwa/PushPermissionPrompt";
import { base44 } from "@/api/base44Client";

export default function AppLayout() {
  // Auto-sync background a cada 6 horas
  useEffect(() => {
    const lastAutoSync = sessionStorage.getItem("zoku_last_auto_sync");
    const now = Date.now();
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    if (!lastAutoSync || now - parseInt(lastAutoSync) > SIX_HOURS) {
      sessionStorage.setItem("zoku_last_auto_sync", now.toString());

      setTimeout(async () => {
        try {
          const { syncCurrentlyAiring, discoverNewSeason } = await import("@/lib/catalogAutoSync");
          await syncCurrentlyAiring();
          await discoverNewSeason();
          // Refresh silencioso
          const { useCatalog } = await import("@/contexts/CatalogContext");
        } catch (e) {
          console.warn("Auto-sync falhou:", e);
        }
      }, 5000);
    }
  }, []);
  useAutoImageRefresh();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const sidebarWidth = sidebarCollapsed ? "lg:pl-16" : "lg:pl-56";

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarWidth}`}>
        <TopBar sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <FloatingChat />
      <PushPermissionPrompt user={currentUser} />
    </div>
  );
}