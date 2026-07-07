import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Pencil, Check, X, Flag } from "lucide-react";
import ReportModal from "@/components/moderation/ReportModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import LevelBadge from "@/components/profile/LevelBadge";
import AchievementBadge from "@/components/profile/AchievementBadge";
import WorkLink from "@/components/media/WorkLink";
import { useNavigate } from "react-router-dom";
import PostComments from "@/components/feed/PostComments";
import { useQuery } from "@tanstack/react-query";

const typeLabels = {
  general: null, review: "Review", reaction: "Reação",
  theory: "Teoria", discussion: "Discussão",
};
const typeColors = {
  review: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  reaction: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  theory: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  discussion: "bg-primary/15 text-primary border-primary/20",
};

export default function PostCard({ post, userEmail, userRole, communityCreatorEmail }) {
  const [isLiking, setIsLiking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showComments, setShowComments] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Load author profile to show achievement badge
  const { data: authorProfiles } = useQuery({
    queryKey: ["profile-by-email", post.created_by],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: post.created_by }),
    enabled: !!post.created_by,
    initialData: [],
    staleTime: 60000,
  });
  const authorProfile = authorProfiles?.[0];

  const [showReportModal, setShowReportModal] = useState(false);
  const isLiked = (post.liked_by || []).includes(userEmail);
  const isOwner = post.created_by === userEmail;
  const isAdmin = userRole === "admin";
  const isCommunityCreator = communityCreatorEmail && communityCreatorEmail === userEmail;
  const canModify = isOwner || isAdmin || isCommunityCreator;
  const canReport = !!userEmail && !isOwner;

  const timeAgo = post.created_date
    ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ptBR })
    : "";

  const invalidatePosts = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    if (post.community_id) {
      queryClient.invalidateQueries({ queryKey: ["community-posts", post.community_id] });
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    const likedBy = post.liked_by || [];
    const newLikedBy = isLiked ? likedBy.filter(e => e !== userEmail) : [...likedBy, userEmail];
    await base44.entities.Post.update(post.id, { liked_by: newLikedBy, likes_count: newLikedBy.length });
    invalidatePosts();
    setIsLiking(false);
  };

  const handleDelete = async () => {
    await base44.entities.Post.delete(post.id);
    invalidatePosts();
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    await base44.entities.Post.update(post.id, { content: editContent.trim() });
    invalidatePosts();
    setEditing(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    if (navigator.share) {
      navigator.share({ title: "OtakuHub", text: post.content, url }).catch(() => {});
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:border-border/80 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => post.created_by && navigate(`/u/${post.created_by}`)}
            className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:opacity-80 transition-opacity shrink-0">
            {post.author_avatar
              ? <img src={post.author_avatar} className="w-full h-full rounded-full object-cover" />
              : <span className="text-primary font-bold text-sm">{(post.author_name || "A")[0].toUpperCase()}</span>
            }
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => post.created_by && navigate(`/u/${post.created_by}`)}
                className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                {post.author_name || "Anônimo"}
              </button>
              {post.author_level > 0 && <LevelBadge level={post.author_level} size="sm" />}
              {authorProfile?.selected_badge_id && <AchievementBadge badgeId={authorProfile.selected_badge_id} />}
              {typeLabels[post.post_type] && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColors[post.post_type] || ""}`}>
                  {typeLabels[post.post_type]}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>

        {(canModify || canReport) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {canModify && (
                <>
                  <DropdownMenuItem onClick={() => { setEditing(true); setEditContent(post.content); }} className="gap-2 text-sm cursor-pointer">
                    <Pencil className="w-4 h-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="gap-2 text-sm text-destructive cursor-pointer focus:text-destructive">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </DropdownMenuItem>
                </>
              )}
              {canReport && (
                <DropdownMenuItem onClick={() => setShowReportModal(true)} className="gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Flag className="w-4 h-4" /> Reportar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <ReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          contentType="post"
          contentId={post.id}
          contentPreview={post.content}
          authorEmail={post.created_by}
          userEmail={userEmail}
        />
      </div>

      {/* Content */}
      {editing ? (
        <div className="mb-3 space-y-2">
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="bg-secondary border-none text-sm resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEdit} className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
              <Check className="w-3 h-3" /> Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs gap-1">
              <X className="w-3 h-3" /> Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>
      )}

      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="w-full max-h-96 object-cover rounded-lg border border-border mb-3"
          loading="lazy"
        />
      )}

      {post.anime_title && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
          🎬 Sobre: <WorkLink title={post.anime_title} className="text-foreground font-medium hover:text-primary transition-colors" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={handleLike}
          className={`gap-1.5 text-xs h-8 ${isLiked ? "text-destructive" : "text-muted-foreground"}`}>
          <Heart className={`w-4 h-4 ${isLiked ? "fill-destructive" : ""}`} />
          {post.likes_count || 0}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)}
          className="gap-1.5 text-xs h-8 text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          {post.comments_count || 0}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleShare}
          className="gap-1.5 text-xs h-8 text-muted-foreground">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Comments section */}
      {showComments && (
        <PostComments postId={post.id} userEmail={userEmail} />
      )}
    </div>
  );
}