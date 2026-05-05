import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Image, Loader2, X } from "lucide-react";

export default function AdminImageEditor({ userProfile, user }) {
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(userProfile.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
    },
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess: (url) => {
        updateProfileMutation.mutate({ avatar_url: url }, {
          onSuccess: () => {
            setAvatarDialogOpen(false);
            avatarInputRef.current.value = "";
          },
        });
      },
    });
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess: (url) => {
        updateProfileMutation.mutate({ banner_url: url }, {
          onSuccess: () => {
            setBannerDialogOpen(false);
            bannerInputRef.current.value = "";
          },
        });
      },
    });
  };

  const isLoading = uploadMutation.isPending || updateProfileMutation.isPending;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
        <Image className="w-5 h-5 text-primary" />
        Imagens de Perfil
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Avatar */}
        <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
          <DialogTrigger asChild>
            <button className="group relative block overflow-hidden rounded-xl border-2 border-border hover:border-primary/40 transition-all cursor-pointer h-40">
              <div className="w-full h-full bg-secondary/40 flex items-center justify-center">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Image className="w-8 h-8 opacity-40" />
                    <p className="text-xs">Foto de Perfil</p>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-medium">Clique para alterar</span>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar Foto de Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg hover:border-primary/40 transition-colors">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="avatar-input"
                />
                <label
                  htmlFor="avatar-input"
                  className="cursor-pointer text-center w-full"
                >
                  <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG até 5MB</p>
                </label>
              </div>
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Banner */}
        <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
          <DialogTrigger asChild>
            <button className="group relative block overflow-hidden rounded-xl border-2 border-border hover:border-primary/40 transition-all cursor-pointer h-40">
              <div className="w-full h-full bg-gradient-to-r from-primary/20 via-chart-2/10 to-chart-3/10">
                {userProfile?.banner_url ? (
                  <img src={userProfile.banner_url} alt="banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground h-full">
                    <div className="flex flex-col items-center gap-2">
                      <Image className="w-8 h-8 opacity-40" />
                      <p className="text-xs">Banner</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-medium">Clique para alterar</span>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar Banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg hover:border-primary/40 transition-colors">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="banner-input"
                />
                <label
                  htmlFor="banner-input"
                  className="cursor-pointer text-center w-full"
                >
                  <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG até 5MB</p>
                </label>
              </div>
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}