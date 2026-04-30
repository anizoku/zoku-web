import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { User, Tv, BookOpen, Star, Trophy, Calendar, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PostCard from "@/components/feed/PostCard";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entries } = useQuery({
    queryKey: ["profile-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 100),
    initialData: [],
  });

  const { data: posts } = useQuery({
    queryKey: ["profile-posts"],
    queryFn: () => base44.entities.Post.list("-created_date", 10),
    initialData: [],
  });

  const myEntries = entries.filter((e) => e.created_by === user?.email);
  const myPosts = posts.filter((p) => p.created_by === user?.email);

  const stats = {
    watching: myEntries.filter((e) => e.status === "watching").length,
    reading: myEntries.filter((e) => e.status === "reading").length,
    completed: myEntries.filter((e) => e.status === "completed").length,
    totalEntries: myEntries.length,
    totalPosts: myPosts.length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-chart-2/10 to-chart-3/10" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 border-4 border-card flex items-center justify-center">
              <span className="text-primary font-bold text-2xl font-space">
                {(user?.full_name || "A")[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="font-space font-bold text-xl text-foreground">{user?.full_name || "Carregando..."}</h1>
              <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-border text-muted-foreground">
              <Edit2 className="w-3.5 h-3.5" /> Editar Perfil
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Tv, label: "Assistindo", value: stats.watching, color: "text-primary" },
          { icon: BookOpen, label: "Lendo", value: stats.reading, color: "text-chart-2" },
          { icon: Trophy, label: "Concluídos", value: stats.completed, color: "text-chart-4" },
          { icon: Star, label: "Posts", value: stats.totalPosts, color: "text-chart-5" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
            <p className="font-space font-bold text-xl text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <h2 className="font-space font-semibold text-lg text-foreground">Meus Posts</h2>
        {myPosts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhum post publicado ainda</p>
          </div>
        ) : (
          myPosts.map((post) => <PostCard key={post.id} post={post} userEmail={user?.email} />)
        )}
      </div>
    </div>
  );
}