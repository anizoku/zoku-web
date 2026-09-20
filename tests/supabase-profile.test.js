import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileService, profilePayload, PUBLIC_PROFILE_COLUMNS, safeProfileLink } from '../src/lib/supabaseProfileService.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const form = { username: ' test_user ', display_name: ' Name ', bio: ' bio ', country: ' br ', preferred_language: 'pt', links: { website: 'https://example.com', twitter: 'ignored' }, favoritesText: ' One\n\nTwo ', profile_visibility: 'public', list_visibility: 'private', role: 'admin', avatar_url: 'https://evil.test/a.png' };
const ok = (data) => ({ data, error: null });

function fixture() {
  let current = owner;
  const calls = [];
  const bucket = {
    upload: async (...args) => { calls.push(['upload', ...args]); return ok({}); },
    createSignedUrl: async (...args) => { calls.push(['sign', ...args]); return ok({ signedUrl: 'https://storage.test/signed' }); },
  };
  const query = { select(value) { calls.push(['select', value]); return query; }, eq(...args) { calls.push(['eq', ...args]); return query; }, maybeSingle: async () => ok(null) };
  const client = {
    rpc: async (...args) => { calls.push(['rpc', ...args]); return ok({ status: 'UPDATED' }); },
    from: (table) => { calls.push(['from', table]); return query; },
    storage: { from: (name) => { calls.push(['bucket', name]); return bucket; } },
  };
  return { client, calls, bucket, query, service: createProfileService(client, () => current), setUser: (value) => { current = value; } };
}

test('profile payload normalizes fields, allows clearing favorites, excludes privileged fields and media paths', () => {
  assert.deepEqual(profilePayload(form), {
    username: 'test_user', display_name: 'Name', bio: 'bio', country: 'BR', preferred_language: 'pt', links: { website: 'https://example.com' },
    favorite_animes: ['One', 'Two'], profile_visibility: 'public', list_visibility: 'private',
  });
  assert.deepEqual(profilePayload({ ...form, favoritesText: '', links: {} }).favorite_animes, []);
  assert.equal(profilePayload({ ...form, country: '', bio: '' }).country, null);
});

test('invalid username, country, language, visibility, bio and links are rejected', () => {
  for (const patch of [{ username: 'bad.name' }, { country: 'BRA' }, { preferred_language: 'xx' }, { profile_visibility: 'everyone' }, { bio: 'a'.repeat(301) }, { links: { website: 'javascript:alert(1)' } }]) {
    assert.throws(() => profilePayload({ ...form, ...patch }));
  }
  assert.equal(safeProfileLink('javascript:alert(1)'), null);
  assert.equal(safeProfileLink('https://user:password@example.com'), null);
});

test('public lookup uses explicit public view projection and a single UUID filter', async () => {
  const { service, calls } = fixture();
  assert.equal(await service.publicProfile(owner), null);
  assert.deepEqual(calls, [['from', 'public_profiles'], ['select', PUBLIC_PROFILE_COLUMNS], ['eq', 'id', owner]]);
  assert.ok(!PUBLIC_PROFILE_COLUMNS.includes('role'));
  assert.ok(!PUBLIC_PROFILE_COLUMNS.includes('email'));
});

test('legacy email link never triggers lookup or email identity fallback', async () => {
  const { service, calls } = fixture();
  assert.equal(await service.publicProfile('user@example.com'), null);
  assert.equal(calls.length, 0);
});

test('update invokes only update_profile and propagates server conflicts', async () => {
  const { service, client, calls } = fixture();
  await service.update(form);
  assert.deepEqual(calls, [['rpc', 'update_profile', { p_updates: profilePayload(form) }]]);
  client.rpc = async () => ({ error: new Error('USERNAME_TAKEN') });
  await assert.rejects(service.update(form), /USERNAME_TAKEN/);
});

test('private media is signed briefly; arbitrary external paths are rejected', async () => {
  const { service, calls } = fixture();
  assert.equal(await service.signMedia('avatar', `${owner}/a.png`, owner), 'https://storage.test/signed');
  assert.deepEqual(calls, [['bucket', 'avatars'], ['sign', `${owner}/a.png`, 60]]);
  await assert.rejects(service.signMedia('avatar', 'https://example.com/a.png', owner), /INVALID_PATH/);
  await assert.rejects(service.signMedia('avatar', `${other}/a.png`, owner), /INVALID_PATH/);
  await assert.rejects(service.signMedia('avatar', `${owner}/../a.png`, owner), /INVALID_PATH/);
});

test('avatar upload is unique, scoped to UUID, non-overwriting and associated after upload', async () => {
  const { service, calls } = fixture();
  const file = { size: 100, type: 'image/png', name: '../../untrusted.svg' };
  const path = await service.upload('avatar', file);
  assert.match(path, new RegExp(`^${owner}/[0-9a-f-]+\\.png$`));
  assert.equal(calls[0][1], 'avatars');
  assert.deepEqual(calls[1], ['upload', path, file, { contentType: 'image/png', upsert: false, cacheControl: '60' }]);
  assert.deepEqual(calls[2], ['rpc', 'set_avatar', { p_path: path }]);
});

test('banner uses dedicated bucket and RPC', async () => {
  const { service, calls } = fixture();
  const path = await service.upload('banner', { size: 6 * 1024 * 1024, type: 'image/jpeg' });
  assert.equal(calls[0][1], 'profile-banners');
  assert.deepEqual(calls[2], ['rpc', 'set_banner', { p_path: path }]);
});

test('oversized, empty and unsupported files never reach Storage', async () => {
  const { service, calls } = fixture();
  for (const file of [{ size: 1, type: 'image/svg+xml' }, { size: 0, type: 'image/png' }, { size: 5242881, type: 'image/png' }]) {
    await assert.rejects(service.upload('avatar', file), /INVALID_MEDIA/);
  }
  await assert.rejects(service.upload('banner', { size: 10485761, type: 'image/png' }), /INVALID_MEDIA/);
  assert.equal(calls.length, 0);
});

test('failed upload never changes profile selection', async () => {
  const { service, bucket, calls } = fixture();
  bucket.upload = async () => ({ error: new Error('storage unavailable') });
  await assert.rejects(service.upload('avatar', { size: 10, type: 'image/png' }), /storage unavailable/);
  assert.ok(!calls.some(([name]) => name === 'rpc'));
});

test('switching accounts while upload is pending cannot associate media with the new user', async () => {
  const { service, bucket, calls, setUser } = fixture();
  bucket.upload = async () => { setUser(other); return ok({}); };
  await assert.rejects(service.upload('avatar', { size: 10, type: 'image/png' }), /SESSION_CHANGED/);
  assert.ok(!calls.some(([name]) => name === 'rpc'));
});

test('remove unselects through RPC without unsafe asynchronous physical deletion', async () => {
  const { service, calls } = fixture();
  await service.remove('avatar');
  await service.remove('banner');
  assert.deepEqual(calls, [['rpc', 'remove_avatar'], ['rpc', 'remove_banner']]);
});

test('crop uses the canonical selected path, never a signed URL from the editor', async () => {
  const { service, calls } = fixture();
  const path = `${owner}/image.png`;
  await service.crop('avatar', path, { zoom: 2, offsetXPct: 5, offsetYPct: -8, imageUrl: 'https://storage.test/signed?token=secret' });
  assert.deepEqual(calls, [['rpc', 'update_profile', { p_updates: { avatar_crop: { version: 2, zoom: 2, offsetXPct: 5, offsetYPct: -8, imageUrl: path } } }]]);
  await assert.rejects(service.crop('avatar', path, { zoom: 11, offsetXPct: 0, offsetYPct: 0 }), /INVALID_CROP/);
});

test('anonymous mutations fail before requests', async () => {
  const { service, calls, setUser } = fixture();
  setUser(null);
  await assert.rejects(service.update(form), /SESSION_CHANGED/);
  await assert.rejects(service.upload('avatar', { size: 10, type: 'image/png' }), /SESSION_CHANGED/);
  await assert.rejects(service.remove('avatar'), /SESSION_CHANGED/);
  assert.equal(calls.length, 0);
});
