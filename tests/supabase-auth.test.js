import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createSupabaseAuthStore } from '../src/lib/supabaseAuthStore.js';
import { createSupabaseAuthClient } from '../src/api/supabaseClient.js';

const session = (id) => ({ user: { id, email: `${id}@example.test` }, access_token: `test-${id}` });
const ok = (data) => ({ data, error: null });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function fixture(t, initial = null) {
  let callback;
  let current = initial;
  let insideCallback = false;
  let unsubscribed = 0;
  const calls = [];
  const client = {
    auth: {
      getSession: async () => ok({ session: current }),
      onAuthStateChange(fn) {
        callback = fn;
        return { data: { subscription: { unsubscribe() { unsubscribed++; } } } };
      },
      signInWithPassword: async (args) => {
        calls.push(['login', args]);
        emit('SIGNED_IN', session('a'));
        return ok({ session: current, user: current.user });
      },
      signUp: async (args) => { calls.push(['signup', args]); return ok({ user: { id: 'a' }, session: null }); },
      verifyOtp: async (args) => { calls.push(['otp', args]); emit('SIGNED_IN', session('a')); return ok({ session: current }); },
      signOut: async (args) => { calls.push(['logout', args]); emit('SIGNED_OUT', null); return ok(null); },
    },
    rpc: async (name, args) => {
      assert.equal(insideCallback, false, 'RPC must run outside the auth callback');
      calls.push([name, args]);
      return ok({ id: current.user.id, profile_setup_completed: false });
    },
  };
  function emit(event, value) {
    current = value;
    insideCallback = true;
    try { callback(event, value); } finally { insideCallback = false; }
  }
  const store = createSupabaseAuthStore(client, null, 'https://zoku.test');
  t.after(() => store.stop());
  return { client, store, calls, emit, unsubscribed: () => unsubscribed };
}

test('disabled configuration never constructs a client; enabled configuration requires public credentials', () => {
  const factory = () => { throw new Error('must not construct'); };
  assert.equal(createSupabaseAuthClient({}, factory), null);
  assert.equal(createSupabaseAuthClient({ VITE_SUPABASE_URL: 'https://example.test' }, factory), null);
  assert.throws(() => createSupabaseAuthClient({ VITE_ENABLE_SUPABASE_AUTH: 'true' }), /requires/);
  assert.throws(() => createSupabaseAuthClient({ VITE_ENABLE_SUPABASE_AUTH: 'true', VITE_SUPABASE_URL: 'https://example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_invalid' }), /publishable key/);
  let options;
  const client = createSupabaseAuthClient({ VITE_ENABLE_SUPABASE_AUTH: 'true', VITE_SUPABASE_URL: 'https://example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, (_url, _key, config) => { options = config; return {}; });
  assert.ok(client);
  assert.equal(options.auth.persistSession, true);
  assert.equal(options.auth.autoRefreshToken, true);
  assert.equal(options.auth.detectSessionInUrl(new URL('https://zoku.test/login'), { access_token: 'token' }), false);
  assert.equal(options.auth.detectSessionInUrl(new URL('https://zoku.test/auth/callback'), { access_token: 'token' }), true);
  assert.equal(options.auth.detectSessionInUrl(new URL('https://zoku.test/reset-password'), { error_description: 'expired' }), true);
});

test('disabled or misconfigured infrastructure does not block legacy rendering', async () => {
  const error = new Error('configuration');
  const store = createSupabaseAuthStore(null, error);
  store.start();
  assert.equal(store.getSnapshot().isLoadingAuth, false);
  assert.equal(store.getSnapshot().authError, error);
  await assert.rejects(store.signInWithEmail('e', 'p'), /configuration/);
});

test('anonymous restoration finishes without profile access', async (t) => {
  const { store, calls } = fixture(t);
  store.start();
  await delay(10);
  assert.equal(store.getSnapshot().authChecked, true);
  assert.equal(store.getSnapshot().session, null);
  assert.equal(calls.length, 0);
});

test('session restoration loads private profile via RPC with no caller identity', async (t) => {
  const { store, calls } = fixture(t, session('a'));
  store.start();
  await delay(10);
  assert.equal(store.getSnapshot().user.id, 'a');
  assert.equal(store.getSnapshot().profile.id, 'a');
  assert.equal(store.getSnapshot().isLoadingProfile, false);
  assert.deepEqual(calls, [['get_my_profile', undefined]]);
});

test('password login and OTP events bootstrap; confirmation-required signup stays anonymous', async (t) => {
  const { store, calls } = fixture(t);
  store.start();
  await delay(10);
  const signup = await store.signUpWithEmail('e', 'p', 'Name');
  assert.equal(signup.session, null);
  assert.equal(store.getSnapshot().session, null);
  assert.deepEqual(calls[0], ['signup', { email: 'e', password: 'p', options: { data: { full_name: 'Name' }, emailRedirectTo: 'https://zoku.test/auth/callback?returnTo=%2F' } }]);
  await store.verifyEmailOtp('e', '123456');
  await delay(10);
  assert.equal(store.getSnapshot().profile.id, 'a');
  assert.deepEqual(calls[1], ['otp', { email: 'e', token: '123456', type: 'signup' }]);
  await store.logout();
  assert.equal(store.getSnapshot().profile, null);
  await store.signInWithEmail('e', 'p');
  await delay(10);
  assert.equal(store.getSnapshot().profile.id, 'a');
});

test('SDK errors reject; failed logout keeps authenticated state', async (t) => {
  const { store, client } = fixture(t, session('a'));
  store.start();
  await delay(10);
  const error = new Error('network');
  client.auth.signOut = async () => ({ error });
  client.auth.signInWithPassword = async () => ({ error });
  await assert.rejects(store.signInWithEmail('e', 'p'), /network/);
  await assert.rejects(store.logout(), /network/);
  assert.equal(store.getSnapshot().user.id, 'a');
});

test('session restoration error is observable and finishes loading', async (t) => {
  const { store, client } = fixture(t);
  client.auth.getSession = async () => ({ error: new Error('storage failed') });
  store.start();
  await delay(10);
  assert.equal(store.getSnapshot().authError.message, 'storage failed');
  assert.equal(store.getSnapshot().isLoadingAuth, false);
});

test('profile failure preserves session, remains unknown, and supports retry', async (t) => {
  const { store, client } = fixture(t, session('a'));
  client.rpc = async () => ({ error: new Error('PROFILE_NOT_FOUND') });
  store.start();
  await delay(10);
  assert.equal(store.getSnapshot().user.id, 'a');
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.getSnapshot().profileError.message, 'PROFILE_NOT_FOUND');
  client.rpc = async () => ok({ id: 'a', profile_setup_completed: true });
  await store.refreshProfile();
  assert.equal(store.getSnapshot().profile.profile_setup_completed, true);
  assert.equal(store.getSnapshot().profileError, null);
});

test('late initial session cannot overwrite a new auth event', async (t) => {
  const { store, client, emit } = fixture(t);
  const pending = deferred();
  client.auth.getSession = () => pending.promise;
  store.start();
  emit('SIGNED_IN', session('b'));
  pending.resolve(ok({ session: session('a') }));
  await delay(10);
  assert.equal(store.getSnapshot().user.id, 'b');
  assert.equal(store.getSnapshot().profile.id, 'b');
});

test('late profile cannot repopulate after logout or overwrite another identity', async (t) => {
  const { store, client, emit } = fixture(t, session('a'));
  const pending = deferred();
  client.rpc = () => pending.promise;
  store.start();
  await delay(10);
  await store.logout();
  assert.equal(store.getSnapshot().profile, null);
  client.rpc = async () => ok({ id: 'b', profile_setup_completed: true });
  emit('SIGNED_IN', session('b'));
  await delay(10);
  pending.resolve(ok({ id: 'a' }));
  await delay(10);
  assert.equal(store.getSnapshot().profile.id, 'b');
  assert.equal(store.getSnapshot().profileError, null);
});

test('token refresh updates session and external signout clears all private state', async (t) => {
  const { store, emit } = fixture(t, session('a'));
  store.start();
  await delay(10);
  emit('TOKEN_REFRESHED', { ...session('a'), access_token: 'renewed' });
  assert.equal(store.getSnapshot().session.access_token, 'renewed');
  emit('SIGNED_OUT', null);
  await delay(10);
  assert.equal(store.getSnapshot().user, null);
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.getSnapshot().isLoadingProfile, false);
});

test('setup uses exact backend contract and reads authoritative profile after idempotent response', async (t) => {
  const { store, client, calls } = fixture(t, session('a'));
  store.start();
  await delay(10);
  client.rpc = async (name, args) => {
    calls.push([name, args]);
    return ok(name === 'complete_profile_setup' ? { status: 'ALREADY_COMPLETED' } : { id: 'a', profile_setup_completed: true });
  };
  const result = await store.completeProfileSetup({ username: 'name', displayName: 'Name', preferredLanguage: 'pt' });
  assert.equal(result.status, 'ALREADY_COMPLETED');
  assert.deepEqual(calls[1], ['complete_profile_setup', { p_username: 'name', p_display_name: 'Name', p_preferred_language: 'pt' }]);
  assert.deepEqual(calls[2], ['get_my_profile', undefined]);
  assert.equal(store.getSnapshot().profile.profile_setup_completed, true);
});

test('setup failure does not mark profile complete; anonymous setup is blocked', async (t) => {
  const { store, client } = fixture(t, session('a'));
  store.start();
  await delay(10);
  client.rpc = async () => ({ error: new Error('USERNAME_TAKEN') });
  await assert.rejects(store.completeProfileSetup({ username: 'taken' }), /USERNAME_TAKEN/);
  assert.equal(store.getSnapshot().profile.profile_setup_completed, false);
  await store.logout();
  await assert.rejects(store.completeProfileSetup({}), /Authentication required/);
});

test('stop unsubscribes, ignores in-flight bootstrap, and restart restores state', async (t) => {
  const { store, client, unsubscribed } = fixture(t, session('a'));
  const pending = deferred();
  client.rpc = () => pending.promise;
  store.start();
  await delay(10);
  store.stop();
  assert.equal(unsubscribed(), 1);
  pending.resolve(ok({ id: 'a' }));
  await delay(10);
  assert.equal(store.getSnapshot().profile, null);
  client.rpc = async () => ok({ id: 'a' });
  store.start();
  await delay(10);
  assert.equal(store.getSnapshot().profile.id, 'a');
});

test('mismatched profile is never exposed', async (t) => {
  const { store, client } = fixture(t, session('a'));
  client.rpc = async () => ok({ id: 'b' });
  store.start();
  await delay(10);
  assert.equal(store.getSnapshot().profile, null);
  assert.match(store.getSnapshot().profileError.message, /does not match/);
});

test('setup re-read wins over an older bootstrap still in flight', async (t) => {
  const { store, client } = fixture(t, session('a'));
  const pending = deferred();
  client.rpc = () => pending.promise;
  store.start();
  await delay(10);
  client.rpc = async (name) => ok(name === 'complete_profile_setup'
    ? { status: 'COMPLETED' } : { id: 'a', profile_setup_completed: true });
  await store.completeProfileSetup({ username: 'name', displayName: 'Name', preferredLanguage: 'pt' });
  pending.resolve(ok({ id: 'a', profile_setup_completed: false }));
  await delay(10);
  assert.equal(store.getSnapshot().profile.profile_setup_completed, true);
});

test('setup finishing after logout does not trigger another profile read', async (t) => {
  const { store, client } = fixture(t, session('a'));
  store.start();
  await delay(10);
  const pending = deferred();
  let rpcCount = 0;
  client.rpc = () => { rpcCount++; return pending.promise; };
  const setup = store.completeProfileSetup({ username: 'name' });
  await store.logout();
  pending.resolve(ok({ status: 'COMPLETED' }));
  await setup;
  assert.equal(rpcCount, 1);
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.getSnapshot().user, null);
});
