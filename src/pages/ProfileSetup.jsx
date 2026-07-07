import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, CheckCircle2, XCircle, Loader2, User, Sparkles, Globe } from "lucide-react";
import { MascotDuo } from "@/components/mascots/ZokuMascot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

function validateUsername(v) {
  if (!v) return "Username é obrigatório.";
  if (v.length < 3 || v.length > 20) return "Use entre 3 e 20 caracteres.";
  if (!USERNAME_REGEX.test(v)) return "Use apenas letras, números, underscores e pontos.";
  return null;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [favoriteAnime, setFavoriteAnime] = useState("");
  const [favoriteManga, setFavoriteManga] = useState("");
  const [country, setCountry] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const usernameCheckTimer = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // If already setup, redirect away
      if (u?.profile_setup_completed) {
        navigate("/", { replace: true });
      }
    }).catch(() => {});
  }, [navigate]);

  // Real-time username check
  useEffect(() => {
    const err = validateUsername(username);
    setUsernameError(err || "");
    setUsernameTaken(false);
    if (err || !username) return;

    clearTimeout(usernameCheckTimer.current);
    setCheckingUsername(true);
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ username: username.toLowerCase() });
        const taken = profiles.some(p => p.user_email !== user?.email);
        setUsernameTaken(taken);
        if (taken) setUsernameError("Este username já está em uso.");
      } catch {}
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(usernameCheckTimer.current);
  }, [username, user]);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
    } catch {
      toast.error("Falha ao enviar a foto de perfil.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBannerUrl(file_url);
    } catch {
      toast.error("Falha ao enviar o banner.");
    } finally {
      setUploadingBanner(false);
    }
  }

  const canSubmit =
    !usernameError &&
    !usernameTaken &&
    !checkingUsername &&
    username.length >= 3 &&
    avatarUrl &&
    !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Check if profile already exists
      const existing = await base44.entities.UserProfile.filter({ user_email: user.email });
      const profileData = {
        user_email: user.email,
        username: username.toLowerCase(),
        bio,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        profile_setup_completed: true,
        profile_setup_completed_at: new Date().toISOString(),
        ...(favoriteAnime && { favorite_animes: [favoriteAnime] }),
        ...(favoriteManga && { favorite_mangas: [favoriteManga] }),
        ...(country && { country }),
        ...(preferredLanguage && { preferred_language: preferredLanguage }),
      };

      if (existing.length > 0) {
        await base44.entities.UserProfile.update(existing[0].id, profileData);
      } else {
        await base44.entities.UserProfile.create(profileData);
      }

      // Mark on user entity too
      await base44.auth.updateMe({ profile_setup_completed: true });
      toast.success("Perfil criado com sucesso!");
      window.location.replace("/");
    } catch (err) {
      toast.error("Erro ao salvar o perfil. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Mascots welcome — TODO: substituir pelo SVG final dos mascotes quando o design estiver pronto */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <MascotDuo size={100} />
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-card border border-primary/20 rounded-xl px-3 py-1.5 text-xs text-foreground font-medium whitespace-nowrap shadow-lg -translate-y-full">
              Bem-vindo ao ZOKU! Vamos configurar seu perfil otaku. 🎌
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Passo 1 de 1: Crie seu perfil público
          </div>
          <h1 className="font-space font-bold text-3xl text-foreground mb-2">Configure seu perfil</h1>
          <p className="text-muted-foreground">Escolha como outros fãs de anime vão te ver.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Banner upload */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Banner (opcional)</label>
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="relative w-full h-32 rounded-xl border-2 border-dashed border-border bg-secondary hover:border-primary/50 transition-colors cursor-pointer overflow-hidden group"
            >
              {bannerUrl ? (
                <>
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  {uploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span className="text-xs">{uploadingBanner ? "Enviando..." : "Clique para enviar banner"}</span>
                </div>
              )}
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>

          {/* Avatar upload */}
          <div className="flex items-start gap-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Foto de perfil <span className="text-destructive">*</span></label>
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full border-2 border-dashed border-border bg-secondary hover:border-primary/50 transition-colors cursor-pointer overflow-hidden group shrink-0"
              >
                {avatarUrl ? (
                  <>
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-6 h-6" />}
                    {!uploadingAvatar && <span className="text-[9px] text-center">Enviar foto</span>}
                  </div>
                )}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* Username */}
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Username <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  placeholder="animefan_123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                  className={`pl-8 bg-secondary border ${usernameError ? "border-destructive" : !username ? "border-none" : "border-primary/40"}`}
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!checkingUsername && username.length >= 3 && !usernameError && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                  {!checkingUsername && usernameError && username.length > 0 && (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              {usernameError && username.length > 0 && (
                <p className="text-xs text-destructive mt-1">{usernameError}</p>
              )}
              {!usernameError && username.length >= 3 && !checkingUsername && (
                <p className="text-xs text-primary mt-1">@{username} disponível!</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">3-20 caracteres: letras, números, _ e .</p>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Nome de exibição (opcional)</label>
            <Input
              placeholder="Como devemos te chamar?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
              className="bg-secondary border-none"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Bio (opcional)</label>
            <Textarea
              placeholder="Conta para outros que tipo de fã de anime você é."
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              className="bg-secondary border-none resize-none h-20"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{bio.length}/160</p>
          </div>

          {/* Favorites */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Anime favorito (opcional)</label>
              <Input
                placeholder="Ex: Fullmetal Alchemist"
                value={favoriteAnime}
                onChange={(e) => setFavoriteAnime(e.target.value)}
                className="bg-secondary border-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Mangá favorito (opcional)</label>
              <Input
                placeholder="Ex: Berserk"
                value={favoriteManga}
                onChange={(e) => setFavoriteManga(e.target.value)}
                className="bg-secondary border-none"
              />
            </div>
          </div>

          {/* Country + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">País (opcional)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Ex: Brasil"
                  value={country}
                  onChange={(e) => setCountry(e.target.value.slice(0, 50))}
                  className="bg-secondary border-none pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Idioma preferido (opcional)</label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger className="bg-secondary border-none">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-11 text-base font-semibold gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Criando perfil...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Entrar no ZOKU</>
            )}
          </Button>

          {!avatarUrl && (
            <p className="text-xs text-muted-foreground text-center">
              Envie uma foto de perfil para continuar.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}