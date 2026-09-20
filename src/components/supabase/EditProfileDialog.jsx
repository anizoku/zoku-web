import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { PROFILE_LINKS, profileErrorMessage, profilePayload } from '../../lib/supabaseProfileService';

function Editor({ profile, close }) {
  const { mutateProfile } = useSupabaseAuth();
  const [form, setForm] = useState(() => ({
    username: profile.username || '', display_name: profile.display_name || '', bio: profile.bio || '',
    country: profile.country || '', preferred_language: profile.preferred_language || 'pt', links: { ...profile.links },
    favoritesText: (profile.favorite_animes || []).join('\n'),
    profile_visibility: profile.profile_visibility || 'public', list_visibility: profile.list_visibility || 'public',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    try { profilePayload(form); } catch (err) { setError(err.message); return; }
    setBusy(true);
    try { await mutateProfile('update', form); close(); }
    catch (err) { setError(profileErrorMessage(err)); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm">Nome de exibição<Input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} maxLength={50} required /></label>
      <label className="block text-sm">Nome de usuário<Input value={form.username} onChange={(e) => set('username', e.target.value)} minLength={3} maxLength={24} required /></label>
      <label className="block text-sm">Bio<Textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} maxLength={300} /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">País (duas letras)<Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="BR" maxLength={2} /></label>
        <label className="block text-sm">Idioma<select className="block w-full bg-secondary rounded-md p-2" value={form.preferred_language} onChange={(e) => set('preferred_language', e.target.value)}><option value="pt">Português</option><option value="en">English</option></select></label>
      </div>
      <label className="block text-sm">Animes favoritos (um por linha)<Textarea value={form.favoritesText} onChange={(e) => set('favoritesText', e.target.value)} /></label>
      <fieldset className="space-y-3"><legend className="font-semibold mb-2">Links</legend>{PROFILE_LINKS.map((key) => <label key={key} className="block text-sm capitalize">{key === 'x' ? 'X / Twitter' : key}<Input type="url" placeholder="https://" value={form.links[key] || ''} onChange={(e) => set('links', { ...form.links, [key]: e.target.value })} maxLength={300} /></label>)}</fieldset>
      <fieldset className="space-y-3"><legend className="font-semibold mb-2">Privacidade</legend>{[['profile_visibility', 'Quem pode ver seu perfil'], ['list_visibility', 'Quem pode ver sua lista']].map(([key, label]) => <label key={key} className="block text-sm">{label}<select className="block w-full bg-secondary rounded-md p-2" value={form[key]} onChange={(e) => set(key, e.target.value)}><option value="public">Todos</option><option value="friends">Amigos</option><option value="private">Somente eu</option></select></label>)}<p className="text-xs text-muted-foreground">As permissões de amigos e listas serão usadas quando essas áreas estiverem disponíveis.</p></fieldset>
    </fieldset>
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    <div className="flex gap-3 justify-end"><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</Button></div>
  </form>;
}

export default function EditProfileDialog({ profile }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" onClick={() => setOpen(true)}>Editar perfil</Button><Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-h-[90vh] overflow-y-auto bg-card"><DialogHeader><DialogTitle>Editar perfil</DialogTitle><DialogDescription>Atualize suas informações e preferências de privacidade.</DialogDescription></DialogHeader>
      {open && <Editor key={profile.id} profile={profile} close={() => setOpen(false)} />}
    </DialogContent>
  </Dialog></>;
}
