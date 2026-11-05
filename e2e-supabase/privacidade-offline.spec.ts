import { expect, test } from '@playwright/test';
test('PWA real: três perfis e logout sem persistir respostas privadas', async ({
  page,
  context,
}) => {
  await page.goto('/regulamento');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  for (const perfil of ['coordenacao', 'docente', 'aluno']) {
    await page.goto('/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill(`${perfil}@exemplo.invalid`);
    await page.getByLabel('Senha', { exact: true }).fill('senha-local-123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${perfil}`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto(`/${perfil}/${perfil === 'aluno' ? 'pontuacao' : 'encontros'}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Sair', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/entrar$/);
  }
  const armazenamento = await page.evaluate(async () => {
    const cachesSalvos = await Promise.all(
      (await caches.keys()).map(async (nome) => {
        const c = await caches.open(nome);
        return (await c.keys()).map((r) => r.url);
      }),
    );
    return {
      caches: cachesSalvos.flat(),
      local: Object.entries(localStorage),
      bancos: (await indexedDB.databases()).map((d) => d.name),
    };
  });
  expect(armazenamento.caches.length).toBeGreaterThan(0);
  expect(
    armazenamento.caches.some((url) => /\/rest\/|\/auth\/|\/storage\/|\/rpc\//.test(url)),
  ).toBe(false);
  expect(
    armazenamento.local.filter(
      ([k, valor]) =>
        !k.startsWith('maratona:regulamento-publico:v1:') &&
        !(/^maratona:edicao:[\da-f-]{36}$/.test(k) && /^[\da-f-]{36}$/.test(valor)),
    ),
  ).toEqual([]);
  expect(armazenamento.bancos.filter((n) => !n?.startsWith('workbox'))).toEqual([]);
  await context.setOffline(true);
  await page.goto('/regulamento');
  await expect(page.getByText(/Conteúdo salvo em/)).toBeVisible();
});
