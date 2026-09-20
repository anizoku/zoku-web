import { lazy, Suspense } from 'react';

// Do not evaluate legacy imports or token parsing in the Supabase app.
const Application = import.meta.env.VITE_ENABLE_SUPABASE_AUTH === 'true'
  ? lazy(() => import('./SupabaseApp'))
  : lazy(() => import('./LegacyApp'));

export default function App() {
  return <Suspense fallback={<p role="status">Carregando Zoku…</p>}><Application /></Suspense>;
}
