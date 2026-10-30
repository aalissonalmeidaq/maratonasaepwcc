import { expect, test, type Page } from '@playwright/test';

// Contas fictícias do supabase/seed.sql (somente ambiente local). Rodar após `supabase db reset`.
// As outras specs alteram equipes da turma A; por isso os números são conferidos entre si
// (SC-003), não contra valores fixos.
const SENHA = 'senha-local-123';
const TURMA_B = 'd0000000-0000-0000-0000-000000000002';

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('#conteudo')).toBeVisible();
}

const indicador = (page: Page, rotulo: string) =>
  page
    .locator('p', { hasText: new RegExp(`^${rotulo}$`) })
    .locator('xpath=following-sibling::p[1]');

test('docente abre o painel da turma em duas interações; indicadores batem com as listas', async ({
  page,
}) => {
  await entrar(page, 'docente@exemplo.invalid');
  await page
    .getByRole('navigation', { name: 'Acesso rápido' })
    .getByRole('link', { name: 'Minhas turmas' })
    .click();
  await page
    .getByRole('link', { name: /Abrir painel da turma/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: '3º ano A (fictícia)' })).toBeVisible();

  const equipes = page
    .getByRole('list', { name: 'Equipes da turma', exact: true })
    .locator(':scope > li');
  await expect(indicador(page, 'Equipes')).toHaveText(String(await equipes.count()));
  const semEquipe = page.getByRole('list', { name: 'Alunos sem equipe' }).locator('li');
  await expect(indicador(page, 'Sem equipe')).toHaveText(String(await semEquipe.count()));
  const com = Number(await indicador(page, 'Com equipe').textContent());
  const sem = Number(await indicador(page, 'Sem equipe').textContent());
  await expect(indicador(page, 'Alunos ativos')).toHaveText(String(com + sem));
  await expect(indicador(page, 'Convites pendentes')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Próximo encontro' })).toContainText(
    'Encontro 3 — Prova oficial (registro)',
  );
  await expect(
    page.getByText('Pontuação disponível a partir dos lançamentos de avaliação.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Alterar equipes' })).toHaveAttribute(
    'href',
    '/docente/turmas',
  );
});

test('docente não vê o painel de turma não vinculada (recusa do servidor)', async ({ page }) => {
  await entrar(page, 'docente@exemplo.invalid');
  await page.goto(`/docente/turmas/${TURMA_B}`);
  await expect(page.getByText('Você não tem acesso a esta turma.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Equipes da turma', exact: true })).toHaveCount(0);
});

test('aluna vê "Minha turma" só com dados coletivos', async ({ page }) => {
  await entrar(page, 'aluna@exemplo.invalid');
  await page
    .getByRole('navigation', { name: 'Acesso rápido' })
    .getByRole('link', { name: 'Minha turma' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: '3º ano A (fictícia)' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Equipes da turma', exact: true })).toContainText(
    'Dupla Órbita',
  );
  await expect(page.getByText('Convites pendentes')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Alterar equipes' })).toHaveCount(0);
  await expect(page.getByText('@exemplo.invalid')).toHaveCount(0);
});

test('coordenação abre o painel de qualquer turma pela Organização', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');
  await page.getByRole('link', { name: 'Painel da turma 3º ano B (fictícia)' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '3º ano B (fictícia)' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Equipes da turma', exact: true })).toContainText(
    'Dupla Faísca',
  );
  await expect(page.getByLabel('Trocar de turma')).toHaveValue(TURMA_B);
  await expect(page.getByRole('link', { name: 'Alterar equipes' })).toHaveAttribute(
    'href',
    '/coordenacao/duplas',
  );
});
