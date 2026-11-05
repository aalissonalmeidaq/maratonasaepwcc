import { expect, test } from '@playwright/test';
import { telasPrincipais } from './suporte/telasPrincipais';
for (const grupo of telasPrincipais)
  test(`${grupo.perfil}: telas principais com texto a 200%`, async ({ page }) => {
    await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
    if (grupo.conta) {
      await page.getByRole('button', { name: grupo.conta }).click();
      await expect(page).not.toHaveURL(/entrar$/);
    }
    for (const rota of grupo.rotas) {
      await page.goto(rota, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/Carregando…|Carregando regulamento…/)).toHaveCount(0);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        rota,
      ).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
  });
test('regulamento público: texto ampliado, foco e alvos sem transbordamento', async ({ page }) => {
  await page.goto('/regulamento');
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  const link = page.getByRole('link', { name: 'Entrar', exact: true });
  const r = await link.boundingBox();
  expect(r?.width).toBeGreaterThanOrEqual(24);
  expect(r?.height).toBeGreaterThanOrEqual(24);
});
