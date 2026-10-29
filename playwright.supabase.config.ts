import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra o Supabase LOCAL (dados fictícios do seed). Requer:
 *   supabase start && supabase db reset
 *   E2E_SUPABASE_URL=http://127.0.0.1:54421 E2E_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY de `supabase status`>
 * Nunca aponte para homologação/produção: os testes gravam e desfazem dados.
 */
const url = process.env.E2E_SUPABASE_URL ?? '';
const chave = process.env.E2E_SUPABASE_ANON_KEY ?? '';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url) || !chave) {
  throw new Error(
    'Defina E2E_SUPABASE_URL (somente local) e E2E_SUPABASE_ANON_KEY. Veja o README.',
  );
}

const PORT = 4174;

export default defineConfig({
  testDir: './e2e-supabase',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: chave, VITE_DEMO_MODE: '' },
    timeout: 120_000,
  },
});
