import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Tv, Film, BookOpen, List, MessageCircle, Clapperboard } from "lucide-react";
import MobileChatDrawer from "@/components/chat/MobileChatDrawer";

const mobileItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Tv, label: "Animes", path: "/animes" },
  { icon: Film, label: "Filmes", path: "/films" },
  { icon: Clapperboard, label: "Live Action", path: "/series" },
  { icon: BookOpen, label: "Mangás", path: "/mangas" },
];

export default function MobileNav() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around py-2 px-1">
          {mobileItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
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