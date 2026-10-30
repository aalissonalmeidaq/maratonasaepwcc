import { expect, test, type Page } from '@playwright/test';

async function entrarComo(page: Page, nome: RegExp) {
  await page.goto('/entrar');
  await expect(page.getByText(/modo demonstração — dados fictícios/i).first()).toBeVisible();
  await semRolagemHorizontal(page);
  await page.getByRole('button', { name: nome }).click();
}

/** Garante que não há rolagem horizontal (SC-004). */
async function semRolagemHorizontal(page: Page) {
  // Compara com a largura do dispositivo: no celular o navegador alarga a própria viewport
  // quando o conteúdo estoura, então innerWidth não serve de referência.
  const larguraDoDispositivo = page.viewportSize()?.width ?? 0;
  const larguraDoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(larguraDoDocumento).toBeLessThanOrEqual(larguraDoDispositivo);
}

async function abrirMenuSeNecessario(page: Page) {
  // Aguarda o layout autenticado antes de decidir (isVisible não espera).
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
  const botao = page.getByRole('button', { name: 'Abrir menu' });
  if (await botao.isVisible()) await botao.click();
}

async function navegarPeloMenu(page: Page, nome: string) {
  await abrirMenuSeNecessario(page);
  await page
    .locator('nav:not([aria-label="Acesso rápido"])')
    .getByRole('link', { name: nome, exact: true })
    .click();
}

test.describe('jornadas por perfil (modo demonstração)', () => {
  test('aluno vê a pontuação da dupla e o ranking sem notas individuais', async ({ page }) => {
    await entrarComo(page, /ana exemplo/i);
    await expect(page).toHaveURL(/\/aluno$/);
    await expect(page.getByRole('heading', { level: 1, name: /olá, ana/i })).toBeVisible();
    await expect(page.getByText('até 400 pontos')).toBeVisible();
    await semRolagemHorizontal(page);

    await navegarPeloMenu(page, 'Ranking');
    await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeVisible();
    await expect(
      page
        .getByText(/(sua dupla)/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(page.getByText(/notas individuais não são exibidas/i)).toBeVisible();
    await semRolagemHorizontal(page);
  });

  test('aluno não acessa a área da coordenação pela URL', async ({ page }) => {
    await entrarComo(page, /ana exemplo/i);
    await expect(page).toHaveURL(/\/aluno$/);
    await page.goto('/coordenacao');
    await expect(page.getByRole('heading', { name: /acesso não autorizado/i })).toBeVisible();
    await expect(page.getByText(/visão geral/i)).toHaveCount(0);
  });

  test('envio de entrega não simula sucesso no modo demonstração', async ({ page }) => {
    await entrarComo(page, /ana exemplo/i);
    await navegarPeloMenu(page, 'Desafios e entregas');
    await expect(page.getByText(/envio indisponível no modo demonstração/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar entrega/i }).first()).toBeDisabled();
  });

  test('docente vê turmas vinculadas e rubricas', async ({ page }) => {
    await entrarComo(page, /lúcia exemplo/i);
    await expect(page).toHaveURL(/\/docente$/);
    await navegarPeloMenu(page, 'Avaliações');
    await expect(page.getByText('Entrega prática — até 40 pontos')).toBeVisible();
    await expect(page.getByText('Apresentação — até 10 pontos')).toBeVisible();
    await semRolagemHorizontal(page);
  });

  test('coordenação vê indicadores, ranking por categoria e premiação a confirmar', async ({
    page,
  }) => {
    await entrarComo(page, /coordenação \(fictícia\)/i);
    await expect(page).toHaveURL(/\/coordenacao$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
    await semRolagemHorizontal(page);

    await navegarPeloMenu(page, 'Premiação');
    await expect(page.getByText('A confirmar').first()).toBeVisible();

    await navegarPeloMenu(page, 'Ranking');
    await expect(page.getByText('(compartilhada)').filter({ visible: true }).first()).toBeVisible();
  });

  test('sem conexão, a aplicação avisa a pessoa usuária', async ({ page, context }) => {
    await entrarComo(page, /ana exemplo/i);
    await context.setOffline(true);
    await expect(page.getByText(/você está sem conexão/i)).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText(/você está sem conexão/i)).toHaveCount(0);
  });

  test('sair encerra a sessão de demonstração', async ({ page }) => {
    await entrarComo(page, /lúcia exemplo/i);
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto('/docente');
    await expect(page).toHaveURL(/\/entrar$/);
  });
});

test('menu do celular pode ser fechado pelo botão (não fica coberto)', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'menu recolhível só existe em telas pequenas');
  await entrarComo(page, /ana exemplo/i);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.locator('#menu-movel').getByRole('link', { name: 'Ranking' })).toBeVisible();
  const fechar = page.getByRole('button', { name: 'Fechar menu' });
  // O botão precisa ser o elemento visível no próprio centro (não coberto pelo painel).
  const coberto = await fechar.evaluate((b) => {
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(el && b.contains(el));
  });
  expect(coberto).toBe(false);
  await fechar.click();
  await expect(page.locator('#menu-movel')).toHaveCount(0);
});

test('atalhos do painel levam às seções do perfil', async ({ page }) => {
  await entrarComo(page, /ana exemplo/i);
  const atalhos = page.getByRole('navigation', { name: 'Acesso rápido' });
  await expect(atalhos.getByRole('link')).toHaveCount(6);
  await atalhos.getByRole('link', { name: 'Ranking' }).click();
  await expect(page).toHaveURL(/\/aluno\/ranking$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeVisible();
});
