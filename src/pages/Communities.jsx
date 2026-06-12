import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Tag, X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import CommunityAvatar from "@/components/community/CommunityAvatar";

const fallbackCommunities = [
  { id: "f1", name: "Shonen Lovers", description: "Discussões sobre os melhores shonens de todos os tempos", members_count: 12400, category: "anime" },
  { id: "f2", name: "Manga Readers", description: "Para quem prefere ler antes de assistir", members_count: 8700, category: "manga" },
  { id: "f3", name: "Teoria Central", description: "Teorias e especulações sobre as séries mais populares", members_count: 5300, category: "theories" },
  { id: "f4", name: "Anime News", description: "Fique por dentro das últimas novidades do mundo anime", members_count: 21000, category: "news" },
  { id: "f5", name: "Reviews & Críticas", description: "Compartilhe suas análises detalhadas", members_count: 3200, category: "reviews" },
  { id: "f6", name: "Otaku Geral", description: "Tudo sobre cultura otaku, cosplay, eventos e mais", members_count: 15600, category: "general" },
];

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

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n;
}

function CreateCommunityDialog({ onCreate, userEmail }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    setUploadingAvatar(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t) => setTags(tags.filter(x => x !== t));

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description,
      category,
      tags,
      members_count: 1,
      creator_email: userEmail || "",
      avatar_url: avatarUrl,
      members: userEmail ? [userEmail] : [],
    });
    setName(""); setDescription(""); setCategory("general"); setTags([]); setTagInput(""); setAvatarUrl("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Criar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-space">Criar Comunidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-space font-bold text-2xl text-primary">{name ? name[0].toUpperCase() : "?"}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <span className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/10 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingAvatar ? "Enviando..." : "Foto da comunidade"}
                </span>
              </label>
              {avatarUrl && (
                <button onClick={() => setAvatarUrl("")} className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left">
                  Remover
                </button>
              )}
            </div>
          </div>

          <Input placeholder="Título da comunidade" value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-none" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Descrição da comunidade..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-secondary border-none resize-none h-24"
          />
          <div>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="bg-secondary border-none"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag} className="border-primary/20 text-primary hover:bg-primary/10 shrink-0">
                <Tag className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                    {t}
                    <button onClick={() => removeTag(t)}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim() || uploadingAvatar} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Criar Comunidade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Communities() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: communities } = useQuery({
    queryKey: ["communities"],
    queryFn: () => base44.entities.Community.list("-members_count", 50),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Community.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities"] }),
  });

  const isFallback = (id) => id?.startsWith("f");
  // Show real communities or fallback placeholder data when empty
  const displayCommunities = communities.length > 0 ? communities : fallbackCommunities;
  const isShowingFallback = communities.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Comunidades</h1>
            <p className="text-sm text-muted-foreground">Participe de debates e discussões</p>
          </div>
        </div>
        <CreateCommunityDialog onCreate={createMutation.mutate} userEmail={user?.email} />
      </div>

      {isShowingFallback && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground text-center">
          Nenhuma comunidade criada ainda — estas são sugestões de exemplo. Crie a primeira!
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayCommunities.map((community) => (
          <div
            key={community.id}
            onClick={() => !isFallback(community.id) && navigate(`/communities/${community.id}`)}
            className={`bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all group ${!isFallback(community.id) ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-start justify-between mb-3">
              <CommunityAvatar community={community} size="sm" />
              <Badge variant="outline" className={`text-[10px] ${categoryColors[community.category] || ""}`}>
                {categoryLabels[community.category] || community.category}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              {community.name}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              {community.description}
            </p>
            {community.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {community.tags.map(t => (
                  <span key={t} className="text-[10px] bg-secondary text-muted-foreground rounded-full px-2 py-0.5">#{t}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {formatNumber(community.members_count)} membros
              </span>
              {!isFallback(community.id) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-primary/20 text-primary hover:bg-primary/10"
                  onClick={e => { e.stopPropagation(); navigate(`/communities/${community.id}`); }}
                >
                  Entrar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}