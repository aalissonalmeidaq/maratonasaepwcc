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
  // A lista de vínculos é paginada: a busca encontra a conta nova em qualquer página.
  await page.getByRole('searchbox', { name: 'Buscar em Vínculos da edição' }).fill(nome);
  await expect(page.getByRole('cell', { name: nome, exact: true })).toBeVisible();
});

test('coordenação edita curso e o novo nome vem do servidor após recarregar (FR-001)', async ({
  page,
}) => {
  const sufixo = Date.now() % 100000;
  const original = `Curso E2E ${sufixo}`;
  const editado = `Curso E2E editado ${sufixo}`;
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');
  const cursos = page.locator('#cursos');
  await cursos.getByLabel('Nome do curso').fill(original);
  await cursos.getByLabel('Categoria do ranking').fill('Categoria E2E');
  await cursos.getByRole('button', { name: 'Adicionar curso' }).click();
  await expect(cursos.getByRole('status').filter({ hasText: 'Curso salvo.' })).toBeVisible();

  await cursos.getByRole('searchbox', { name: 'Buscar em Cursos da edição' }).fill(original);
  await cursos.getByRole('button', { name: `Editar o curso ${original}` }).click();
  await expect(cursos.getByRole('heading', { name: `Editar curso “${original}”` })).toBeVisible();
  await expect(cursos.getByLabel('Nome do curso')).toBeFocused();
  await cursos.getByLabel('Nome do curso').fill(editado);
  await cursos.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(cursos.getByRole('status').filter({ hasText: 'Curso atualizado.' })).toBeVisible();
  await cursos.getByRole('button', { name: 'Concluir' }).click();
  await expect(cursos.getByRole('heading', { name: 'Novo curso' })).toBeVisible();

  await page.reload();
  await page
    .locator('#cursos')
    .getByRole('searchbox', { name: 'Buscar em Cursos da edição' })
    .fill(`${sufixo}`);
  await expect(page.getByRole('cell', { name: editado, exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: original, exact: true })).toHaveCount(0);
});

test('coordenação edita turma: o nome repetido no curso é recusado pelo servidor', async ({
  page,
}) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');
  const turmas = page.locator('#turmas');
  await turmas.getByRole('button', { name: 'Editar a turma 3º ano A (fictícia)' }).click();
  await turmas
    .getByLabel('Curso', { exact: true })
    .selectOption({ label: 'Curso Técnico Exemplo B' });
  await turmas.getByLabel('Nome da turma').fill('3º ano B (fictícia)');
  await turmas.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(
    turmas.getByRole('alert').filter({ hasText: 'Já existe uma turma com esse nome neste curso.' }),
  ).toBeVisible();
  await turmas.getByRole('button', { name: 'Cancelar' }).click();
  await expect(
    turmas.getByRole('button', { name: 'Editar a turma 3º ano A (fictícia)' }),
  ).toBeFocused();
});
