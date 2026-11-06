import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Spec 018 — no servidor e no site, as premissas não existem mais.
test('as RPCs de premissas não existem e a rota antiga é "não encontrado"', async ({ page }) => {
  const sb = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  await sb.auth.signInWithPassword({
    email: 'master@exemplo.invalid',
    password: 'senha-local-123',
  });
  const leitura = await sb.rpc('premissas_em_validacao');
  expect(leitura.error?.code).toBe('PGRST202');
  const resposta = await sb.rpc('responder_premissa', {
    p_codigo: 'P01',
    p_decisao: 'confirmada',
    p_justificativa: 'Tentativa de resposta.',
    p_resposta_base: null,
  });
  expect(resposta.error?.code).toBe('PGRST202');

  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('master@exemplo.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('senha-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/master/);
  await page.goto('/master/premissas');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
  ).toBeVisible();
});
