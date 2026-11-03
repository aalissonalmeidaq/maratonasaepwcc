import { expect, test, type Page } from '@playwright/test';

// Spec 009 — comunicados e regulamento (quickstart.md, jornadas 1–4). Contas fictícias do seed:
// docente@ atua só no 3º ano A, onde estuda Ana; Íris estuda no 3º ano B.
const SENHA = 'senha-local-123';
const sufixo = Date.now().toString(36);
const TITULO_COORD = `Mudança de sala ${sufixo}`;
const TITULO_DOC = `Prova adiada ${sufixo}`;

// Cada jornada entra com três ou quatro contas; o limite padrão de 60 s é curto para isso.
test.describe.configure({ mode: 'serial', timeout: 180_000 });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

async function sair(page: Page) {
  await page.getByRole('button', { name: 'Sair' }).click();
}

test('coordenação publica para os estudantes do 3º ano A; só a turma A vê', async ({ page }) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/comunicados');
  await page.getByRole('button', { name: 'Novo comunicado' }).click();
  await page.getByLabel('Título').fill(TITULO_COORD);
  await page.getByLabel('Texto').fill('O encontro 3 será no laboratório 2.\nLeve o crachá.');
  await page.getByRole('radio', { name: 'Estudantes' }).check();
  await page.getByRole('checkbox', { name: '3º ano A (fictícia)' }).check();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByText('Comunicado publicado.')).toBeVisible();
  await expect(page.getByRole('article', { name: TITULO_COORD })).toContainText('Publicado');
  await sair(page);

  await entrar(page, 'aluna@exemplo.invalid');
  await page.goto('/aluno/regulamento');
  const item = page.getByRole('article', { name: TITULO_COORD });
  await expect(item).toContainText('Novo');
  await expect(item).toContainText('Leve o crachá.');
  await item.getByRole('button', { name: `Marcar como lido: ${TITULO_COORD}` }).click();
  await expect(item.getByText('Comunicado marcado como lido.')).toBeVisible();
  await expect(item.getByText('Novo', { exact: true })).toHaveCount(0);
  await page.goto('/aluno/avisos');
  await expect(page.getByRole('link', { name: `Ler: ${TITULO_COORD}` })).toHaveAttribute(
    'href',
    '/aluno/regulamento',
  );
  await sair(page);

  await entrar(page, 'iris@exemplo.invalid');
  await page.goto('/aluno/regulamento');
  await expect(page.getByRole('region', { name: 'Pontuação por encontro' })).toBeVisible();
  await expect(page.getByRole('article', { name: TITULO_COORD })).toHaveCount(0);
});

test('docente publica em até 4 interações (SC-002), corrige e a coordenação retira', async ({
  page,
}) => {
  await entrar(page, 'docente@exemplo.invalid');
  await page.goto('/docente/comunicados');
  // Interações (cliques), além de digitar título e texto: novo, público, publicar. A única
  // turma do docente já vem marcada.
  await page.getByRole('button', { name: 'Novo comunicado' }).click();
  await page.getByLabel('Título').fill(TITULO_DOC);
  await page.getByLabel('Texto').fill('A prova do encontro 3 terá nova data.');
  await page.getByRole('radio', { name: 'Estudantes' }).check();
  await expect(page.getByRole('checkbox', { name: '3º ano A (fictícia)' })).toBeChecked();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByText('Comunicado publicado.')).toBeVisible();

  const meu = page.getByRole('article', { name: TITULO_DOC });
  await meu.getByRole('button', { name: `Corrigir: ${TITULO_DOC}` }).click();
  await meu.getByLabel('Texto').fill('A prova do encontro 3 será em 26/11.');
  await meu.getByLabel('Justificativa').fill('Data definida pela coordenação.');
  await meu.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(
    page.getByText('Comunicado corrigido; o público foi avisado de novo.'),
  ).toBeVisible();
  await sair(page);

  await entrar(page, 'aluna@exemplo.invalid');
  await page.goto('/aluno/regulamento');
  const recebido = page.getByRole('article', { name: TITULO_DOC });
  await expect(recebido).toContainText('será em 26/11');
  await expect(recebido).toContainText('Atualizado em');
  await expect(recebido).toContainText('Novo');
  await expect(recebido).toContainText('(docente)');
  await sair(page);

  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/comunicados');
  const gerido = page.getByRole('article', { name: TITULO_DOC });
  await gerido.getByRole('button', { name: `Retirar: ${TITULO_DOC}` }).click();
  await gerido.getByLabel('Justificativa da retirada').fill('Data ainda em validação.');
  await gerido.getByRole('button', { name: 'Confirmar retirada' }).click();
  await expect(gerido.getByText('Comunicado retirado.')).toBeVisible();
  await expect(gerido).toContainText('Data ainda em validação.');
  await sair(page);

  await entrar(page, 'aluna@exemplo.invalid');
  await page.goto('/aluno/regulamento');
  await expect(page.getByRole('region', { name: 'Pontuação por encontro' })).toBeVisible();
  await expect(page.getByRole('article', { name: TITULO_DOC })).toHaveCount(0);
});
