import { expect, test, type Page } from '@playwright/test';

// Spec 018 — as premissas saíram do site: nenhuma rota, item de menu ou aviso, em nenhum perfil.
const PERFIS = [
  { nome: 'master', conta: /master/i, rota: '/master/premissas' },
  { nome: 'gestão', conta: /gestão/i, rota: '/gestao/premissas' },
  { nome: 'coordenação', conta: /coordenação/i, rota: '/coordenacao/premissas' },
  { nome: 'docente', conta: /lúcia exemplo/i, rota: '/docente/premissas' },
];

async function entrarComo(page: Page, conta: RegExp) {
  await page.goto('/entrar');
  await page.getByRole('button', { name: conta }).click();
  await expect(page).not.toHaveURL(/entrar$/);
}

for (const perfil of PERFIS) {
  test(`${perfil.nome}: sem item de menu, sem aviso e a rota antiga não existe`, async ({
    page,
  }) => {
    await entrarComo(page, perfil.conta);
    await expect(page.locator('#conteudo')).toBeVisible();
    await expect(page.getByText(/Premissas aguardando resposta/)).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: /Premissas em validação/, includeHidden: true }),
    ).toHaveCount(0);
    await page.goto(perfil.rota);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeVisible();
  });
}
