import { expect, test, type Page } from '@playwright/test';
import { ultimoEmailPara } from './mailpit';

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

test('coordenação cria conta pela interface e ela aparece nos vínculos (US6)', async ({
  page,
  request,
}) => {
  const nome = `Estudante UI ${Date.now() % 100000}`;
  const email = `ui-${Date.now()}@exemplo.invalid`;
  const inicio = new Date(Date.now() - 1000);
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');
  const cartao = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Criar conta' }) });
  await cartao.getByLabel('Nome completo').fill(nome);
  await cartao.getByLabel('E-mail').fill(email);
  await expect(cartao.getByLabel(/senha/i)).toHaveCount(0);
  await cartao.getByLabel('Turma', { exact: true }).selectOption({ label: '3º ano A (fictícia)' });
  await cartao.getByRole('button', { name: 'Criar conta' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: `Enviamos o convite para ${email}` }),
  ).toBeVisible();
  expect(await ultimoEmailPara(request, email, inicio)).toContain('/primeiro-acesso#t=');
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

test('turma com duplas: curso bloqueado; nome editável e foco devolvido (FR-001)', async ({
  page,
}) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');
  const turmas = page.locator('#turmas');
  await turmas.getByRole('button', { name: 'Editar a turma 3º ano A (fictícia)' }).click();
  const curso = turmas.getByLabel('Curso', { exact: true });
  await expect(curso).toBeDisabled();
  await expect(
    turmas.getByText('Esta turma já tem duplas; o curso não pode ser alterado.'),
  ).toBeVisible();
  await expect(turmas.getByLabel('Nome da turma')).toBeFocused();
  await turmas.getByRole('button', { name: 'Cancelar' }).click();
  await expect(
    turmas.getByRole('button', { name: 'Editar a turma 3º ano A (fictícia)' }),
  ).toBeFocused();
});

test('ambientes: edita; em uso não é removido e lista os encontros (FR-012)', async ({ page }) => {
  const nome = `Sala E2E ${Date.now() % 100000}`;
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/encontros');
  const ambientes = page.locator('#ambientes');

  await ambientes.getByLabel('Nome do ambiente').fill(nome);
  await ambientes.getByRole('button', { name: 'Adicionar ambiente' }).click();
  await expect(ambientes.getByRole('status').filter({ hasText: 'Ambiente salvo.' })).toBeVisible();

  await ambientes.getByRole('button', { name: `Editar o ambiente ${nome}` }).click();
  await ambientes.getByLabel('Observações').fill('Bloco C');
  await ambientes.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(
    ambientes.getByRole('status').filter({ hasText: 'Ambiente atualizado.' }),
  ).toBeVisible();
  await ambientes.getByRole('button', { name: 'Concluir' }).click();
  await ambientes.getByRole('searchbox', { name: 'Buscar em Ambientes' }).fill(nome);
  await expect(ambientes.getByRole('cell', { name: 'Bloco C', exact: true })).toBeVisible();
  await ambientes.getByRole('searchbox', { name: 'Buscar em Ambientes' }).fill('');

  await ambientes
    .getByRole('button', { name: 'Remover o ambiente Laboratório 1 (exemplo)' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Este ambiente está em uso nos encontros: 1 —' }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await expect(
    ambientes.getByRole('cell', { name: 'Laboratório 1 (exemplo)', exact: true }),
  ).toBeVisible();

  await ambientes.getByRole('button', { name: `Remover o ambiente ${nome}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover' }).click();
  await expect(ambientes.getByRole('cell', { name: nome, exact: true })).toHaveCount(0);
});

test('importação CSV: prévia, relatório do servidor e convites (FR-015)', async ({
  page,
  request,
}) => {
  const n = Date.now() % 1_000_000;
  const novo1 = `csv-a-${n}@exemplo.invalid`;
  const novo2 = `csv-b-${n}@exemplo.invalid`;
  const existente = `csv-existente-${n}@exemplo.invalid`;
  const inicio = new Date(Date.now() - 1000);

  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/organizacao');

  // Conta que já existe na edição, sem turma (papel de apoio).
  const conta = page.locator('#criar-conta');
  await conta.getByLabel('Nome completo').fill('Pessoa Existente CSV');
  await conta.getByLabel('E-mail').fill(existente);
  await conta.getByLabel('Papel').selectOption({ label: 'Apoio técnico-administrativo' });
  await conta.getByRole('button', { name: 'Criar conta' }).click();
  await expect(conta.getByRole('status').filter({ hasText: 'Conta criada' })).toBeVisible();

  const csv = [
    'nome;email',
    `Aluno Novo Um;${novo1}`,
    `Aluno Novo Dois;${novo2}`,
    `Pessoa Existente CSV;${existente}`,
    'Íris Exemplo;iris@exemplo.invalid',
    'Sem E-mail;nao-e-email',
    `Repetido;${novo1}`,
  ].join('\n');

  const importar = page.locator('#importar-alunos');
  await importar
    .getByLabel('Turma', { exact: true })
    .selectOption({ label: '3º ano A (fictícia)' });
  await importar.getByLabel('Arquivo CSV').setInputFiles({
    name: 'alunos.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  await expect(
    importar.getByText('4 alunos prontos para importar · 2 linhas recusadas'),
  ).toBeVisible();

  await importar.getByRole('button', { name: 'Importar 4 alunos' }).click();
  await expect(
    importar.getByText('Importação concluída: 2 contas criadas, 1 vinculada, 1 recusada.'),
  ).toBeVisible();
  await expect(
    importar
      .getByRole('table', { name: 'Linhas recusadas pelo servidor' })
      .getByRole('cell', { name: 'Já ativo em outra turma desta edição.' }),
  ).toBeVisible();

  expect(await ultimoEmailPara(request, novo1, inicio)).toContain('/primeiro-acesso#t=');
  expect(await ultimoEmailPara(request, novo2, inicio)).toContain('/primeiro-acesso#t=');
});
