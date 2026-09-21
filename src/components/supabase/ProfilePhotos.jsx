import { useId, useState } from 'react';
import { Camera, Crop, Upload, X } from 'lucide-react';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { Button } from '../ui/button';
import CropImageModal from '../profile/CropImageModal';
import { MEDIA, profileErrorMessage } from '../../lib/supabaseProfileService';
import { ProfileImage } from './ProfileMedia';

export default function ProfilePhotos({ profile, media, disabled = false, onBusyChange }) {
  const { mutateProfile } = useSupabaseAuth();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [crop, setCrop] = useState(null);
  const [saved, setSaved] = useState('');
  async function run(operation, ...args) {
    if (busy || disabled) return;
    setBusy(true); setError(''); setSaved('');
    onBusyChange?.(true);
    try { await mutateProfile(operation, ...args); setSaved('Foto atualizada.'); }
    catch (err) { setError(profileErrorMessage(err)); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <section aria-label="Fotos do perfil" className="space-y-4">
    <p className="text-xs text-muted-foreground">As alterações de fotos são salvas imediatamente, mesmo se você cancelar a edição das informações.</p>
    <div className="space-y-4">{['avatar', 'banner'].map((kind) => {
      const title = kind === 'avatar' ? 'Foto de perfil' : 'Banner';
      const path = profile[`${kind}_url`];
      const locked = busy || disabled;
      return <div key={kind} className="space-y-2">
        <label htmlFor={`${inputId}-${kind}`} className="block text-xs text-muted-foreground">{title}</label>
        <div className={`relative group border-2 border-dashed border-border hover:border-primary/50 overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${kind === 'avatar' ? 'w-20 h-20 rounded-full mx-auto' : 'w-full h-24 rounded-xl'}`}>
          <ProfileImage kind={kind} src={media[kind]} crop={profile[`${kind}_crop`]} alt={`Prévia: ${title}`} className="w-full h-full object-cover"
            fallback={<div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground/60"><Upload className="w-5 h-5" /><span className="text-[10px]">Enviar foto</span></div>} />
          <div aria-hidden="true" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center justify-center transition-opacity pointer-events-none"><Camera className="w-5 h-5 text-primary" /></div>
          {/* Native file input stays keyboard accessible; never offer raw Storage URLs. */}
          <input id={`${inputId}-${kind}`} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" type="file" accept="image/jpeg,image/png,image/webp" disabled={locked} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run('upload', kind, file); }} />
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. Até {MEDIA[kind].maxBytes / 1024 / 1024} MB.</p>
        {path && <div className="flex gap-2 flex-wrap"><Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" disabled={locked || !media[kind]} onClick={() => setCrop({ kind, path, url: media[kind] })}><Crop className="w-3 h-3" />Ajustar {kind === 'avatar' ? 'foto' : 'banner'}</Button><Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 text-destructive/70" disabled={locked} onClick={() => void run('remove', kind)}><X className="w-3 h-3" />Remover {kind === 'avatar' ? 'foto' : 'banner'}</Button></div>}
      </div>;
    })}</div>
    {media.error && <Button type="button" variant="ghost" size="sm" disabled={busy || disabled} onClick={media.retry}>Tentar carregar fotos novamente</Button>}
    {busy && <p role="status">Salvando foto…</p>}{saved && <p role="status">{saved}</p>}{error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    {crop && <CropImageModal open onClose={() => setCrop(null)} shape={crop.kind === 'avatar' ? 'circle' : 'banner'} imageUrl={crop.url} onConfirm={(values) => void run('crop', crop.kind, crop.path, values)} />}
  </section>;
}
