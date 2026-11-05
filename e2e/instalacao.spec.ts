import { expect, test } from '@playwright/test';
import { verificarA11y } from './a11y';

test('menu apresenta uma orientação iOS visível e preserva a navegação', async ({
  page,
  isMobile,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'iPhone', configurable: true });
    Object.defineProperty(navigator, 'standalone', { value: false, configurable: true });
  });
  await page.goto('/entrar');
  await page.getByRole('button', { name: /Ana Exemplo/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: /menu/i }).click();
  const orientacao = page
    .getByText('Para instalar: toque em Compartilhar e depois em Adicionar à Tela de Início.')
    .filter({ visible: true });
  await expect(orientacao).toHaveCount(1);
  await expect(orientacao).toBeVisible();
  await verificarA11y(page, info);
  await expect(page.getByRole('button', { name: 'Instalar aplicativo' })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Resultados', exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole('link', { name: 'Ranking', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/aluno\/ranking$/);
});
