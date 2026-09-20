// Local-only integration: real Auth tokens, PostgREST and Storage bytes.
// Credentials are captured from CLI status, never logged or saved.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npx supabase status -o json']
  : ['supabase', 'status', '-o', 'json'];
const config = JSON.parse(execFileSync(command, args, {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}));
const base = config.API_URL;
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'tests must target local Supabase');
const anon = config.ANON_KEY;
const service = config.SERVICE_ROLE_KEY;
const users = [];
const objects = [];
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
async function request(path, token = anon, method = 'GET', body, extra = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra },
    body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  return { ok: response.ok, status: response.status, data };
}
const rpc = (name, token, body = {}) => request(`/rest/v1/rpc/${name}`, token, 'POST', body);
const myProfile = async token => (await rpc('get_my_profile', token)).data;
async function makeUser(label, metadata) {
  const email = `profile-test-${randomUUID()}@example.test`;
  const password = randomUUID() + 'Az1!';
  const created = await request('/auth/v1/admin/users', service, 'POST', {
    email, password, email_confirm: true, user_metadata: metadata,
  });
  check(created.ok, `${label}: signup succeeds`);
  const id = created.data.id;
  users.push(id);
  const session = await request('/auth/v1/token?grant_type=password', anon, 'POST', { email, password });
  check(session.ok && session.data.access_token, `${label}: login succeeds`);
  return { id, token: session.data.access_token };
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxRkAAAAASUVORK5CYII=', 'base64');
async function upload(bucket, path, token, bytes = png, headers = {}) {
  const result = await request(`/storage/v1/object/${bucket}/${path}`, token, 'POST', bytes,
    { 'Content-Type': 'image/png', ...headers });
  if (result.ok && !objects.some(o => o.bucket === bucket && o.path === path)) objects.push({ bucket, path });
  return result;
}
const download = (bucket, path, token) => request(`/storage/v1/object/authenticated/${bucket}/${path}`, token);

try {
  const owner = await makeUser('owner', { full_name: 'N'.repeat(90) });
  const friend = await makeUser('friend', { full_name: '   ', name: ' Friend ' });
  const stranger = await makeUser('stranger', {});
  check((await myProfile(owner.token)).display_name.length === 50, 'signup handles long metadata through Auth');
  check((await myProfile(friend.token)).display_name === 'Friend', 'signup handles blank metadata through Auth');
  for (const user of [owner, friend, stranger]) {
    const setup = await rpc('complete_profile_setup', user.token, {
      p_username: `test_${user.id.replaceAll('-', '').slice(0, 15)}`,
      p_display_name: 'Test', p_preferred_language: 'pt',
    });
    check(setup.ok && setup.data.status === 'COMPLETED', 'setup through PostgREST');
  }
  check((await request('/rest/v1/friendships', service, 'POST', {
    requester_id: owner.id, receiver_id: friend.id, status: 'accepted',
  })).ok, 'accepted-friend fixture created');

  const privateRead = await request(`/rest/v1/profiles?select=push_enabled&id=eq.${owner.id}`, stranger.token);
  check(!privateRead.ok, 'private-column REST query denied');
  check(!(await request(`/rest/v1/profiles?id=eq.${owner.id}`, owner.token, 'PATCH', { bio: 'bypass' })).ok,
    'direct profile PATCH denied');
  check(!(await request(`/rest/v1/public_profiles?id=eq.${owner.id}`, owner.token, 'PATCH', { bio: 'bypass' })).ok,
    'view PATCH denied');
  check(!(await request(`/rest/v1/profiles?id=eq.${owner.id}`, owner.token, 'DELETE')).ok, 'direct DELETE denied');
  const valid = await rpc('update_profile', owner.token, {
    p_updates: { country: ' br ', favorite_animes: [' Naruto ', 'One Piece'], push_enabled: true },
  });
  check(valid.ok, 'profile update via REST RPC succeeds');
  const own = await myProfile(owner.token);
  check(own.country === 'BR' && own.favorite_animes.join('|') === 'Naruto|One Piece', 'normalized profile roundtrip');

  for (const [bucket, field, setRpc, removeRpc, cropField] of [
    ['avatars', 'avatar_url', 'set_avatar', 'remove_avatar', 'avatar_crop'],
    ['profile-banners', 'banner_url', 'set_banner', 'remove_banner', 'banner_crop'],
  ]) {
    const path = `${owner.id}/${randomUUID()}.png`;
    const draft = `${owner.id}/${randomUUID()}.png`;
    check((await upload(bucket, path, owner.token)).ok, `${bucket}: owned upload succeeds`);
    check((await upload(bucket, draft, owner.token)).ok, `${bucket}: draft upload succeeds`);
    check(!(await upload(bucket, `${owner.id}/forbidden.png`, stranger.token)).ok, `${bucket}: cross-folder upload denied`);
    check(!(await upload(bucket, path, stranger.token, png, { 'x-upsert': 'true' })).ok, `${bucket}: cross-folder upsert denied`);
    check(!(await upload(bucket, `${owner.id}/forbidden.txt`, owner.token, Buffer.from('text'), { 'Content-Type': 'text/plain' })).ok,
      `${bucket}: disallowed MIME rejected`);
    const tooBig = Buffer.alloc((bucket === 'avatars' ? 5 : 10) * 1024 * 1024 + 1);
    check(!(await upload(bucket, `${owner.id}/oversized.png`, owner.token, tooBig)).ok, `${bucket}: bucket size limit enforced`);
    check(!(await rpc('update_profile', owner.token, { p_updates: { [field]: path } })).ok, `${bucket}: generic RPC path bypass rejected`);
    check(!(await rpc(setRpc, stranger.token, { p_path: path })).ok, `${bucket}: cross-user association rejected`);
    check((await rpc(setRpc, owner.token, { p_path: path })).ok, `${bucket}: dedicated RPC associates existing upload`);
    const crop = { version: 2, zoom: 1.25, offsetXPct: 0, offsetYPct: 0, imageUrl: path };
    check((await rpc('update_profile', owner.token, { p_updates: { [cropField]: crop } })).ok, `${bucket}: crop bound to path`);
    check((await download(bucket, path, anon)).ok, `${bucket}: public profile selected media readable with anon JWT`);
    check(!(await download(bucket, draft, anon)).ok, `${bucket}: unpublished media hidden`);
    check(!(await request(`/storage/v1/object/public/${bucket}/${path}`, anon)).ok, `${bucket}: permanent public URL disabled`);

    check((await rpc('update_profile', owner.token, { p_updates: { profile_visibility: 'friends' } })).ok, 'friends visibility set');
    check((await download(bucket, path, owner.token)).ok, `${bucket}: owner reads friends media`);
    check((await download(bucket, path, friend.token)).ok, `${bucket}: accepted friend reads media`);
    check(!(await download(bucket, path, stranger.token)).ok, `${bucket}: stranger denied friends media`);
    check(!(await download(bucket, path, anon)).ok, `${bucket}: anon denied friends media`);
    check(!(await request(`/storage/v1/object/sign/${bucket}/${path}`, stranger.token, 'POST', { expiresIn: 60 })).ok,
      `${bucket}: stranger cannot mint signed URL`);
    const unauthorizedDelete = await request(`/storage/v1/object/${bucket}`, friend.token, 'DELETE', { prefixes: [path] });
    check(!unauthorizedDelete.ok || unauthorizedDelete.data.length === 0, `${bucket}: friend cannot delete media`);
    check((await download(bucket, path, owner.token)).ok, `${bucket}: forbidden delete preserved object`);
    check(!(await request(`/storage/v1/object/move`, friend.token, 'POST', {
      bucketId: bucket, sourceKey: path, destinationKey: `${friend.id}/stolen.png`,
    })).ok, `${bucket}: friend cannot move owned object`);

    check((await rpc('update_profile', owner.token, { p_updates: { profile_visibility: 'private' } })).ok, 'private visibility set');
    check(!(await download(bucket, path, friend.token)).ok, `${bucket}: friend denied after private transition`);
    check((await download(bucket, path, owner.token)).ok, `${bucket}: owner reads private media`);
    const view = await request(`/rest/v1/public_profiles?select=*&id=eq.${owner.id}`, friend.token);
    check(view.ok && view.data.length === 0, 'private profile hidden through REST view');
    check((await rpc(setRpc, owner.token, { p_path: draft })).ok, `${bucket}: replacement works`);
    check((await myProfile(owner.token))[cropField] === null, `${bucket}: replacement clears old crop`);
    check((await rpc('update_profile', owner.token, { p_updates: { profile_visibility: 'public' } })).ok, 'public visibility restored');
    check(!(await download(bucket, path, anon)).ok, `${bucket}: old media remains inaccessible to anon`);
    check((await rpc(removeRpc, owner.token)).ok, `${bucket}: removal succeeds`);
    check((await myProfile(owner.token))[field] === null, `${bucket}: removed reference is null`);
    check(!(await download(bucket, draft, anon)).ok, `${bucket}: removed media no longer shared`);
  }
  console.log(`PASS: ${checks} Auth/PostgREST/Storage checks`);
} finally {
  let cleanupFailed = false;
  for (const { bucket, path } of objects) {
    const result = await request(`/storage/v1/object/${bucket}`, service, 'DELETE', { prefixes: [path] });
    if (!result.ok) cleanupFailed = true;
  }
  for (const id of users.reverse()) {
    const result = await request(`/auth/v1/admin/users/${id}`, service, 'DELETE');
    if (!result.ok) cleanupFailed = true;
  }
  assert.ok(!cleanupFailed, 'local fixture cleanup must succeed');
  console.log('Local fixtures removed through Auth and Storage APIs.');
}
