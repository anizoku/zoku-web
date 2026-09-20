import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const supabaseMode = env.VITE_ENABLE_SUPABASE_AUTH === 'true';
  return {
    logLevel: 'error',
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
      dedupe: ['react', 'react-dom'],
    },
    plugins: [
      // No Base44 proxy, analytics, or injected scripts in the new application.
      ...(!supabaseMode ? [base44({
        legacySDKImports: env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: true,
        visualEditAgent: true,
      })] : []),
      react(),
    ],
  };
});
