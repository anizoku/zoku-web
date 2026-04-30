import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, ImagePlus } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { computeStats, computeTotalXp, getXpProgress } from "@/lib/xpSystem";

export default function CreatePostCard({ user }) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("general");
  const [isPosting, setIsPosting] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["sidebar-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 200),
    initialData: [],
  });
  const { data: posts } = useQuery({
    queryKey: ["sidebar-posts"],
    queryFn: () => base44.entities.Post.list("-created_date", 50),
    initialData: [],
  });
  const myEntries = user ? entries.filter((e) => e.created_by === user.email) : [];
  const myPosts = user ? posts.filter((p) => p.created_by === user.email) : [];
  const stats = computeStats(myEntries, myPosts);
  const totalXp = computeTotalXp(stats);
  const { level } = getXpProgress(totalXp);

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    await base44.entities.Post.create({
      content,
      post_type: postType,
      author_name: user?.full_name || "Anônimo",
      author_avatar: user?.avatar_url || "",
      author_level: level,
      likes_count: 0,
      comments_count: 0,
      liked_by: [],
    });
    setContent("");
    setPostType("general");
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    setIsPosting(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-primary font-bold text-sm">
            {(user?.full_name || "A")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="O que você está assistindo? Compartilhe sua opinião..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] bg-secondary border-none resize-none text-sm placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="reaction">Reação</SelectItem>
                  <SelectItem value="theory">Teoria</SelectItem>
                  <SelectItem value="discussion">Discussão</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <ImagePlus className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={handlePost}
              disabled={!content.trim() || isPosting}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Postar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}