import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Plus, Pencil, Check, X, Upload, UserPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PostCard from "@/components/feed/PostCard";
import CommunityAvatar from "@/components/community/CommunityAvatar";
import MembersSection from "@/components/community/MembersSection";

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

// ── Create post form ──────────────────────────────────────────
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

// ── Edit community panel (creator + admin only) ───────────────
function EditCommunityPanel({ community, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [name, setName]               = useState(community.name);
  const [description, setDescription] = useState(community.description || "");
  const [category, setCategory]       = useState(community.category || "general");
  const [cover_url, setCoverUrl]      = useState(community.cover_url || "");
  const [avatar_url, setAvatarUrl]    = useState(community.avatar_url || "");
  const [tags, setTags]               = useState((community.tags || []).join(", "));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    setUploadingAvatar(false);
  };

  const updateMutation = useMutation({
    mutationFn: () => base44.entities.Community.update(community.id, {
      name: name.trim(),
      description: description.trim(),
      category,
      cover_url: cover_url.trim(),
      avatar_url: avatar_url.trim(),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      onSaved();
      onClose();
    },
  });

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-4 mb-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">Editar comunidade</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Avatar upload */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
          {avatar_url ? (
            <img src={avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <span className="font-space font-bold text-2xl text-primary">{community.name[0]}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <span className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/10 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              {uploadingAvatar ? "Enviando..." : "Foto da comunidade"}
            </span>
          </label>
          {avatar_url && (
            <button onClick={() => setAvatarUrl("")} className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left">
              Remover foto
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nome</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm bg-secondary border-none" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Categoria</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-sm bg-secondary border-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs text-muted-foreground">Descrição</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-secondary border-none text-sm resize-none h-16" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs text-muted-foreground">URL da imagem de capa</label>
          <Input value={cover_url} onChange={e => setCoverUrl(e.target.value)} className="h-8 text-sm bg-secondary border-none" placeholder="https://..." />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs text-muted-foreground">Tags (separadas por vírgula)</label>
          <Input value={tags} onChange={e => setTags(e.target.value)} className="h-8 text-sm bg-secondary border-none" placeholder="shonen, ação, clássico" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-xs">Cancelar</Button>
        <Button
          size="sm"
          disabled={!name.trim() || updateMutation.isPending || uploadingAvatar}
          onClick={() => updateMutation.mutate()}
          className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
        >
          <Check className="w-3 h-3" /> Salvar
        </Button>
      </div>
    </div>
  );
}

// ── Creator info row ──────────────────────────────────────────
function CreatorRow({ creatorEmail }) {
  const navigate = useNavigate();
  const { data: profiles = [] } = useQuery({
    queryKey: ["creator-profile", creatorEmail],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: creatorEmail }),
    enabled: !!creatorEmail,
  });
  const profile = profiles[0];
  const name = profile?.username || creatorEmail?.split("@")[0] || creatorEmail;

  return (
    <button
      onClick={() => creatorEmail && navigate(`/u/${creatorEmail}`)}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-primary">{name[0]?.toUpperCase()}</span>
          </div>
        )}
      </div>
      <span>Criada por <span className="text-foreground font-medium hover:text-primary transition-colors">{name}</span></span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function CommunityPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editingCommunity, setEditingCommunity] = useState(false);
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

  const creatorEmail = community?.creator_email || community?.created_by;
  const isAdmin      = user?.role === "admin";
  const isCreator    = user?.email && creatorEmail && user.email === creatorEmail;
  const canManage    = isAdmin || isCreator;
  const members      = community?.members || [];
  const isMember     = user?.email && members.includes(user.email);

  const joinMutation = useMutation({
    mutationFn: () => base44.entities.Community.update(communityId, {
      members: [...members, user.email],
      members_count: (community.members_count || 0) + 1,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities"] }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => base44.entities.Community.update(communityId, {
      members: members.filter(e => e !== user.email),
      members_count: Math.max(0, (community.members_count || 0) - 1),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities"] }),
  });

  if (!community && communities.length > 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Comunidade não encontrada.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/communities")}>Voltar</Button>
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
        <div className="bg-card rounded-xl border border-border mb-6 overflow-hidden">
          {/* Cover */}
          {community.cover_url && (
            <div className="w-full h-32 overflow-hidden">
              <img src={community.cover_url} alt={community.name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-5">
            <div className="flex items-start gap-4">
              <CommunityAvatar community={community} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-space font-bold text-xl text-foreground">{community.name}</h1>
                    <Badge variant="outline" className={`text-[10px] ${categoryColors[community.category] || ""}`}>
                      {categoryLabels[community.category] || community.category}
                    </Badge>
                    {isCreator && !isAdmin && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Criador</Badge>
                    )}
                    {isAdmin && (
                      <Badge variant="outline" className="text-[10px] bg-chart-4/15 text-chart-4 border-chart-4/20">Admin</Badge>
                    )}
                  </div>
                  {/* Join / Leave */}
                  {user && !isCreator && (
                    isMember ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 gap-1 shrink-0"
                        onClick={() => leaveMutation.mutate()}
                        disabled={leaveMutation.isPending}
                      >
                        <LogOut className="w-3 h-3" /> Sair
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1 shrink-0"
                        onClick={() => joinMutation.mutate()}
                        disabled={joinMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3" /> Participar
                      </Button>
                    )
                  )}
                </div>

                {community.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{community.description}</p>
                )}

                {community.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {community.tags.map(t => (
                      <span key={t} className="text-[10px] bg-secondary text-muted-foreground rounded-full px-2 py-0.5">#{t}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{community.members_count || members.length || 0} membros</span>
                  </div>
                  {creatorEmail && <CreatorRow creatorEmail={creatorEmail} />}
                  {canManage && !editingCommunity && (
                    <button
                      onClick={() => setEditingCommunity(true)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Members visual row */}
            {members.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Membros</p>
                <MembersSection members={members} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit community panel */}
      {editingCommunity && community && (
        <EditCommunityPanel
          community={community}
          onClose={() => setEditingCommunity(false)}
          onSaved={() => setEditingCommunity(false)}
        />
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
              communityCreatorEmail={creatorEmail}
            />
          ))}
        </div>
      )}
    </div>
  );
}