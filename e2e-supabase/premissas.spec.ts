import { expect, test, type Browser, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Spec 015/016 — premissas em validação com o Supabase local. Todas vêm resolvidas (decisões do
// projeto): o fluxo de resposta e a concorrência são cobertos pelo pgTAP (016_premissas).

async function entrar(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/entrar$/);
  return page;
}

test('master, coordenação e docente leem as premissas resolvidas; o servidor recusa responder', async ({
  browser,
}) => {
  for (const email of [
    'master@exemplo.invalid',
    'coordenacao@exemplo.invalid',
    'docente@exemplo.invalid',
  ]) {
    const pagina = await entrar(browser, email);
    const area = email.startsWith('master')
      ? 'master'
      : email.startsWith('coordenacao')
        ? 'coordenacao'
        : 'docente';
    await pagina.goto(`/${area}/premissas`);
    await expect(
      pagina.getByRole('heading', { level: 1, name: 'Premissas em validação' }),
    ).toBeVisible();
    await expect(pagina.getByText('Todas as premissas estão resolvidas.')).toBeVisible();
    await pagina.getByText('Mostrar 32 premissas').click();
    await expect(pagina.getByRole('article')).toHaveCount(32);
    await expect(pagina.getByRole('button', { name: /^Responder/ })).toHaveCount(0);
  }

  // Todas resolvidas: nem o master consegue registrar resposta (a regra vale no servidor).
  const sb = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  await sb.auth.signInWithPassword({
    email: 'master@exemplo.invalid',
    password: 'senha-local-123',
  });
  const leitura = await sb.rpc('premissas_em_validacao');
  expect(leitura.error).toBeNull();
  const resposta = await sb.rpc('responder_premissa', {
    p_codigo: 'P01',
    p_decisao: 'confirmada',
    p_justificativa: 'Tentativa de resposta a premissa resolvida.',
    p_resposta_base: null,
  });
  expect(resposta.error?.code).toBe('23514');
});

test('estudante: sem item no menu e recusado no servidor', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('aluna@exemplo.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('senha-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/aluno$/);
  await expect(
    page.getByRole('link', { name: 'Premissas em validação', includeHidden: true }),
  ).toHaveCount(0);

  const sb = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  await sb.auth.signInWithPassword({ email: 'aluna@exemplo.invalid', password: 'senha-local-123' });
  const leitura = await sb.rpc('premissas_em_validacao');
  expect(leitura.error?.code).toBe('42501');
});
