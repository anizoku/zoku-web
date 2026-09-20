import { useState } from 'react';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { Button } from '../ui/button';
import CropImageModal from '../profile/CropImageModal';
import { MEDIA, profileErrorMessage } from '../../lib/supabaseProfileService';

export default function ProfilePhotos({ profile, media }) {
  const { mutateProfile } = useSupabaseAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [crop, setCrop] = useState(null);
  const [saved, setSaved] = useState('');
  async function run(operation, ...args) {
    if (busy) return;
    setBusy(true); setError(''); setSaved('');
    try { await mutateProfile(operation, ...args); setSaved('Foto atualizada.'); }
    catch (err) { setError(profileErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <section className="bg-card border border-border rounded-xl p-5 space-y-4">
    <h2 className="font-space font-semibold text-lg">Fotos do perfil</h2>
    <p className="text-sm text-muted-foreground">As alterações de fotos são salvas imediatamente.</p>
    <div className="grid sm:grid-cols-2 gap-5">{['avatar', 'banner'].map((kind) => {
      const title = kind === 'avatar' ? 'Foto de perfil' : 'Banner';
      const path = profile[`${kind}_url`];
      return <div key={kind} className="space-y-3">
        <label className="block text-sm">{title}<input className="block w-full mt-2 text-sm" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run('upload', kind, file); }} /></label>
        <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. Até {MEDIA[kind].maxBytes / 1024 / 1024} MB.</p>
        {path && <div className="flex gap-2"><Button variant="outline" size="sm" disabled={busy || !media[kind]} onClick={() => setCrop({ kind, path, url: media[kind] })}>Ajustar {kind === 'avatar' ? 'foto' : 'banner'}</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => void run('remove', kind)}>Remover {kind === 'avatar' ? 'foto' : 'banner'}</Button></div>}
      </div>;
    })}</div>
    {busy && <p role="status">Salvando foto…</p>}{saved && <p role="status">{saved}</p>}{error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    {crop && <CropImageModal open onClose={() => setCrop(null)} shape={crop.kind === 'avatar' ? 'circle' : 'banner'} imageUrl={crop.url} onConfirm={(values) => void run('crop', crop.kind, crop.path, values)} />}
  </section>;
}
