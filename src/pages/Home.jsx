import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import CreatePostCard from "@/components/feed/CreatePostCard";
import PostCard from "@/components/feed/PostCard";
import TrendingSection from "@/components/home/TrendingSection";
import RecentEpisodesSection from "@/components/home/RecentEpisodesSection";
import ActiveDebatesSection from "@/components/home/ActiveDebatesSection";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => base44.entities.Post.list("-created_date", 20),
    initialData: [],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-7 space-y-4">
          <CreatePostCard user={user} />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">Nenhum post ainda. Seja o primeiro a compartilhar!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} userEmail={user?.email} userRole={user?.role} />
            ))
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <TrendingSection />
          <RecentEpisodesSection />
          <ActiveDebatesSection />
        </div>
      </div>
    </div>
  );
}