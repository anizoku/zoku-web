import { setupValidation } from './supabaseAuthNavigation.js';

export const PUBLIC_PROFILE_COLUMNS = 'id,username,display_name,bio,avatar_url,avatar_crop,banner_url,banner_crop,country,links,favorite_animes,selected_badge_id,profile_visibility,list_visibility,created_at';
export const PROFILE_LINKS = ['website', 'instagram', 'x', 'tiktok', 'youtube'];
export const MEDIA = {
  avatar: { bucket: 'avatars', maxBytes: 5 * 1024 * 1024 },
  banner: { bucket: 'profile-banners', maxBytes: 10 * 1024 * 1024 },
};
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (code) => { throw Object.assign(new Error(code), { code }); };
const unwrap = async (request) => { const { data, error } = await request; if (error) throw error; return data; };

export function safeProfileLink(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !/\s/.test(value) ? url.href : null;
  } catch { return null; }
}

export function profilePayload(form) {
  const validation = setupValidation({ username: form.username, displayName: form.display_name, preferredLanguage: form.preferred_language });
  if (validation) throw new Error(validation);
  const country = form.country?.trim().toUpperCase() || null;
  if (country && !/^[A-Z]{2}$/.test(country)) throw new Error('Informe o país com duas letras, como BR.');
  if ([...(form.bio || '').trim()].length > 300) throw new Error('A bio deve ter até 300 caracteres.');
  if (![form.profile_visibility, form.list_visibility].every((v) => ['public', 'friends', 'private'].includes(v))) fail('INVALID_VISIBILITY');
  const links = {};
  for (const key of PROFILE_LINKS) {
    const value = form.links?.[key]?.trim();
    if (value) {
      if (value.length > 300 || !safeProfileLink(value)) throw new Error(`Informe um endereço http ou https válido em ${key}.`);
      links[key] = value;
    }
  }
  return {
    username: form.username.trim(), display_name: form.display_name.trim(), bio: form.bio?.trim() || null,
    country, preferred_language: form.preferred_language, links,
    favorite_animes: (form.favoritesText || '').split('\n').map((v) => v.trim()).filter(Boolean),
    profile_visibility: form.profile_visibility, list_visibility: form.list_visibility,
  };
}

export function profileErrorMessage(error) {
  const messages = {
    USERNAME_TAKEN: 'Este nome de usuário já está em uso.',
    SESSION_CHANGED: 'A conta mudou. Reabra o perfil antes de continuar.',
    INVALID_MEDIA: 'Escolha uma imagem JPEG, PNG ou WebP dentro do limite indicado.',
    INVALID_PATH: 'Não foi possível acessar esta imagem.',
    INVALID_CROP: 'O enquadramento não é válido. Tente ajustá-lo novamente.',
    AVATAR_CROP_PATH_MISMATCH: 'A foto mudou. Reabra o ajuste de enquadramento.',
    BANNER_CROP_PATH_MISMATCH: 'O banner mudou. Reabra o ajuste de enquadramento.',
    PROFILE_REFRESH_FAILED: 'A alteração foi salva, mas não foi possível atualizar a tela. Recarregue seu perfil.',
  };
  return messages[error?.code] || messages[error?.message] || 'Não foi possível concluir. Tente novamente.';
}

export function createProfileService(client, currentUserId) {
  const requireOwner = () => { const id = currentUserId(); if (!id) fail('SESSION_CHANGED'); return id; };
  const sameOwner = (id) => { if (currentUserId() !== id) fail('SESSION_CHANGED'); };
  const mediaConfig = (kind) => MEDIA[kind] || fail('INVALID_MEDIA');
  const validPath = (path, owner) => typeof path === 'string' && path.startsWith(`${owner}/`) && !path.includes('..') && !/[\\?#]/.test(path);
  return {
    async publicProfile(id) {
      if (!uuid.test(id || '')) return null;
      return unwrap(client.from('public_profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', id).maybeSingle());
    },
    async update(form) {
      requireOwner();
      return unwrap(client.rpc('update_profile', { p_updates: profilePayload(form) }));
    },
    async signMedia(kind, path, owner) {
      if (!path) return null;
      if (!validPath(path, owner)) fail('INVALID_PATH');
      const data = await unwrap(client.storage.from(mediaConfig(kind).bucket).createSignedUrl(path, 60));
      return data.signedUrl;
    },
    async upload(kind, file) {
      const owner = requireOwner();
      const config = mediaConfig(kind);
      if (!file || !extensions[file.type] || file.size <= 0 || file.size > config.maxBytes) fail('INVALID_MEDIA');
      const path = `${owner}/${crypto.randomUUID()}.${extensions[file.type]}`;
      await unwrap(client.storage.from(config.bucket).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '60' }));
      sameOwner(owner);
      // Do not delete on ambiguous network failure: the RPC may have committed.
      await unwrap(client.rpc(`set_${kind}`, { p_path: path }));
      return path;
    },
    async remove(kind) {
      requireOwner(); mediaConfig(kind);
      // Unselect only. Physical cleanup is deferred to avoid deleting media that
      // another tab has reselected between the RPC and a Storage delete request.
      return unwrap(client.rpc(`remove_${kind}`));
    },
    async crop(kind, path, crop) {
      const owner = requireOwner(); mediaConfig(kind);
      if (!validPath(path, owner)) fail('INVALID_PATH');
      const values = [crop.zoom, crop.offsetXPct, crop.offsetYPct];
      if (!values.every(Number.isFinite) || crop.zoom < 1 || crop.zoom > 10 || Math.abs(crop.offsetXPct) > 100 || Math.abs(crop.offsetYPct) > 100) fail('INVALID_CROP');
      return unwrap(client.rpc('update_profile', { p_updates: {
        [`${kind}_crop`]: { version: 2, zoom: crop.zoom, offsetXPct: crop.offsetXPct, offsetYPct: crop.offsetYPct, imageUrl: path },
      } }));
    },
  };
}
