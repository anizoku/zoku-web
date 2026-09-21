import { useState } from 'react';
import { Edit2, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { PROFILE_LINKS, profileErrorMessage, profilePayload } from '../../lib/supabaseProfileService';
import ProfilePhotos from './ProfilePhotos';

function Editor({ profile, media, close, busy, setBusy }) {
  const { mutateProfile } = useSupabaseAuth();
  const [form, setForm] = useState(() => ({
    username: profile.username || '', display_name: profile.display_name || '', bio: profile.bio || '',
    country: profile.country || '', preferred_language: profile.preferred_language || 'pt', links: { ...profile.links },
    favoritesText: (profile.favorite_animes || []).join('\n'),
    profile_visibility: profile.profile_visibility || 'public', list_visibility: profile.list_visibility || 'public',
  }));
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
    <fieldset disabled={busy}>
      <Tabs defaultValue="info">
        <TabsList aria-label="Editar perfil" className="bg-secondary w-full">
          {[['info', 'Info'], ['media', 'Fotos'], ['links', 'Links'], ['privacy', 'Privacidade']].map(([value, label]) =>
            <TabsTrigger key={value} value={value} disabled={busy} className="flex-1 text-xs px-2">{label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="info" className="space-y-3 pt-3">
          <label className="block text-xs text-muted-foreground">Nome de exibição<Input className="bg-secondary border-none mt-1" value={form.display_name} onChange={(e) => set('display_name', e.target.value)} maxLength={50} required /></label>
          <label className="block text-xs text-muted-foreground">Nome de usuário<Input className="bg-secondary border-none mt-1" value={form.username} onChange={(e) => set('username', e.target.value)} minLength={3} maxLength={24} required /></label>
          <label className="block text-xs text-muted-foreground">Bio<Textarea className="bg-secondary border-none resize-none h-20 text-sm mt-1" placeholder="Fale sobre você..." value={form.bio} onChange={(e) => set('bio', e.target.value)} maxLength={300} /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs text-muted-foreground">País (duas letras)<Input className="bg-secondary border-none mt-1" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="BR" maxLength={2} /></label>
            <label className="block text-xs text-muted-foreground">Idioma<select className="block w-full bg-secondary text-foreground rounded-md h-9 px-2 mt-1 text-sm" value={form.preferred_language} onChange={(e) => set('preferred_language', e.target.value)}><option value="pt">Português</option><option value="en">English</option></select></label>
          </div>
          <label className="block text-xs text-muted-foreground">Animes favoritos (um por linha)<Textarea className="bg-secondary border-none text-sm mt-1" value={form.favoritesText} onChange={(e) => set('favoritesText', e.target.value)} /></label>
        </TabsContent>
        <TabsContent value="media" className="pt-3">
          {/* Media saves immediately through its existing operations, independently
              of the text draft. Block closing/tab changes while either save runs. */}
          <ProfilePhotos profile={profile} media={media} disabled={busy} onBusyChange={setBusy} />
        </TabsContent>
        <TabsContent value="links" className="space-y-3 pt-3">
          {PROFILE_LINKS.map((key) => <label key={key} className="block text-xs text-muted-foreground capitalize">{key === 'x' ? 'X / Twitter' : key}<Input type="url" className="bg-secondary border-none mt-1" placeholder="https://" value={form.links[key] || ''} onChange={(e) => set('links', { ...form.links, [key]: e.target.value })} maxLength={300} /></label>)}
        </TabsContent>
        <TabsContent value="privacy" className="space-y-3 pt-3">
          {[['profile_visibility', 'Quem pode ver seu perfil'], ['list_visibility', 'Quem pode ver sua lista']].map(([key, label]) => <label key={key} className="block text-xs text-muted-foreground">{label}<select className="block w-full bg-secondary text-foreground rounded-md h-9 px-2 mt-1 text-sm" value={form[key]} onChange={(e) => set(key, e.target.value)}><option value="public">Todos</option><option value="friends">Amigos</option><option value="private">Somente eu</option></select></label>)}
          <p className="text-xs text-muted-foreground">Escolha quem pode acessar seu perfil e sua lista.</p>
        </TabsContent>
      </Tabs>
    </fieldset>
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    <div className="flex gap-2 pt-2"><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancelar</Button><Button type="submit" className="flex-1 gap-2" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{busy ? 'Salvando…' : 'Salvar perfil'}</Button></div>
  </form>;
}

export default function EditProfileDialog({ profile, media }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2 border-border text-muted-foreground"><Edit2 className="w-3.5 h-3.5" />Editar perfil</Button></DialogTrigger>
    <DialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle className="font-space">Editar perfil</DialogTitle><DialogDescription>Atualize suas informações, fotos e preferências de privacidade.</DialogDescription></DialogHeader>
      {open && <Editor key={profile.id} profile={profile} media={media} busy={busy} setBusy={setBusy} close={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}
