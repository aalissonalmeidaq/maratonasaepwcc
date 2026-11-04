import { expect, test, type Page } from '@playwright/test';

// Spec 010 — gestão de edições, turmas e vínculos (quickstart.md, jornadas 2–6). Contas fictícias
// do seed: coordenacao@ coordena a edição de teste; mentor@ (Marcos) e Gabi participam dela.
// A edição criada aqui termina encerrada, para não virar a edição padrão dos outros testes.
const SENHA = 'senha-local-123';
const sufixo = Date.now().toString(36);
const EDICAO = `Maratona E2E ${sufixo}`;
const CURSO = `Curso E2E ${sufixo}`;
const TURMA = `Turma E2E ${sufixo}`;

test.describe.configure({ mode: 'serial', timeout: 180_000 });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

test('fluxo da edição: criar → cadastro → vincular → enturmar → mentor → ativar → encerrar', async ({
  page,
}) => {
  await entrar(page, 'coordenacao@exemplo.invalid');

  // 1. Criar a edição (US1).
  await page.goto('/coordenacao/edicoes');
  await page.getByRole('button', { name: 'Nova edição' }).click();
  await page.getByLabel('Nome').first().fill(EDICAO);
  await page.getByLabel('Início').first().fill('2030-03-01');
  await page.getByLabel('Fim').first().fill('2030-11-30');
  await page.getByRole('button', { name: 'Criar edição' }).click();
  await expect(page.getByText('Edição criada.')).toBeVisible();
  await expect(page.getByLabel('Edição em uso')).toBeVisible();

  // 2. Cadastro permanente (US2).
  await page.goto('/coordenacao/cadastro');
  const novoCurso = page.getByRole('region', { name: 'Novo curso' });
  await novoCurso.getByLabel('Nome do curso').fill(CURSO);
  await novoCurso.getByLabel('Categoria do ranking').fill('Categoria E2E');
  await novoCurso.getByRole('button', { name: 'Adicionar curso' }).click();
  await expect(novoCurso.getByRole('status').filter({ hasText: 'Curso salvo.' })).toBeVisible();
  const novaTurma = page.getByRole('region', { name: 'Nova turma' });
  await novaTurma.getByLabel('Curso', { exact: true }).selectOption({ label: CURSO });
  await novaTurma.getByLabel('Nome da turma').fill(TURMA);
  await novaTurma.getByRole('button', { name: 'Adicionar turma' }).click();
  await expect(novaTurma.getByRole('status').filter({ hasText: 'Turma salva.' })).toBeVisible();

  // 3. Vincular a turma em até 3 interações (SC-002): marcar e vincular.
  await page.goto('/coordenacao/organizacao');
  await page.getByRole('checkbox', { name: `${TURMA} (${CURSO})` }).check();
  await page.getByRole('button', { name: 'Vincular selecionadas' }).click();
  await expect(page.getByText('Turmas vinculadas.')).toBeVisible();

  // 4. Mentor por curso (US4).
  const mentores = page.locator('#mentores').getByRole('region', { name: CURSO });
  await mentores.getByLabel('Buscar mentor pelo nome').fill('Marcos');
  await mentores.getByRole('button', { name: 'Buscar' }).click();
  await mentores.getByRole('button', { name: 'Vincular Marcos Exemplo (mentor) ao curso' }).click();
  await expect(mentores.getByText('Marcos Exemplo (mentor) vinculado ao curso.')).toBeVisible();

  // 5. Enturmação na tela da turma (US3).
  await page.getByRole('link', { name: `Gerir turma ${TURMA}` }).click();
  const gestao = page.getByRole('region', { name: 'Alunos e docentes' });
  await gestao.getByLabel('Buscar pessoa pelo nome').fill('Gabi');
  await gestao.getByRole('button', { name: 'Buscar' }).click();
  await gestao.getByRole('button', { name: 'Vincular Gabi Exemplo' }).click();
  await expect(gestao.getByText('Gabi Exemplo vinculado à turma.')).toBeVisible();
  await expect(gestao.getByRole('region', { name: 'Mentores', exact: true })).toContainText(
    'Marcos Exemplo (mentor)',
  );

  // 6. Ativar e encerrar com pendências (US5).
  await page.goto('/coordenacao/edicoes');
  await page.getByRole('button', { name: 'Ativar edição' }).click();
  await expect(page.getByText('Edição ativada.')).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar edição' }).click();
  const dialogo = page.getByRole('dialog');
  // Spec 013: a pendência de ranking é por turma; a turma E2E não tem equipes, então não entra.
  await expect(dialogo).toContainText('Todas as turmas têm o ranking definitivo');
  await dialogo.getByLabel('Justificativa').fill('Fim do ciclo de teste E2E.');
  await dialogo.getByRole('button', { name: 'Encerrar' }).click();
  await expect(page.getByText(/Edição encerrada em .*: Fim do ciclo de teste E2E\./)).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Pendências registradas no encerramento' }),
  ).toContainText('Todas as turmas têm o ranking definitivo');

  // Encerrada: só leitura.
  await page.goto('/coordenacao/organizacao');
  await expect(page.getByRole('button', { name: 'Vincular selecionadas' })).toHaveCount(0);
});
