import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { PROFILE_LINKS, safeProfileLink } from '../../lib/supabaseProfileService';
import { Button } from '../ui/button';
import { ProfileImage, useProfileMedia } from './ProfileMedia';
import EditProfileDialog from './EditProfileDialog';
import ProfilePhotos from './ProfilePhotos';

function ProfileCard({ profile, own = false }) {
  const media = useProfileMedia(profile);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const publicPath = `/u/${profile.id}`;
  return <div className="space-y-6">
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="aspect-[4/1] bg-gradient-to-r from-primary/20 via-chart-2/10 to-chart-3/5 overflow-hidden"><ProfileImage src={media.banner} crop={profile.banner_crop} alt="Banner do perfil" className="w-full h-full object-cover" fallback={null} /></div>
      <div className="px-5 sm:px-7 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4 -mt-12 relative">
          <div className="w-24 h-24 rounded-full border-4 border-card bg-secondary overflow-hidden flex items-center justify-center"><ProfileImage src={media.avatar} crop={profile.avatar_crop} alt={`Foto de ${profile.display_name || profile.username}`} className="w-full h-full object-cover" fallback={<span className="text-3xl font-bold text-primary">{(profile.display_name || profile.username || '?')[0].toUpperCase()}</span>} /></div>
          <div className="flex flex-wrap gap-2">{own && <EditProfileDialog profile={profile} />}<Button variant="outline" onClick={async () => {
            setCopied(false); setCopyError(false);
            try { await navigator.clipboard.writeText(new URL(publicPath, window.location.origin).href); setCopied(true); }
            catch { setCopyError(true); }
          }}>Copiar link</Button></div>
        </div>
        <h1 className="font-space text-2xl font-bold mt-4">{profile.display_name || profile.username}</h1>
        <p className="text-primary text-sm">@{profile.username}</p>
        {profile.country && <p className="text-muted-foreground text-sm mt-2">{profile.country}</p>}
        {profile.bio && <p className="mt-4 whitespace-pre-wrap break-words">{profile.bio}</p>}
        <div className="flex flex-wrap gap-4 mt-4">{PROFILE_LINKS.map((key) => { const href = safeProfileLink(profile.links?.[key]); return href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{key === 'x' ? 'X / Twitter' : key}</a> : null; })}</div>
        {own && <p className="text-muted-foreground text-sm mt-4">Visibilidade: {{ public: 'todos', friends: 'amigos', private: 'somente você' }[profile.profile_visibility]}. <Link className="text-primary underline" to={publicPath}>Abrir página compartilhável</Link></p>}
        {copied && <p role="status" className="text-sm mt-3">Link copiado. O acesso respeita a privacidade do perfil.</p>}
        {copyError && <p role="alert" className="text-sm mt-3">Não foi possível copiar. <Link to={publicPath} className="underline">Abra o perfil para compartilhar o endereço.</Link></p>}
        {media.error && <div className="mt-4 text-sm"><p role="alert">Não foi possível carregar uma das fotos.</p><Button size="sm" variant="ghost" onClick={media.retry}>Tentar carregar fotos novamente</Button></div>}
      </div>
    </section>
    <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-space font-semibold text-lg mb-3">Animes favoritos</h2>{profile.favorite_animes?.length ? <ul className="flex flex-wrap gap-2">{profile.favorite_animes.map((title, index) => <li key={`${index}-${title}`} className="bg-secondary rounded-full px-3 py-1 text-sm break-words max-w-full">{title}</li>)}</ul> : <p className="text-muted-foreground text-sm">Nenhum favorito adicionado.</p>}</section>
    {own && <ProfilePhotos profile={profile} media={media} />}
  </div>;
}

export function OwnProfilePage() {
  const { profile } = useSupabaseAuth();
  return <ProfileCard key={profile.id} profile={profile} own />;
}

export function PublicProfilePage() {
  const { profileId } = useParams();
  const { profileService, user, isLoadingAuth } = useSupabaseAuth();
  const identity = `${user?.id || 'guest'}:${profileId}`;
  const [state, setState] = useState({});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (isLoadingAuth) return;
    let live = true;
    let generation = 0;
    const read = () => {
      const ticket = ++generation;
      profileService.publicProfile(profileId).then((profile) => {
        if (live && ticket === generation) setState({ identity, profile });
      }).catch(() => { if (live && ticket === generation) setState({ identity, error: true }); });
    };
    read();
    // Recheck visibility periodically; private data is never retained after denial.
    const interval = setInterval(read, 45000);
    return () => { live = false; clearInterval(interval); };
  }, [profileService, profileId, identity, isLoadingAuth, retry]);
  if (isLoadingAuth || state.identity !== identity) return <p role="status">Carregando perfil…</p>;
  if (state.error) return <section className="space-y-4"><h1 className="text-xl font-bold">Não foi possível carregar o perfil</h1><Button onClick={() => setRetry((v) => v + 1)}>Tentar novamente</Button></section>;
  if (!state.profile) return <section className="space-y-3"><h1 className="text-xl font-bold">Perfil indisponível</h1><p className="text-muted-foreground">O perfil não existe ou não está visível para você.</p><Link to="/" className="text-primary">Voltar ao início</Link></section>;
  return <ProfileCard key={identity} profile={state.profile} />;
}
