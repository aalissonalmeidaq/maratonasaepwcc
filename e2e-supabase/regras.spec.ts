import { expect, test, type Page } from '@playwright/test';

// Spec 011 — regras da edição e das turmas (quickstart.md). Contas fictícias do seed:
// coordenacao@ coordena a edição de teste; mentor@ (Marcos) é mentor do curso do 3º ano A;
// aluna@ (Ana) está no 3º ano A. Ao fim, o teste devolve as regras ao que eram (versão nova sem o
// critério extra, turma herdando tudo e todos os encontros), para não afetar os outros testes.
const SENHA = 'senha-local-123';
const sufixo = Date.now().toString(36);
const CRITERIO = `Documentação E2E ${sufixo}`;
const CLAREZA = `Clareza da turma ${sufixo}`;
const TURMA_A = '/turmas/d0000000-0000-0000-0000-000000000001';
const TURMA_B = '/turmas/d0000000-0000-0000-0000-000000000002';

test.describe.configure({ mode: 'serial', timeout: 180_000 });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

async function gravarVersao(page: Page, rotulo: string, justificativa: string) {
  const regras = page.getByRole('region', { name: 'Regras da edição' });
  await regras.getByLabel('Nome da versão').fill(rotulo);
  await regras.getByLabel('Justificativa').fill(justificativa);
  await regras.getByRole('button', { name: 'Gravar versão' }).click();
  await expect(regras.getByText('Versão das regras gravada.')).toBeVisible();
}

test('regras: versão da edição → ajuste da turma → encontros da turma → regulamento da aluna', async ({
  page,
}) => {
  // 1. Coordenação acrescenta um critério à entrega e grava a versão (US1).
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/edicoes');
  const entrega = page
    .getByRole('region', { name: 'Regras da edição' })
    .getByRole('group', { name: 'Entrega e atrasos' });
  await entrega.getByRole('button', { name: 'Adicionar critério' }).click();
  await entrega.getByLabel('Nome do critério').last().fill(CRITERIO);
  await entrega.getByLabel('Pontuação máxima').last().fill('5');
  await gravarVersao(page, `E2E ${sufixo}`, 'Critério de documentação no teste de ponta a ponta.');

  // 2. Coordenação tira o encontro 2 (sem lançamentos) do 3º ano B (US3).
  await page.goto(`/coordenacao${TURMA_B}`);
  const encontros = page.getByRole('region', { name: 'Encontros da turma' });
  await encontros.getByRole('checkbox', { name: /^2\. / }).uncheck();
  await encontros.getByRole('button', { name: 'Gravar encontros da turma' }).click();
  await expect(encontros.getByText('Encontros da turma gravados.')).toBeVisible();
  await expect(page.getByText(/Pontuação máxima da turma: .* \(3 encontros\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();

  // 3. Mentor define a apresentação do 3º ano A (US2).
  await entrar(page, 'mentor@exemplo.invalid');
  await page.goto(`/docente${TURMA_A}`);
  const regrasDaTurma = page.getByRole('region', { name: 'Regras da turma' });
  await expect(regrasDaTurma.getByRole('group', { name: 'Penalidades' })).toHaveCount(0);
  const apresentacao = regrasDaTurma.getByRole('group', { name: 'Apresentação' });
  await apresentacao.getByRole('radio', { name: 'Definir para a turma' }).check();
  await apresentacao.getByLabel('Nome do critério').first().fill(CLAREZA);
  await regrasDaTurma.getByLabel('Justificativa').fill('Rubrica de apresentação própria da turma.');
  await regrasDaTurma.getByRole('button', { name: 'Gravar regras da turma' }).click();
  await expect(regrasDaTurma.getByText('Regras da turma gravadas.')).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();

  // 4. A aluna do 3º ano A vê as regras da turma e a pontuação máxima no regulamento (US5).
  await entrar(page, 'aluna@exemplo.invalid');
  await page.goto('/aluno/regulamento');
  const itemApresentacao = page.getByText('Apresentação:').locator('xpath=ancestor::li');
  await expect(itemApresentacao).toContainText(CLAREZA.toLowerCase());
  await expect(itemApresentacao).toContainText('definido para a sua turma');
  await expect(page.getByText('Pontuação máxima da turma:')).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();

  // 5. Coordenação devolve tudo ao que era.
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto(`/coordenacao${TURMA_A}`);
  const daTurmaA = page.getByRole('region', { name: 'Regras da turma' });
  await daTurmaA
    .getByRole('group', { name: 'Apresentação' })
    .getByRole('radio', { name: 'Herdar da edição' })
    .check();
  await daTurmaA.getByLabel('Justificativa').fill('Fim do teste: a turma volta a herdar tudo.');
  await daTurmaA.getByRole('button', { name: 'Gravar regras da turma' }).click();
  await expect(daTurmaA.getByText('Regras da turma gravadas.')).toBeVisible();

  await page.goto(`/coordenacao${TURMA_B}`);
  const encontrosB = page.getByRole('region', { name: 'Encontros da turma' });
  await encontrosB.getByRole('checkbox', { name: /^2\. / }).check();
  await encontrosB.getByRole('button', { name: 'Gravar encontros da turma' }).click();
  await expect(encontrosB.getByText('Encontros da turma gravados.')).toBeVisible();

  await page.goto('/coordenacao/edicoes');
  await page
    .getByRole('region', { name: 'Regras da edição' })
    .getByRole('button', { name: `Remover ${CRITERIO}` })
    .click();
  await gravarVersao(page, `E2E ${sufixo} restaurada`, 'Fim do teste: volta às regras de antes.');
});
