import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, Upload, Eye, Loader2, Camera } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function ImageUploader({ label, value, onChange, shape = "banner" }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      <div
        className={`relative cursor-pointer group border-2 border-dashed border-border hover:border-primary/50 rounded-xl overflow-hidden transition-colors ${
          shape === "circle" ? "w-20 h-20 rounded-full mx-auto" : "w-full h-24"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <Upload className="w-5 h-5 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground/60">Clique para enviar</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          {uploading
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <Camera className="w-5 h-5 text-primary" />
          }
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      {value && (
        <div className="flex gap-2 mt-1.5">
          <Input
            placeholder="Ou cole uma URL..."
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-secondary border-none text-xs h-7 flex-1"
          />
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive/70 px-2" onClick={() => onChange("")}>
            Remover
          </Button>
        </div>
      )}
      {!value && (
        <Input
          placeholder="Ou cole uma URL..."
          onChange={e => onChange(e.target.value)}
          className="bg-secondary border-none text-xs h-7 mt-1.5"
        />
      )}
    </div>
  );
}

export default function EditProfileDialog({ user, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "", bio: "", avatar_url: "", banner_url: "",
    twitter: "", instagram: "", website: "",
    list_visibility: "public", profile_visibility: "public",
    favorite_animes: "", favorite_mangas: "",
  });
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 100),
    initialData: [],
  });

  const myProfile = profiles.find(p => p.user_email === user?.email);

  useEffect(() => {
    if (myProfile && open) {
      setForm({
        username: myProfile.username || "",
        bio: myProfile.bio || "",
        avatar_url: myProfile.avatar_url || "",
        banner_url: myProfile.banner_url || "",
        twitter: myProfile.links?.twitter || "",
        instagram: myProfile.links?.instagram || "",
        website: myProfile.links?.website || "",
        list_visibility: myProfile.list_visibility || "public",
        profile_visibility: myProfile.profile_visibility || "public",
        favorite_animes: (myProfile.favorite_animes || []).join(", "),
        favorite_mangas: (myProfile.favorite_mangas || []).join(", "),
      });
    }
  }, [myProfile, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        user_email: user.email,
        username: form.username,
        bio: form.bio,
        avatar_url: form.avatar_url,
        banner_url: form.banner_url,
        links: { twitter: form.twitter, instagram: form.instagram, website: form.website },
        list_visibility: form.list_visibility,
        profile_visibility: form.profile_visibility,
        favorite_animes: form.favorite_animes.split(",").map(s => s.trim()).filter(Boolean),
        favorite_mangas: form.favorite_mangas.split(",").map(s => s.trim()).filter(Boolean),
      };
      return myProfile
        ? base44.entities.UserProfile.update(myProfile.id, data)
        : base44.entities.UserProfile.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      setOpen(false);
      onSaved?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-border text-muted-foreground">
          <Edit2 className="w-3.5 h-3.5" /> Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-space">Editar Perfil</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info">
          <TabsList className="bg-secondary w-full">
            <TabsTrigger value="info" className="flex-1 text-xs">Info</TabsTrigger>
            <TabsTrigger value="media" className="flex-1 text-xs">Fotos</TabsTrigger>
            <TabsTrigger value="links" className="flex-1 text-xs">Links</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 text-xs">Privacidade</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 pt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome de usuário (@handle)</label>
              <Input placeholder="@seuusername" value={form.username} onChange={e => set("username", e.target.value)} className="bg-secondary border-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
              <Textarea placeholder="Fale sobre você..." value={form.bio} onChange={e => set("bio", e.target.value)} className="bg-secondary border-none resize-none h-20 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Animes favoritos (separados por vírgula)</label>
              <Input placeholder="Attack on Titan, Demon Slayer..." value={form.favorite_animes} onChange={e => set("favorite_animes", e.target.value)} className="bg-secondary border-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Mangás favoritos (separados por vírgula)</label>
              <Input placeholder="Berserk, Vagabond..." value={form.favorite_mangas} onChange={e => set("favorite_mangas", e.target.value)} className="bg-secondary border-none" />
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4 pt-3">
            <ImageUploader
              label="Foto de perfil (circular)"
              value={form.avatar_url}
              onChange={v => set("avatar_url", v)}
              shape="circle"
            />
            <ImageUploader
              label="Banner do perfil"
              value={form.banner_url}
              onChange={v => set("banner_url", v)}
              shape="banner"
            />
          </TabsContent>

          <TabsContent value="links" className="space-y-3 pt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Twitter / X</label>
              <Input placeholder="@seutwitter" value={form.twitter} onChange={e => set("twitter", e.target.value)} className="bg-secondary border-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Instagram</label>
              <Input placeholder="@seuinstagram" value={form.instagram} onChange={e => set("instagram", e.target.value)} className="bg-secondary border-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Website</label>
              <Input placeholder="https://seusite.com" value={form.website} onChange={e => set("website", e.target.value)} className="bg-secondary border-none" />
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-3 pt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Eye className="w-3 h-3" /> Visibilidade do Perfil
              </label>
              <Select value={form.profile_visibility} onValueChange={v => set("profile_visibility", v)}>
                <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌐 Público</SelectItem>
                  <SelectItem value="friends">👥 Apenas amigos</SelectItem>
                  <SelectItem value="private">🔒 Privado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Eye className="w-3 h-3" /> Visibilidade da Lista
              </label>
              <Select value={form.list_visibility} onValueChange={v => set("list_visibility", v)}>
                <SelectTrigger className="bg-secondary border-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌐 Pública</SelectItem>
                  <SelectItem value="friends">👥 Apenas amigos</SelectItem>
                  <SelectItem value="private">🔒 Privada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 mt-4"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Perfil
        </Button>
      </DialogContent>
    </Dialog>
  );
}