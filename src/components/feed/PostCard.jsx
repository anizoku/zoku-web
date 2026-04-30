import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeLabels = {
  general: null,
  review: "Review",
  reaction: "Reação",
  theory: "Teoria",
  discussion: "Discussão",
};

const typeColors = {
  review: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  reaction: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  theory: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  discussion: "bg-primary/15 text-primary border-primary/20",
};

export default function PostCard({ post, userEmail }) {
  const [isLiking, setIsLiking] = useState(false);
  const queryClient = useQueryClient();

  const isLiked = (post.liked_by || []).includes(userEmail);
  const timeAgo = post.created_date
    ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ptBR })
    : "";

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    const likedBy = post.liked_by || [];
    const newLikedBy = isLiked
      ? likedBy.filter((e) => e !== userEmail)
      : [...likedBy, userEmail];

    await base44.entities.Post.update(post.id, {
      liked_by: newLikedBy,
      likes_count: newLikedBy.length,
    });
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    setIsLiking(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:border-border/80 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">
              {(post.author_name || "A")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">{post.author_name || "Anônimo"}</span>
              {typeLabels[post.post_type] && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColors[post.post_type] || ""}`}>
                  {typeLabels[post.post_type]}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <p className="text-sm text-foreground/90 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

      {post.anime_title && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
          🎬 Sobre: <span className="text-foreground font-medium">{post.anime_title}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`gap-1.5 text-xs h-8 ${isLiked ? "text-destructive" : "text-muted-foreground"}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-destructive" : ""}`} />
          {post.likes_count || 0}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          {post.comments_count || 0}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}