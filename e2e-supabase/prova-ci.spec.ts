import { expect, test } from '@playwright/test';
test('falha injetada (prova da CI, não mesclar)', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByText('texto que não existe na página')).toBeVisible({ timeout: 2000 });
});
