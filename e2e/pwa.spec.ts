import { expect, test, type Page } from '@playwright/test';
async function controlar(page: Page) {
  await page.goto('/regulamento');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('heading', { name: /edição de demonstração/ })).toBeVisible();
}
test('shell e regulamento público abrem offline com data salva', async ({ page, context }) => {
  await controlar(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Conteúdo salvo em/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /edição de demonstração/ })).toBeVisible();
  await page.goto('/entrar');
  await expect(page.getByText(/entrar exige internet/)).toBeVisible();
  await context.setOffline(false);
});
test('sem cópia informa que é necessária uma visita com rede', async ({ page, context }) => {
  await controlar(page);
  await page.evaluate(() => localStorage.clear());
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/abra esta página com internet uma vez/)).toBeVisible();
});
test('área interna sem dados informa offline e retoma ao reconectar', async ({ page, context }) => {
  await controlar(page);
  await page.goto('/entrar');
  await page.getByRole('button', { name: /ana exemplo/i }).click();
  await expect(page).toHaveURL(/aluno$/);
  await page.getByRole('button', { name: 'Resultados', exact: true }).click();
  await context.setOffline(true);
  await page.getByRole('link', { name: 'Ranking', exact: true }).click();
  await expect(
    page.getByText('Sem conexão: esta tela precisa de internet para carregar.').first(),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText('Sem conexão: esta tela precisa de internet para carregar.'),
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
for (const erro of ['QuotaExceededError', 'SecurityError'])
  test(`${erro}: leitura online permanece, sem gravação falsa`, async ({ page }) => {
    await page.addInitScript((nome) => {
      Storage.prototype.setItem = () => {
        throw new DOMException('Bloqueado no teste', nome);
      };
    }, erro);
    await controlar(page);
    await expect(
      page.getByText('Não foi possível salvar o regulamento para leitura offline.'),
    ).toBeVisible();
    await expect(page.getByText(/Conteúdo salvo em/)).toHaveCount(0);
  });
