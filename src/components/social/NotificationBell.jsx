import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, UserPlus, Heart, MessageCircle, Calendar, List, CheckCircle, Tv, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { getNotificationRoute } from "@/lib/notificationRoutes";

const typeIcons = {
  friend_request: UserPlus,
  friend_accepted: CheckCircle,
  post_liked: Heart,
  post_commented: MessageCircle,
  event_invite: Calendar,
  event_reminder: Calendar,
  list_update: List,
  watch_together_invite: Tv,
  watch_together_near_5: Tv,
  watch_together_near_1: Tv,
  direct_message: MessageCircle,
};

const typeColors = {
  friend_request: "text-chart-2",
  friend_accepted: "text-primary",
  post_liked: "text-destructive",
  post_commented: "text-chart-3",
  event_invite: "text-chart-5",
  event_reminder: "text-chart-4",
  list_update: "text-chart-2",
  watch_together_invite: "text-primary",
  watch_together_near_5: "text-chart-4",
  watch_together_near_1: "text-destructive",
  direct_message: "text-chart-3",
};

export default function NotificationBell({ userEmail }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: userEmail }, "-created_date", 20),
    enabled: !!userEmail,
    initialData: [],
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    // Optimistic update
    queryClient.setQueryData(["notifications"], (old = []) =>
      old.map(x => ({ ...x, is_read: true }))
    );
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
  };

  async function handleNotifClick(n) {
    if (!n.is_read) {
      // Optimistic update — counter drops immediately
      queryClient.setQueryData(["notifications"], (old = []) =>
        old.map(x => x.id === n.id ? { ...x, is_read: true } : x)
      );
      base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
    }
    const route = getNotificationRoute(n);
    if (route) navigate(route);
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={markAllRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-muted-foreground text-xs text-center py-8">Nenhuma notificação</p>
          )}
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Bell;
            const color = typeColors[n.type] || "text-muted-foreground";
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                onClick={() => handleNotifClick(n)}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug">{n.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {n.from_email && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/u/${n.from_email}`); }}
                        className="text-[10px] text-primary/70 hover:text-primary transition-colors font-medium"
                      >
                        {n.from_name || n.from_email}
                      </button>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {n.created_date ? new Date(n.created_date).toLocaleDateString("pt-BR") : ""}
                    </p>
                  </div>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}