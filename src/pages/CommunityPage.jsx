import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PostCard from "@/components/feed/PostCard";

const categoryColors = {
  anime: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  manga: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  theories: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  news: "bg-primary/15 text-primary border-primary/20",
  reviews: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  general: "bg-secondary text-secondary-foreground border-border",
};
const categoryLabels = {
  anime: "Anime", manga: "Mangá", theories: "Teorias",
  news: "Notícias", reviews: "Reviews", general: "Geral",
};

const postTypeLabels = {
  general: "Geral", discussion: "Discussão", review: "Review",
  reaction: "Reação", theory: "Teoria",
};

function CreateCommunityPost({ communityId, user, onCreated }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("general");

  const createMutation = useMutation({
    mutationFn: async () => {
      const profile = await base44.entities.UserProfile.filter({ user_email: user.email }).catch(() => []);
      return base44.entities.Post.create({
        content: content.trim(),
        post_type: postType,
        community_id: communityId,
        author_name: user.full_name || user.email,
        author_avatar: profile[0]?.avatar_url || "",
        likes_count: 0,
        comments_count: 0,
        liked_by: [],
      });
    },
    onSuccess: () => {
      setContent("");
      setPostType("general");
      setOpen(false);
      onCreated();
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-card border border-border rounded-xl p-4 text-left text-sm text-muted-foreground hover:border-primary/30 transition-colors flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
          {(user?.full_name || "A")[0].toUpperCase()}
        </div>
        <span>Escreva algo na comunidade...</span>
        <Plus className="w-4 h-4 ml-auto shrink-0" />
      </button>
    );
  }

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
      <Select value={postType} onValueChange={setPostType}>
        <SelectTrigger className="bg-secondary border-none w-40 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(postTypeLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        placeholder="O que você está pensando?"
        value={content}
        onChange={e => setContent(e.target.value)}
        className="bg-secondary border-none text-sm resize-none h-24"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 text-xs">
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={!content.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Publicar
        </Button>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: communities } = useQuery({
    queryKey: ["communities"],
    queryFn: () => base44.entities.Community.list("-members_count", 50),
    initialData: [],
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["community-posts", communityId],
    queryFn: () => base44.entities.Post.filter({ community_id: communityId }, "-created_date", 50),
    initialData: [],
    enabled: !!communityId,
  });

  const community = communities.find(c => c.id === communityId);

  if (!community && communities.length > 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Comunidade não encontrada.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/communities")}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      {/* Back */}
      <button
        onClick={() => navigate("/communities")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Comunidades
      </button>

      {/* Community header */}
      {community && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="font-space font-bold text-2xl text-primary">{community.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-space font-bold text-xl text-foreground">{community.name}</h1>
                <Badge variant="outline" className={`text-[10px] ${categoryColors[community.category] || ""}`}>
                  {categoryLabels[community.category] || community.category}
                </Badge>
              </div>
              {community.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">{community.description}</p>
              )}
              {community.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {community.tags.map(t => (
                    <span key={t} className="text-[10px] bg-secondary text-muted-foreground rounded-full px-2 py-0.5">#{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{community.members_count || 0} membros</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create post */}
      {user && (
        <div className="mb-5">
          <CreateCommunityPost
            communityId={communityId}
            user={user}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["community-posts", communityId] })}
          />
        </div>
      )}

      {/* Posts feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma publicação ainda nesta comunidade.</p>
          <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a postar!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userEmail={user?.email}
              userRole={user?.role}
            />
          ))}
        </div>
      )}
    </div>
  );
}