import { expect, test, type Browser, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Spec 015 — premissas em validação com o Supabase local. As respostas são só de inserção: o
// teste não depende da situação inicial (cada resposta usa a atual como base).

async function entrar(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/entrar$/);
  return page;
}

function cartao(page: Page, codigo: string) {
  return page.getByRole('article').filter({ has: page.getByText(codigo, { exact: true }) });
}

async function responder(page: Page, codigo: string, decisao: string, justificativa: string) {
  const c = cartao(page, codigo);
  await c.getByRole('button', { name: `Responder ${codigo}` }).click();
  await c.getByRole('radio', { name: decisao }).check();
  await c.getByRole('textbox').fill(justificativa);
  await c.getByRole('button', { name: 'Registrar resposta' }).click();
  return c;
}

test('coordenação responde; docente lê; resposta concorrente recebe o aviso', async ({
  browser,
}) => {
  const a = await entrar(browser, 'coordenacao@exemplo.invalid');
  const b = await entrar(browser, 'coordenacao@exemplo.invalid');
  for (const p of [a, b]) {
    await p.goto('/coordenacao/premissas');
    await expect(
      p.getByRole('heading', { level: 1, name: 'Premissas em validação' }),
    ).toBeVisible();
  }

  // "Confirmada" pela aba A; a aba B ainda mostra a situação anterior.
  const p22 = await responder(a, 'P22', 'Confirmada', 'Convites sem prazo atendem à turma.');
  await expect(p22.getByText('Resposta registrada.')).toBeVisible();
  await expect(p22.getByText(/Confirmada por Coordenação \(fictícia\)/)).toBeVisible();

  const desatualizada = await responder(
    b,
    'P22',
    'Precisa mudar',
    'Convites devem expirar em 7 dias.',
  );
  await expect(desatualizada.getByRole('alert')).toContainText('respondida por outra pessoa');
  await expect(desatualizada.getByText(/Confirmada por Coordenação \(fictícia\)/)).toBeVisible();

  // "Precisa mudar" com histórico.
  const p23 = await responder(a, 'P23', 'Precisa mudar', 'Nomes de equipe precisam de revisão.');
  await expect(p23.getByText('Resposta registrada.')).toBeVisible();
  await expect(p23.getByText(/O sistema segue a premissa em uso/).first()).toBeVisible();

  // Docente lê a resposta sem formulário.
  const d = await entrar(browser, 'docente@exemplo.invalid');
  await d.goto('/docente/premissas');
  const p23Docente = cartao(d, 'P23');
  await expect(p23Docente.getByText('Nomes de equipe precisam de revisão.')).toBeVisible();
  await expect(d.getByRole('button', { name: /^Responder/ })).toHaveCount(0);
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
