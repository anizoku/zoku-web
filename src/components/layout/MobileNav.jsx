import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Library, MessageCircle, Trophy, Sparkles } from "lucide-react";
import MobileChatDrawer from "@/components/chat/MobileChatDrawer";
import { scrollMemory } from "@/lib/scrollMemory";

const mobileItems = [
  { icon: Home, label: "Home", path: "/", reset: true },
  { icon: Library, label: "Obras", path: "/obras" },
  { icon: Trophy, label: "Ranking", path: "/ranking" },
  { icon: Sparkles, label: "Para você", path: "/recomendacoes" },
];

export default function MobileNav() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around py-2 px-1">
          {mobileItems.map((item) => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={item.reset ? () => scrollMemory.requestReset() : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors flex-1
                  ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Chat button */}
          <button
            onClick={() => setChatOpen(true)}
            className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors flex-1 text-primary"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Chat</span>
          </button>
        </div>
      </nav>

      <MobileChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}