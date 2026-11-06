import { expect, test, type Page } from '@playwright/test';

// Spec 016 — master, gestão e analista no modo demonstração (dados fictícios; escritas recusadas).
async function entrarComo(page: Page, nome: RegExp) {
  await page.goto('/entrar');
  await page.getByRole('button', { name: nome }).click();
  await expect(page).not.toHaveURL(/entrar$/);
}

test('master: abre na rede, vê as unidades e não entra nas áreas de dados', async ({ page }) => {
  await entrarComo(page, /master/i);
  await expect(page).toHaveURL(/\/master$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Rede' })).toBeVisible();
  await page.goto('/master/unidades');
  await expect(page.getByRole('heading', { level: 1, name: /Unidades/ })).toBeVisible();
  await expect(page.getByText('Unidade Fictícia A').first()).toBeVisible();
  await page.goto('/coordenacao');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
});

test('gestão: vê a equipe e as edições da unidade, sem as áreas de turma', async ({ page }) => {
  await entrarComo(page, /gestão/i);
  await expect(page).toHaveURL(/\/gestao$/);
  await page.goto('/gestao/equipe');
  await expect(page.getByRole('heading', { level: 1, name: /Equipe/ })).toBeVisible();
  await page.goto('/gestao/edicoes');
  await expect(page.getByRole('heading', { level: 1, name: /Edições/ })).toBeVisible();
  await page.goto('/coordenacao/presenca');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
});

test('analista: painel e relatórios só para leitura', async ({ page }) => {
  await entrarComo(page, /analista/i);
  await expect(page).toHaveURL(/\/analista$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await page.goto('/analista/relatorios');
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  await page.goto('/coordenacao/avaliacoes');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
});
