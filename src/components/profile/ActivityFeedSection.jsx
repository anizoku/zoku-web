import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Play, BookOpen, Calendar, MessageCircle, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const activityIcons = {
  watch_together_created: Play,
  list_commented: MessageCircle,
  event_invited: Calendar,
  started_watching_together: Users,
  friend_added: Zap,
};

const activityColors = {
  watch_together_created: "text-chart-2",
  list_commented: "text-chart-3",
  event_invited: "text-chart-5",
  started_watching_together: "text-primary",
  friend_added: "text-chart-4",
};

export default function ActivityFeedSection({ userEmail, friends }) {
  const friendEmails = friends.map(f => f.email);

  const { data: activities } = useQuery({
    queryKey: ["activity-feed", userEmail],
    queryFn: () => base44.entities.ActivityFeed.list("-created_date", 30),
    initialData: [],
  });

  // Show activities involving this user or their friends
  const relevant = activities.filter(a =>
    a.actor_email === userEmail ||
    a.target_email === userEmail ||
    friendEmails.includes(a.actor_email) ||
    friendEmails.includes(a.target_email)
  );

  if (relevant.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Nenhuma atividade recente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {relevant.map(a => {
        const Icon = activityIcons[a.activity_type] || Zap;
        const color = activityColors[a.activity_type] || "text-muted-foreground";
        const timeAgo = a.created_date
          ? formatDistanceToNow(new Date(a.created_date), { addSuffix: true, locale: ptBR })
          : "";
        return (
          <div key={a.id} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border/50">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-secondary`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{a.description}</p>
              {a.media_title && (
                <p className="text-xs text-primary/70 mt-0.5">📺 {a.media_title}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}