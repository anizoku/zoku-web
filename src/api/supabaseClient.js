import { createClient } from '@supabase/supabase-js';

// Explicit opt-in: credentials alone must not change the legacy application's auth.
export function createSupabaseAuthClient(env, factory = createClient) {
  if (env.VITE_ENABLE_SUPABASE_AUTH !== 'true') return null;
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Supabase Auth requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  if (!key.startsWith('sb_publishable_')) {
    throw new Error('Use a Supabase publishable key (sb_publishable_), never a secret/service-role key');
  }
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid Supabase URL');
  return factory(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'implicit',
      detectSessionInUrl: (url, params) =>
        ['/auth/callback', '/reset-password'].includes(url.pathname) &&
        Boolean(params.access_token || params.error || params.error_code || params.error_description),
    },
  });
}

let client;
export function getSupabaseAuthClient() {
  if (client === undefined) client = createSupabaseAuthClient(import.meta.env);
  return client;
}
