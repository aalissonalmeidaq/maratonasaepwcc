import { expect, test } from '@playwright/test';
import { verificarA11y } from './a11y';
const grupos = [
  { perfil: 'público', conta: null, rotas: ['/entrar', '/regulamento'] },
  {
    perfil: 'aluno',
    conta: /ana exemplo/i,
    rotas: ['/aluno', '/aluno/ranking', '/aluno/pontuacao', '/aluno/encontros'],
  },
  {
    perfil: 'docente',
    conta: /lúcia exemplo/i,
    rotas: [
      '/docente',
      '/docente/turmas/t-a',
      '/docente/encontros',
      '/docente/presenca',
      '/docente/avaliacoes',
    ],
  },
  {
    perfil: 'coordenação',
    conta: /coordenação/i,
    rotas: [
      '/coordenacao',
      '/coordenacao/ranking',
      '/coordenacao/edicoes',
      '/coordenacao/presenca',
      '/coordenacao/avaliacoes',
    ],
  },
  {
    perfil: 'master',
    conta: /master/i,
    rotas: ['/master', '/master/unidades', '/master/masters'],
  },
  {
    perfil: 'gestão',
    conta: /gestão/i,
    rotas: ['/gestao', '/gestao/equipe', '/gestao/edicoes'],
  },
  {
    perfil: 'analista',
    conta: /analista/i,
    rotas: ['/analista', '/analista/relatorios'],
  },
];
for (const grupo of grupos)
  for (const rota of grupo.rotas)
    test(`${grupo.perfil}: ${rota} WCAG 2.2 AA`, async ({ page }, info) => {
      await page.goto('/entrar');
      if (grupo.conta) {
        await page.getByRole('button', { name: grupo.conta }).click();
        await expect(page).not.toHaveURL(/entrar$/);
      }
      await page.goto(rota);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/Carregando…|Carregando regulamento…/)).toHaveCount(0);
      await verificarA11y(page, info);
    });
