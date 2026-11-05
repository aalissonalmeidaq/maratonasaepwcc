import { defineConfig, devices } from '@playwright/test';

// Porta própria: não reutilizar um dev server com configuração/estado de outra sessão.
const PORT = 4183;
const selecionados = process.argv.flatMap((arg, i) =>
  arg.startsWith('--project=')
    ? [arg.slice(10)]
    : arg === '--project'
      ? [process.argv[i + 1] ?? '']
      : [],
);
const precisaBuildPwa = selecionados.length === 0 || selecionados.includes('pwa');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    locale: 'pt-BR',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /(?:pwa|atualizacao-pwa)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'celular',
      testIgnore: /(?:pwa|atualizacao-pwa)\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'pwa',
      testMatch: /pwa\.spec\.ts/,
      testIgnore: /atualizacao-pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4174' },
    },
    {
      name: 'atualizacao',
      testMatch: /atualizacao-pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Modo demonstração explícito: dados fictícios, sem Supabase.
  webServer:
    process.env.E2E_EXTERNAL_SERVERS === 'true'
      ? undefined
      : [
          {
            command: `npm run dev -- --port ${PORT} --strictPort`,
            url: `http://localhost:${PORT}`,
            reuseExistingServer: false,
            env: { VITE_DEMO_MODE: 'true' },
            timeout: 120_000,
          },
          ...(precisaBuildPwa
            ? [
                {
                  command:
                    'npm run build -- --outDir dist-e2e-pwa && npm run preview -- --outDir dist-e2e-pwa --port 4174 --strictPort',
                  url: 'http://localhost:4174',
                  reuseExistingServer: false,
                  env: { VITE_DEMO_MODE: 'true' },
                  timeout: 180_000,
                },
              ]
            : []),
        ],
});
