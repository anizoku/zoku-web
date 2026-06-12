import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const PROMPT_KEY = "zoku_push_prompt_dismissed";

export default function PushPermissionPrompt({ user }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;

    const dismissed = localStorage.getItem(PROMPT_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < thirtyDays) return;
    }

    // Show 30s after login
    const timer = setTimeout(() => setVisible(true), 30000);
    return () => clearTimeout(timer);
  }, [user?.email]);

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // In a real implementation, use your VAPID public key here
          applicationServerKey: null,
        }).catch(() => null);

        const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        if (profiles[0]) {
          await base44.entities.UserProfile.update(profiles[0].id, {
            push_enabled: true,
            ...(sub && { push_subscription: sub.toJSON() }),
          });
        }
      } catch {}
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-1">Ative as notificações</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Saiba quando seus amigos interagirem com você e quando suas sugestões forem aprovadas.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleEnable} className="h-8 text-xs px-3 flex-1">
                Ativar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs px-3">
                Agora não
              </Button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}