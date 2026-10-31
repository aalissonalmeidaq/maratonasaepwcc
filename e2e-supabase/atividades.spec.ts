import { expect, test, type Page } from '@playwright/test';

// Contas fictícias do supabase/seed.sql (somente ambiente local). Rodar após `supabase db reset`.
// Turma A: docente@ (Lúcia), aluna@ (Ana, Dupla Órbita). Turma B: iris@.
const SENHA = 'senha-local-123';
const PDF = 'e2e-supabase/fixtures/entrega.pdf';

test.describe.configure({ mode: 'serial' });

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

test.describe('US1 — desafio e entrega com comprovante do servidor', () => {
  test('docente cria e publica o desafio do encontro 4 para a turma A', async ({ page }) => {
    await entrar(page, 'docente@exemplo.invalid');
    await page.goto('/docente/atividades');
    const novo = page.getByRole('region', { name: 'Novo desafio' });
    await novo
      .getByLabel('Encontro')
      .selectOption({ label: '4. Encontro 4 — Projeto final e premiação' });
    await novo.getByLabel('Prazo').fill('2030-12-01T16:30');
    await novo.getByLabel('Título').fill('Desafio E2E');
    await novo.getByLabel('Enunciado').fill('Enunciado fictício do teste E2E.');
    await novo.getByLabel('3º ano A (fictícia)').check();
    await novo.getByRole('button', { name: 'Salvar rascunho' }).click();
    await expect(novo.getByText('Desafio salvo como rascunho.')).toBeVisible();

    const lista = page.getByRole('list', { name: 'Desafios cadastrados' });
    const item = lista.locator('li').filter({ hasText: 'Desafio E2E' });
    await item.getByRole('button', { name: 'Publicar Desafio E2E' }).click();
    await expect(page.getByText('Desafio “Desafio E2E” publicado.')).toBeVisible();
    await expect(
      lista.locator('li').filter({ hasText: 'Desafio E2E' }).getByText('Publicado'),
    ).toBeVisible();
  });

  test('aluna envia o PDF e vê protocolo e horário do servidor (SC-001)', async ({ page }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    // 1ª interação: menu; 2ª: escolher o arquivo; 3ª: enviar.
    await page
      .getByRole('navigation', { name: 'Acesso rápido' })
      .getByRole('link', { name: 'Desafios e entregas' })
      .click();
    const cartao = page.getByRole('region', { name: 'Desafio E2E' });
    await cartao.getByLabel('Arquivo da entrega').setInputFiles(PDF);
    await cartao.getByRole('button', { name: 'Enviar entrega' }).click();
    const comprovante = cartao.getByRole('status');
    await expect(comprovante).toContainText('Entrega recebida pelo servidor');
    await expect(comprovante).toContainText(/Protocolo ENT-\d{8}-[0-9A-F]{6}/);
    await expect(cartao.getByRole('list', { name: 'Versões enviadas' })).toContainText('Versão 1');
  });

  test('sem conexão, o envio fica bloqueado e nada aparece como recebido (SC-002)', async ({
    page,
    context,
  }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    await page.goto('/aluno/desafios');
    const cartao = page.getByRole('region', { name: 'Desafio E2E' });
    await expect(cartao.getByRole('button', { name: 'Enviar entrega' })).toBeEnabled();
    await context.setOffline(true);
    await expect(cartao.getByRole('button', { name: 'Enviar entrega' })).toBeDisabled();
    await expect(cartao.getByText(/Sem conexão/)).toBeVisible();
    await context.setOffline(false);
  });

  test('aluna de outra turma não vê o desafio (SC-004)', async ({ page }) => {
    await entrar(page, 'iris@exemplo.invalid');
    await page.goto('/aluno/desafios');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Desafios e entregas' }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Desafio E2E' })).toHaveCount(0);
  });
});

test.describe('US2 — presença e participação', () => {
  test('docente registra presença e participação; os valores voltam do servidor', async ({
    page,
  }) => {
    await entrar(page, 'docente@exemplo.invalid');
    await page.goto('/docente/presenca');
    await page
      .getByLabel('Encontro')
      .selectOption({ label: '1. Encontro 1 — Abertura e desafio inicial' });
    await page.getByRole('button', { name: 'Marcar todos presentes' }).click();
    await page.getByRole('checkbox', { name: 'Bruno Exemplo presente' }).uncheck();
    await page.getByLabel('Observação de Ana Exemplo').fill('Chegou 10 min atrasada.');
    await page.getByRole('button', { name: 'Salvar presenças' }).click();
    await expect(page.getByText('Presenças salvas.')).toBeVisible();

    const orbita = page.getByRole('region', { name: 'Dupla Órbita' });
    await orbita.getByLabel('Envolvimento nas atividades (até 4)').fill('4');
    await orbita.getByLabel('Colaboração (até 3)').fill('3');
    await orbita.getByLabel('Organização e cumprimento das orientações (até 3)').fill('2.5');
    await orbita.getByRole('button', { name: 'Salvar participação' }).click();
    await expect(orbita.getByText('Participação salva.')).toBeVisible();

    await page.reload();
    await page
      .getByLabel('Encontro')
      .selectOption({ label: '1. Encontro 1 — Abertura e desafio inicial' });
    await expect(page.getByRole('checkbox', { name: 'Ana Exemplo presente' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Bruno Exemplo presente' })).not.toBeChecked();
    await expect(page.getByLabel('Observação de Ana Exemplo')).toHaveValue(
      'Chegou 10 min atrasada.',
    );
    await expect(
      page
        .getByRole('region', { name: 'Dupla Órbita' })
        .getByLabel('Organização e cumprimento das orientações (até 3)'),
    ).toHaveValue('2.5');
  });

  test('correção de presença exige justificativa (FR-011)', async ({ page }) => {
    await entrar(page, 'docente@exemplo.invalid');
    await page.goto('/docente/presenca');
    await page
      .getByLabel('Encontro')
      .selectOption({ label: '1. Encontro 1 — Abertura e desafio inicial' });
    await page.getByRole('checkbox', { name: 'Bruno Exemplo presente' }).check();
    await page
      .getByRole('region', { name: 'Presença individual' })
      .getByLabel('Justificativa da correção')
      .fill('Bruno chegou depois da chamada.');
    await page.getByRole('button', { name: 'Salvar presenças' }).click();
    await expect(page.getByText('Presenças salvas.')).toBeVisible();
  });
});

test.describe('US3 — avaliação por rubrica e feedback', () => {
  test('docente avalia a entrega da US1 e a aluna vê notas e feedback', async ({ page }) => {
    await entrar(page, 'docente@exemplo.invalid');
    await page.goto('/docente/avaliacoes');
    await page.getByLabel('Desafio').selectOption({ label: 'Desafio E2E' });
    const orbita = page.getByRole('region', { name: 'Dupla Órbita' });
    await expect(orbita.getByText(/Última entrega: versão 1/)).toBeVisible();
    for (const [rotulo, nota] of [
      ['Entrega: Compreensão do problema (até 10)', '9'],
      ['Entrega: Aplicação de conhecimentos técnicos (até 10)', '8'],
      ['Entrega: Qualidade e adequação da solução (até 10)', '8'],
      ['Entrega: Organização e entrega (até 10)', '9'],
      ['Apresentação: Clareza (até 3)', '3'],
      ['Apresentação: Explicação das decisões e etapas (até 4)', '4'],
      ['Apresentação: Respostas às perguntas (até 3)', '3'],
    ] as const) {
      await orbita.getByLabel(rotulo).fill(nota);
    }
    await orbita.getByLabel('Feedback para a equipe').fill('Boa solução; documente os testes.');
    await orbita.getByRole('button', { name: 'Registrar avaliação' }).click();
    await expect(orbita.getByText('Avaliação registrada.')).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await entrar(page, 'aluna@exemplo.invalid');
    await page.goto('/aluno/desafios');
    const avaliacao = page
      .getByRole('region', { name: 'Desafio E2E' })
      .getByRole('region', { name: 'Avaliação da equipe' });
    await expect(avaliacao).toContainText('Entrega prática: 34 de 40');
    await expect(avaliacao).toContainText('Apresentação: 10 de 10');
    await expect(avaliacao).toContainText('Boa solução; documente os testes.');
  });
});

test.describe('US4 — questões com submissão única', () => {
  test('aluna responde a lista; o colega de equipe vê quem enviou e não envia de novo (FR-018)', async ({
    page,
  }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    await page.goto('/aluno/desafios');
    const lista = page.getByRole('region', { name: 'Questões do projeto final (fictícias)' });
    // Antes do prazo, o gabarito não chega à tela (SC-005).
    await expect(lista.getByText(/Gabarito/)).toHaveCount(0);
    for (const n of [1, 2, 3]) {
      await lista
        .getByRole('group', { name: `${n}. Questão fictícia ${n}?` })
        .getByRole('radio', { name: 'Alternativa 1' })
        .check();
    }
    await lista.getByRole('button', { name: 'Enviar respostas da equipe' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('A equipe só pode enviar uma vez.');
    await dialogo.getByRole('button', { name: 'Enviar agora' }).click();
    await expect(lista.getByText(/Respostas enviadas por Ana Exemplo em/)).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await entrar(page, 'aluno@exemplo.invalid');
    await page.goto('/aluno/desafios');
    const doColega = page.getByRole('region', { name: 'Questões do projeto final (fictícias)' });
    await expect(doColega.getByText(/Respostas enviadas por Ana Exemplo em/)).toBeVisible();
    await expect(doColega.getByRole('button', { name: 'Enviar respostas da equipe' })).toHaveCount(
      0,
    );
  });
});

test.describe('US5 — pontuação parcial da equipe', () => {
  test('aluna vê componentes calculados e o que aguarda registro (FR-021)', async ({ page }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    await page.goto('/aluno/pontuacao');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pontuação da equipe' }),
    ).toBeVisible();
    const encontro1 = page.getByRole('region', {
      name: '1. Encontro 1 — Abertura e desafio inicial',
    });
    await expect(
      encontro1.getByText('Presença').locator('xpath=following-sibling::dd[1]'),
    ).toHaveText('10 / 10');
    await expect(
      encontro1.getByText('Participação').locator('xpath=following-sibling::dd[1]'),
    ).toHaveText('9,5 / 10');
    await expect(
      encontro1.getByText('Entrega prática').locator('xpath=following-sibling::dd[1]'),
    ).toHaveText('Aguardando registro');
    await expect(encontro1.getByText('Parcial', { exact: true })).toBeVisible();
    const encontro4 = page.getByRole('region', {
      name: '4. Encontro 4 — Projeto final e premiação',
    });
    // Dois desafios no encontro 4 e só um avaliado: a média ainda aguarda (FR-026).
    await expect(
      encontro4.getByText('Entrega prática').locator('xpath=following-sibling::dd[1]'),
    ).toHaveText('Aguardando registro');
  });
});
