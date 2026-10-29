import { expect, test, type Page } from '@playwright/test';

// Contas fictícias do supabase/seed.sql (somente ambiente local).
const SENHA = 'senha-local-123';
const NOME_DUPLA = `Dupla E2E ${Date.now() % 100000}`;

test.describe.configure({ mode: 'serial' });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

test('coordenação forma dupla com confirmação do servidor (US3)', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/duplas');
  await page.getByLabel('Turma').selectOption({ label: '3º ano A (fictícia)' });
  await page.getByLabel('Nome da dupla').fill(NOME_DUPLA);
  await page.getByLabel('Integrante 1').selectOption({ label: 'Elisa Exemplo' });
  await page.getByLabel('Integrante 2').selectOption({ label: 'Fábio Exemplo' });
  await page.getByRole('button', { name: 'Formar dupla' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Dupla formada.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: NOME_DUPLA })).toBeVisible();
});

test('servidor recusa estudante que já está em dupla ativa', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/duplas');
  await page.getByLabel('Turma').selectOption({ label: '3º ano A (fictícia)' });
  // Elisa e Fábio agora estão em dupla: não devem mais aparecer como opção.
  const opcoes = await page.getByLabel('Integrante 1').locator('option').allTextContents();
  expect(opcoes).not.toContain('Elisa Exemplo');
  expect(opcoes).not.toContain('Fábio Exemplo');
});

test('aluna vê a própria dupla e o colega (FR-008)', async ({ page }) => {
  await entrar(page, 'elisa@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByRole('heading', { name: NOME_DUPLA })).toBeVisible();
  await expect(page.getByText('Fábio Exemplo')).toBeVisible();
  await page.goto('/coordenacao/duplas');
  await expect(page.getByRole('heading', { name: /acesso não autorizado/i })).toBeVisible();
});

test('docente vê a dupla na turma vinculada', async ({ page }) => {
  await entrar(page, 'docente@exemplo.invalid');
  await page.goto('/docente/turmas');
  await expect(page.getByText(NOME_DUPLA).first()).toBeVisible();
});

test('docente de outra turma não vê a dupla', async ({ page }) => {
  await entrar(page, 'docente2@exemplo.invalid');
  await page.goto('/docente/turmas');
  await expect(page.getByRole('heading', { name: '3º ano B (fictícia)' })).toBeVisible();
  await expect(page.getByText(NOME_DUPLA)).toHaveCount(0);
});

test('coordenação desfaz a dupla com justificativa e mantém o histórico', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/duplas');
  const cartao = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: NOME_DUPLA }) });
  await cartao.getByRole('button', { name: 'Alterar dupla' }).click();
  await cartao.getByLabel('Desfazer dupla').check();

  await cartao.getByLabel('Justificativa').fill('curta');
  await cartao.getByRole('button', { name: 'Desfazer dupla' }).click();
  await expect(cartao.getByText(/pelo menos 10 caracteres/)).toBeVisible();

  await cartao.getByLabel('Justificativa').fill('Limpeza do teste automatizado E2E');
  await cartao.getByRole('button', { name: 'Desfazer dupla' }).click();
  await expect(cartao.getByText('Desfeita')).toBeVisible();

  await cartao.getByRole('button', { name: 'Ver histórico' }).click();
  await expect(cartao.getByText(/Motivo: Limpeza do teste automatizado E2E/).first()).toBeVisible();
});

test('encontros: edição completa não oferece novo encontro (US4)', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/encontros');
  await expect(
    page.getByText('Todos os encontros configurados já foram cadastrados.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar encontro' })).toHaveCount(0);
});

test('curso com nome repetido: servidor recusa com mensagem clara (US1)', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');
  await page.getByLabel('Nome do curso').fill('Curso Técnico Exemplo A');
  await page.getByLabel('Categoria do ranking').fill('Categoria A (exemplo)');
  await page.getByRole('button', { name: 'Adicionar curso' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Já existe um curso com esse nome nesta edição.' }),
  ).toBeVisible();
});

test('coordenação cria conta pela interface e ela aparece nos vínculos (US6)', async ({ page }) => {
  const nome = `Estudante UI ${Date.now() % 100000}`;
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');
  const cartao = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Criar conta' }) });
  await cartao.getByLabel('Nome completo').fill(nome);
  await cartao.getByLabel('E-mail').fill(`ui-${Date.now()}@exemplo.invalid`);
  await cartao.getByLabel('Senha provisória').fill('provisoria-123');
  await cartao.getByLabel('Turma', { exact: true }).selectOption({ label: '3º ano A (fictícia)' });
  await cartao.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Conta criada' })).toBeVisible();
  await expect(page.getByRole('cell', { name: nome, exact: true })).toBeVisible();
});
