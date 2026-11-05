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
  outputDir: './test-results-supabase',
  fullyParallel: false,
  workers: 1,
  // A primeira abertura de cada área compila as telas sob demanda no servidor de desenvolvimento.
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /(paineis|ranking-turma|privacidade-offline)\.spec\.ts/,
    },
    // Os painéis (spec 008) e o ranking por turma (spec 012) leem o estado deixado pelas outras
    // jornadas e publicam turmas; rodam por último para não mudar as versões que resultado.spec
    // espera (painéis antes do ranking por turma, em ordem alfabética).
    {
      name: 'privacidade-pwa',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4176' },
      testMatch: /privacidade-offline\.spec\.ts/,
      dependencies: ['paineis'],
    },
    {
      name: 'paineis',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /(paineis|ranking-turma)\.spec\.ts/,
      dependencies: ['desktop'],
    },
  ],
  // Permite diagnosticar a suíte contra os mesmos servidores locais iniciados externamente.
  webServer:
    process.env.E2E_EXTERNAL_SERVERS === 'true'
      ? undefined
      : [
          {
            command: `npm run dev -- --port ${PORT} --strictPort`,
            url: `http://localhost:${PORT}`,
            reuseExistingServer: false,
            env: { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: chave, VITE_DEMO_MODE: '' },
            timeout: 120_000,
          },
          {
            command:
              'npm run build -- --outDir dist-e2e-supabase-pwa && npm run preview -- --outDir dist-e2e-supabase-pwa --port 4176 --strictPort',
            url: 'http://localhost:4176',
            reuseExistingServer: false,
            timeout: 180_000,
            env: { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: chave, VITE_DEMO_MODE: '' },
          },
        ],
});
