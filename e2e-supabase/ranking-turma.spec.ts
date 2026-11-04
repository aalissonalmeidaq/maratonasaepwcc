import { expect, test, type Page } from '@playwright/test';

// Spec 012 — ranking por turma (quickstart.md). Roda no projeto "paineis", depois das outras
// jornadas: o 3º ano A está na versão 2 (provisória) e o 3º ano B na versão 1 (parcial).
const SENHA = 'senha-local-123';

test.describe.configure({ mode: 'serial', timeout: 180_000 });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

test('coordenação publica duas turmas em lote; a definitiva é recusada só onde há pendência', async ({
  page,
}) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/ranking');
  const lista = page.getByRole('list', { name: 'Turmas da edição' });
  await expect(lista.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('checkbox', { name: 'Selecionar 3º ano A (fictícia)' }).check();
  await page.getByRole('checkbox', { name: 'Selecionar 3º ano B (fictícia)' }).check();

  // SC-003: a partir da tela de ranking, com as turmas marcadas — estado (1) e publicar (2),
  // além da justificativa exigida porque as duas já têm publicação.
  await page.getByRole('radio', { name: 'Definitivo' }).check();
  await page.getByLabel('Justificativa').fill('Tentativa de fechar as turmas do curso.');
  await page.getByRole('button', { name: 'Publicar 2 turmas' }).click();
  const recusadas = page.getByRole('list', { name: 'Recusadas' });
  await expect(recusadas).toContainText('3º ano A (fictícia)');
  await expect(recusadas).toContainText(/pendências/);

  // Parcial em lote: o 3º ano A ganha a versão 3; o 3º ano B já tinha uma parcial idêntica
  // (publicada pelos painéis), e o reenvio idêntico devolve a versão existente sem gravar.
  await page.getByRole('radio', { name: 'Parcial' }).check();
  await page.getByRole('button', { name: 'Publicar 2 turmas' }).click();
  const publicadas = page.getByRole('list', { name: 'Publicadas' });
  await expect(publicadas).toContainText('3º ano A (fictícia) — versão 3');
  await expect(publicadas).toContainText('3º ano B (fictícia) — versão 1');
});

test('aluna vê só o ranking da própria turma e a mesma posição no painel', async ({ page }) => {
  await entrar(page, 'aluna@exemplo.invalid');
  const posicao = page.getByRole('region', { name: 'Posição na turma' });
  await expect(posicao).toContainText(/\dº lugar/);
  await expect(posicao).toContainText('Parcial');
  await page.goto('/aluno/ranking');
  await expect(page.getByRole('heading', { level: 1, name: 'Ranking da turma' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Dupla Órbita' })).toBeVisible();
  await expect(page.getByText('Dupla Faísca')).toHaveCount(0);
});

test('aluna do 3º ano B vê só a própria turma', async ({ page }) => {
  await entrar(page, 'iris@exemplo.invalid');
  await page.goto('/aluno/ranking');
  await expect(page.getByRole('row').filter({ hasText: 'Dupla Faísca' })).toBeVisible();
  await expect(page.getByText('Dupla Órbita')).toHaveCount(0);
});

test('a premiação fica a definir sem publicação definitiva', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/premiacao');
  await expect(page.getByRole('region', { name: 'Premiação — 3º ano A (fictícia)' })).toContainText(
    'A definir',
  );
});
