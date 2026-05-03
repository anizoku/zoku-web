import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";
import FloatingChat from "@/components/chat/FloatingChat";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <FloatingChat />
    </div>
  );
}