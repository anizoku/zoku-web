import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { Button } from '../ui/button';
import { useProfileMedia } from './ProfileMedia';
import SupabaseProfileHero from './profile/SupabaseProfileHero';

function ProfileCard({ profile, own = false }) {
  const media = useProfileMedia(profile);
  // Shell already supplies horizontal padding; avoid doubling the legacy gutters.
  return <div className="max-w-5xl mx-auto space-y-6">
    <SupabaseProfileHero profile={profile} media={media} own={own} />
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
