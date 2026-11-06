import { expect, test, type Page } from '@playwright/test';

// Spec 015 — premissas em validação no modo demonstração (dados fictícios; registrar é recusado).
async function entrarComo(page: Page, nome: RegExp) {
  await page.goto('/entrar');
  await page.getByRole('button', { name: nome }).click();
  await expect(page).not.toHaveURL(/entrar$/);
}

/** Abre o menu (celular) e a categoria recolhida que contém o item, como nas jornadas. */
async function abrirPeloMenu(page: Page) {
  await expect(page.locator('#conteudo')).toBeVisible();
  const botao = page.getByRole('button', { name: 'Abrir menu' });
  if (await botao.isVisible()) await botao.click();
  const menu = page.locator('nav:not([aria-label="Acesso rápido"])').filter({ visible: true });
  const item = menu.getByRole('link', { name: 'Premissas em validação', exact: true });
  const categorias = menu.locator('button[aria-expanded]');
  for (let i = 0; !(await item.isVisible()) && i < (await categorias.count()); i++) {
    const categoria = categorias.nth(i);
    if ((await categoria.getAttribute('aria-expanded')) === 'false') await categoria.click();
  }
  await item.click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Premissas em validação' }),
  ).toBeVisible();
}

test('master: vê o aviso no início, abre pelo menu, filtra e baixa o CSV', async ({ page }) => {
  await entrarComo(page, /master/i);
  await expect(page.getByText(/Premissas aguardando resposta: 4/)).toBeVisible();
  await abrirPeloMenu(page);
  const resumo = page.getByRole('list', { name: 'Situação das premissas' });
  await expect(resumo).toContainText('4');
  await page.getByLabel('Tema', { exact: true }).selectOption('Identidade visual');
  await expect(page.getByRole('article')).toHaveCount(4);
  await page.getByLabel('Situação', { exact: true }).selectOption('precisa_mudar');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article').first()).toContainText('P06');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar lista (CSV)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^maratona-premissas-\d{4}-\d{2}-\d{2}\.csv$/);
});

test('coordenação: lê sem formulário e sem aviso no início (só o master responde)', async ({
  page,
}) => {
  await entrarComo(page, /coordenação/i);
  await expect(page.getByText(/Premissas aguardando resposta/)).toHaveCount(0);
  await abrirPeloMenu(page);
  await expect(page.getByRole('button', { name: /Responder/ })).toHaveCount(0);
});

test('docente: lê sem formulário de resposta', async ({ page }) => {
  await entrarComo(page, /lúcia exemplo/i);
  await abrirPeloMenu(page);
  await expect(page.getByRole('article')).toHaveCount(6);
  await expect(page.getByRole('button', { name: /Responder/ })).toHaveCount(0);
});

test('aluno: sem item no menu e sem acesso à rota da coordenação', async ({ page }) => {
  await entrarComo(page, /ana exemplo/i);
  await expect(page.locator('#conteudo')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Premissas em validação', includeHidden: true }),
  ).toHaveCount(0);
});
