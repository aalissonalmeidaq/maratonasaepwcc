import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// Spec 008 — painéis com dados reais e relatórios CSV (quickstart.md). Contas fictícias do seed;
// roda depois das outras jornadas (projeto "paineis"), que já registraram a presença do
// encontro 1 e publicaram o ranking do 3º ano A. O 3º ano B começa sem publicação (spec 012).
const SENHA = 'senha-local-123';
const BOM = '﻿';

test.describe.configure({ mode: 'serial' });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** Exporta pelo formulário e devolve o conteúdo do arquivo baixado. */
async function exportar(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const arquivo = await download;
  expect(arquivo.suggestedFilename()).toMatch(/^maratona-[a-z]+-\d{4}-\d{2}-\d{2}\.csv$/);
  return readFile((await arquivo.path()) as string, 'utf-8');
}

test('docente vê a presença do encontro 2 pendente e ela some depois do registro', async ({
  page,
}) => {
  await entrar(page, 'docente@exemplo.invalid');
  const turmaA = page.getByRole('region', { name: '3º ano A (fictícia)' });
  const pendencia = turmaA.getByRole('listitem').filter({ hasText: 'Presença não registrada' });
  await expect(pendencia.filter({ hasText: 'Encontro 2' })).toBeVisible();
  await expect(page.getByRole('region', { name: '3º ano B (fictícia)' })).toHaveCount(0);

  await pendencia.filter({ hasText: 'Encontro 2' }).getByRole('link').click();
  await expect(page).toHaveURL(/\/docente\/presenca$/);
  await page
    .getByRole('combobox', { name: 'Encontro', exact: true })
    .selectOption({ label: '2. Encontro 2 — Desafio prático' });
  await page.getByRole('button', { name: 'Marcar todos presentes' }).click();
  await page.getByRole('button', { name: 'Salvar presenças' }).click();
  await expect(page.getByText('Presenças salvas.')).toBeVisible();

  await page.goto('/docente');
  await expect(turmaA).toBeVisible();
  await expect(pendencia).toHaveCount(0);
});

test('aluna vê a prévia e o próximo encontro, sem nota individual', async ({ page }) => {
  await entrar(page, 'aluna@exemplo.invalid');
  await expect(page.getByText('Equipe Dupla Órbita')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Pontos' })).toContainText('Prévia — não oficial');
  await expect(page.getByRole('region', { name: 'Próximo encontro' })).toContainText(
    '3. Encontro 3 — Prova oficial (registro)',
  );
  await expect(page.getByText('Dados fictícios')).toHaveCount(0);
});

test('o painel da aluna do 3º ano B passa a mostrar a posição depois da publicação', async ({
  page,
}) => {
  await entrar(page, 'iris@exemplo.invalid');
  await expect(page.getByRole('region', { name: 'Posição na turma' })).toContainText(
    'Ranking da turma ainda não publicado',
  );
  await page.getByRole('button', { name: 'Sair' }).click();

  await entrar(page, 'coordenacao@exemplo.invalid');
  await page.goto('/coordenacao/ranking');
  await page.getByRole('checkbox', { name: 'Selecionar 3º ano B (fictícia)' }).check();
  await page.getByRole('radio', { name: 'Parcial' }).check();
  await page.getByRole('button', { name: 'Publicar 1 turma' }).click();
  await expect(page.getByText('3º ano B (fictícia) — versão 1')).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();

  await entrar(page, 'iris@exemplo.invalid');
  const posicao = page.getByRole('region', { name: 'Posição na turma' });
  await expect(posicao).toContainText(/\dº lugar/);
  await expect(posicao).toContainText('Parcial');
});

test('coordenação exporta os pontos em até 3 interações a partir do painel (SC-004)', async ({
  page,
}) => {
  await entrar(page, 'coordenacao@exemplo.invalid');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await page.getByRole('link', { name: 'Relatórios', exact: true }).first().click();
  await page
    .getByRole('combobox', { name: 'Relatório' })
    .selectOption({ label: 'Pontos por equipe e encontro' });
  const csv = await exportar(page);
  expect(csv.startsWith(BOM)).toBe(true);
  const [cabecalho, ...linhas] = csv.slice(1).split('\r\n');
  expect(cabecalho).toBe(
    'Categoria;Turma;Equipe;Encontro;Presença;Participação;Questões/prova oficial;Entrega prática;Apresentação;Descontos;Total;Pendências;Posição na turma',
  );
  expect(
    linhas.some((l) => l.startsWith('Categoria A (exemplo);3º ano A (fictícia);Dupla Órbita;1;')),
  ).toBe(true);
  await expect(page.getByText(/linhas exportadas\./)).toBeVisible();
});

test('docente exporta a presença só da turma A', async ({ page }) => {
  await entrar(page, 'docente@exemplo.invalid');
  await page.goto('/docente/relatorios');
  await page
    .getByRole('combobox', { name: 'Relatório' })
    .selectOption({ label: 'Presença por estudante e encontro' });
  const csv = await exportar(page);
  const [cabecalho, ...linhas] = csv.slice(1).split('\r\n');
  expect(cabecalho).toBe('Categoria;Turma;Equipe;Estudante;Encontro;Presente;Observação');
  expect(linhas.length).toBeGreaterThan(0);
  expect(linhas.every((l) => l.split(';')[1] === '3º ano A (fictícia)')).toBe(true);
  expect(linhas.some((l) => l.includes(';Dupla Órbita;Ana Exemplo;'))).toBe(true);
  expect(csv).not.toMatch(/@exemplo\.invalid/);
});
