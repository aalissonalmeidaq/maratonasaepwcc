import { expect, test, type Page } from '@playwright/test';

// Contas fictícias do supabase/seed.sql (somente ambiente local). Rodar após `supabase db reset`:
// na turma "3º ano A (fictícia)", Elisa e Fábio começam sem equipe.
const SENHA = 'senha-local-123';

test.describe.configure({ mode: 'serial' });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

test('aluna convida colega em até 3 interações a partir de "Minha equipe" (SC-001)', async ({
  page,
}) => {
  await entrar(page, 'elisa@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await page.getByLabel('Fábio Exemplo').check();
  await page.getByRole('button', { name: 'Enviar convite' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Convite enviado.' })).toBeVisible();
  const enviados = page.getByRole('region', { name: 'Convites enviados' });
  await expect(enviados).toContainText('Fábio Exemplo');
  await expect(enviados).toContainText('Aguardando resposta');
});

test('convidado vê o contador no menu e aceita; os dois veem a equipe (SC-004, FR-016)', async ({
  page,
}) => {
  await entrar(page, 'fabio@exemplo.invalid');
  await expect(
    page.getByRole('link', { name: /Minha equipe.*1 convite pendente/ }).first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Ver convites de equipe/ })).toBeVisible();

  await page.goto('/aluno/dupla');
  await page.getByRole('button', { name: 'Aceitar convite de Elisa Exemplo' }).click();
  await expect(page.getByRole('heading', { name: 'Elisa e Fábio' })).toBeVisible();
  await expect(page.getByRole('link', { name: /convite pendente/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Sair' }).click();
  await entrar(page, 'elisa@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByRole('heading', { name: 'Elisa e Fábio' })).toBeVisible();
  await expect(page.getByText('Fábio Exemplo')).toBeVisible();
});

test('aluno de outra turma não vê a equipe nem os colegas da turma A (FR-005)', async ({
  page,
}) => {
  await entrar(page, 'iris@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByRole('heading', { name: 'Minha equipe', level: 1 })).toBeVisible();
  await expect(page.getByText('Elisa Exemplo')).toHaveCount(0);
  await expect(page.getByText('Fábio Exemplo')).toHaveCount(0);
});

// US2 — turma "3º ano C (fictícia)": cinco alunos (ímpar) e nenhuma equipe no seed.
test('trio: aceite parcial, retirada e nova formação (US2, FR-014)', async ({ page }) => {
  await entrar(page, 'gabi@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByText(/dois para o trio da turma/)).toBeVisible();
  await page.getByLabel('Heitor Exemplo').check();
  await page.getByLabel('Lia Exemplo').check();
  await page.getByRole('button', { name: 'Enviar convite' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Convite enviado.' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await entrar(page, 'heitor@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByText(/convidou você e Lia Exemplo para formar um trio/)).toBeVisible();
  await page.getByRole('button', { name: 'Aceitar convite de Gabi Exemplo' }).click();
  await expect(page.getByText(/Aguardando outro aceite/)).toBeVisible();
  await page.getByRole('button', { name: 'Retirar aceite' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Aceite retirado.' })).toBeVisible();
  await expect(page.getByText('Nenhum convite recebido.')).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await entrar(page, 'gabi@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await page.getByLabel('Heitor Exemplo').check();
  await page.getByLabel('Lia Exemplo').check();
  await page.getByRole('button', { name: 'Enviar convite' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Convite enviado.' })).toBeVisible();

  for (const email of ['heitor@exemplo.invalid', 'lia@exemplo.invalid']) {
    await page.getByRole('button', { name: 'Sair' }).click();
    await entrar(page, email);
    await page.goto('/aluno/dupla');
    await page.getByRole('button', { name: 'Aceitar convite de Gabi Exemplo' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Gabi, Heitor e Lia' })).toBeVisible();
  await expect(page.getByText('Trio', { exact: true })).toBeVisible();
});

test('dupla da US1 continua formada depois do trio (regressão)', async ({ page }) => {
  await entrar(page, 'elisa@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByRole('heading', { name: 'Elisa e Fábio' })).toBeVisible();
});

// US3 — nome escolhido uma vez pela equipe; depois, só docente/mentor da turma renomeiam.
test('equipe escolhe o nome uma vez; docente renomeia; coordenação não (FR-008)', async ({
  page,
}) => {
  await entrar(page, 'elisa@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByText(/só pode ser escolhido uma vez/)).toBeVisible();
  await page.getByLabel('Nome da equipe').fill('Equipe Cometa');
  await page.getByRole('button', { name: 'Salvar nome' }).click();
  await expect(page.getByRole('heading', { name: 'Equipe Cometa' })).toBeVisible();
  await expect(page.getByLabel('Nome da equipe')).toHaveCount(0);

  await page.getByRole('button', { name: 'Sair' }).click();
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/duplas');
  const naCoordenacao = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: 'Equipe Cometa' }) });
  await naCoordenacao.getByRole('button', { name: 'Alterar equipe' }).click();
  await expect(naCoordenacao.getByLabel('Renomear equipe')).toHaveCount(0);

  await page.getByRole('button', { name: 'Sair' }).click();
  await entrar(page, 'docente@exemplo.invalid');
  await page.goto('/docente/turmas');
  const cartao = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: 'Equipe Cometa' }) });
  await cartao.getByRole('button', { name: 'Alterar equipe' }).click();
  await cartao.getByLabel('Renomear equipe').check();
  await cartao.getByLabel('Novo nome').fill('Equipe Estrela');
  await cartao.getByLabel('Justificativa').fill('Nome repetido em outra turma do evento');
  await cartao.getByRole('button', { name: 'Registrar novo nome' }).click();
  await expect(page.getByRole('heading', { name: 'Equipe Estrela' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await entrar(page, 'fabio@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByRole('heading', { name: 'Equipe Estrela' })).toBeVisible();
  await expect(page.getByLabel('Nome da equipe')).toHaveCount(0);
});

test('nomes já existentes são preservados (Dupla Órbita do seed)', async ({ page }) => {
  await entrar(page, 'aluna@exemplo.invalid');
  await page.goto('/aluno/dupla');
  await expect(page.getByRole('heading', { name: 'Dupla Órbita' })).toBeVisible();
  await expect(page.getByLabel('Nome da equipe')).toHaveCount(0);
});
