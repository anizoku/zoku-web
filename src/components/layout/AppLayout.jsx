import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";
import FloatingChat from "@/components/chat/FloatingChat";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? "lg:pl-16" : "lg:pl-56";

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarWidth}`}>
        <TopBar sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <FloatingChat />
    </div>
  );
}