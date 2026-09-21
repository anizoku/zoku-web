import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Instagram, MapPin, Music2, Share2, Twitter, Youtube } from 'lucide-react';
import { PROFILE_LINKS, safeProfileLink } from '../../../lib/supabaseProfileService';
import { Button } from '../../ui/button';
import { ProfileImage } from '../ProfileMedia';
import EditProfileDialog from '../EditProfileDialog';
import SupabaseProfileFavorites from './SupabaseProfileFavorites';

const socialLinks = {
  website: { label: 'Site', icon: Globe },
  instagram: { label: 'Instagram', icon: Instagram },
  x: { label: 'X / Twitter', icon: Twitter },
  tiktok: { label: 'TikTok', icon: Music2 },
  youtube: { label: 'YouTube', icon: Youtube },
};

export default function SupabaseProfileHero({ profile, media, own = false }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const name = profile.display_name || profile.username || 'Usuário';
  const publicPath = `/u/${profile.id}`;

  return <section aria-label="Perfil" className="bg-card rounded-xl border border-border overflow-hidden">
    {/* Match ProfileBanner's responsive geometry, but render only signed media. */}
    <div className="relative overflow-hidden h-32 sm:h-52 bg-gradient-to-r from-primary/20 via-chart-2/10 to-chart-3/5">
      <ProfileImage kind="banner" src={media.banner} crop={profile.banner_crop} alt="Banner do perfil" className="w-full h-full object-cover" fallback={null} />
    </div>
    <div className="px-6 pb-6">
      <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12">
        <div className="relative shrink-0 w-24 h-24 rounded-full border-4 border-card flex items-center justify-center overflow-hidden bg-secondary">
          <ProfileImage src={media.avatar} crop={profile.avatar_crop} alt={`Foto de ${name}`} className="w-full h-full object-cover"
            fallback={<span className="font-bold text-3xl font-space text-primary">{name[0].toUpperCase()}</span>} />
        </div>
        <div className="flex-1 pt-2 sm:pt-12 min-w-0 w-full">
          <h1 className="font-space font-bold text-xl text-foreground leading-tight mb-0.5 break-words [overflow-wrap:anywhere]">{name}</h1>
          {profile.username && <p className="text-sm text-muted-foreground font-medium mb-1 break-words"><span className="text-primary/70">@</span>{profile.username}</p>}
          {profile.bio && <p className="text-sm text-foreground/70 mt-1 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{profile.bio}</p>}
          {profile.country && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="w-3 h-3" />{profile.country}</p>}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {PROFILE_LINKS.map(key => {
              const href = safeProfileLink(profile.links?.[key]);
              if (!href) return null;
              const { label, icon: Icon } = socialLinks[key];
              return <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                <Icon className="w-3 h-3" />{label}
              </a>;
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:pt-12 flex-wrap shrink-0">
          <button aria-label="Copiar link" onClick={async () => {
            setCopied(false); setCopyError(false);
            try { await navigator.clipboard.writeText(new URL(publicPath, window.location.origin).href); setCopied(true); }
            catch { setCopyError(true); }
          }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <Share2 className="w-3.5 h-3.5" /> Compartilhar
          </button>
          {own && <EditProfileDialog profile={profile} media={media} />}
        </div>
      </div>
      {own && <p className="text-muted-foreground text-xs mt-4">
        Visibilidade: {{ public: 'todos', friends: 'amigos', private: 'somente você' }[profile.profile_visibility]}.{' '}
        <Link className="text-primary hover:underline" to={publicPath}>Abrir página compartilhável</Link>
      </p>}
      {copied && <p role="status" className="text-xs text-primary mt-3">Link copiado. O acesso respeita a privacidade do perfil.</p>}
      {copyError && <p role="alert" className="text-sm mt-3">Não foi possível copiar. <Link to={publicPath} className="underline">Abra o perfil para compartilhar o endereço.</Link></p>}
      {media.error && <div className="mt-4 text-sm"><p role="alert">Não foi possível carregar uma das fotos.</p><Button size="sm" variant="ghost" onClick={media.retry}>Tentar carregar fotos novamente</Button></div>}
      {/* XP, badges, statistics and social tabs need separate Supabase modules. */}
      <SupabaseProfileFavorites favorites={profile.favorite_animes} />
    </div>
  </section>;
}
