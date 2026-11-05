import { expect, test } from '@playwright/test';
import { servidorAtualizacao } from './suporte/servidorAtualizacao';
test('dois builds: nova versão aguarda Atualizar agora', async ({ page }) => {
  test.setTimeout(240_000);
  const servidor = await servidorAtualizacao();
  try {
    await page.goto('http://127.0.0.1:4177/regulamento');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(page.locator('meta[name="maratona-build"]')).toHaveAttribute('content', 'a');
    servidor.publicarB();
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r?.update();
    });
    await expect(page.getByRole('button', { name: 'Atualizar agora' })).toBeVisible({
      timeout: 30_000,
    });
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state,
      ),
    ).toBe('installed');
    await expect(page.locator('meta[name="maratona-build"]')).toHaveAttribute('content', 'a');
    await page.getByRole('button', { name: 'Atualizar agora' }).click();
    await expect(page.locator('meta[name="maratona-build"]')).toHaveAttribute('content', 'b', {
      timeout: 30_000,
    });
  } finally {
    await servidor.fechar();
  }
});
