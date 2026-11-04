import { expect, test, type Page } from '@playwright/test';

// Spec 007 — jornada real do resultado oficial (quickstart.md). Contas fictícias do seed;
// rodar após `supabase db reset`. Turma A / Categoria A: Ana e Bruno (Dupla Órbita), docente Lúcia.
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

const ocorrenciaDaOrbita = (page: Page) =>
  page.getByRole('article').filter({ hasText: 'Uso não autorizado — Dupla Órbita' });

async function totalDaPrevia(page: Page) {
  await page.goto('/aluno/pontuacao');
  const texto = await page.getByText(/pontos até agora/).textContent();
  return texto ?? '';
}

async function totalPublicadoDaOrbita(page: Page) {
  await page.goto('/aluno/ranking');
  const linha = page.getByRole('row').filter({ hasText: 'Dupla Órbita' });
  return (await linha.getByRole('cell').nth(2).textContent()) ?? '';
}

test.describe('US1 — prova oficial', () => {
  test('coordenação registra realização e nota oficial; a nota não aparece ao aluno', async ({
    page,
  }) => {
    await entrar(page, 'coordenacao@exemplo.invalid');
    await page.goto('/coordenacao/prova-oficial');
    await page
      .getByLabel('Realização de Ana Exemplo')
      .selectOption({ label: 'Realizou (confirmada)' });
    await page.getByLabel('Nota oficial de Ana Exemplo').fill('75');
    await page.getByLabel('Fonte da nota de Ana Exemplo').fill('Planilha oficial fictícia');
    await page.getByLabel('Ana Exemplo: escala 0–100 confirmada').check();
    await page.getByLabel('Ana Exemplo: uso da nota autorizado').check();
    await page
      .getByLabel('Realização de Bruno Exemplo')
      .selectOption({ label: 'Realizou (confirmada)' });
    await page.getByLabel('Bruno Exemplo: nota indisponível').check();
    await page.getByRole('button', { name: 'Salvar resultados' }).click();
    await expect(page.getByText('Resultados salvos.')).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await entrar(page, 'aluna@exemplo.invalid');
    await page.goto('/aluno/pontuacao');
    await expect(page.getByText('Prévia — não oficial').first()).toBeVisible();
    await expect(page.getByText('75', { exact: true })).toHaveCount(0);
  });
});

test.describe('US2 — ocorrência, manifestação e decisão', () => {
  test('docente registra a ocorrência com evidência em PDF', async ({ page }) => {
    await entrar(page, 'docente@exemplo.invalid');
    await page.goto('/docente/ocorrencias');
    const form = page.getByRole('region', { name: 'Registrar ocorrência' });
    await form.getByLabel('Equipe').selectOption({ label: 'Dupla Órbita' });
    await form
      .getByLabel('Encontro')
      .selectOption({ label: '1. Encontro 1 — Abertura e desafio inicial' });
    await form.getByLabel('Tipo').selectOption({ label: 'Uso não autorizado (−5)' });
    await form
      .getByLabel('Fato', { exact: true })
      .fill('Uso de ferramenta de IA sem registro na entrega.');
    await form.getByLabel('Evidência', { exact: true }).fill('Relato fictício da docente.');
    await form.getByLabel('Arquivo de evidência (opcional)').setInputFiles(PDF);
    await form.getByRole('button', { name: 'Registrar ocorrência' }).click();
    await expect(form.getByText(/Ocorrência registrada/)).toBeVisible();
    await expect(ocorrenciaDaOrbita(page)).toBeVisible();
  });

  test('a coordenação não decide antes do prazo de manifestação', async ({ page }) => {
    await entrar(page, 'coordenacao@exemplo.invalid');
    await page.goto('/coordenacao/ocorrencias');
    const cartao = ocorrenciaDaOrbita(page);
    await cartao.getByLabel('Justificativa da decisão').fill('Fato comprovado pela evidência.');
    await cartao.getByRole('button', { name: 'Registrar decisão' }).click();
    await expect(
      cartao.getByText(/prazo de manifestação da equipe ainda está aberto/),
    ).toBeVisible();
  });

  test('a aluna é avisada e se manifesta; a outra equipe não vê a ocorrência', async ({ page }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    await expect(page.getByRole('link', { name: /avisos? não lidos?/ })).toBeVisible();
    await page.goto('/aluno/ocorrencias');
    const cartao = ocorrenciaDaOrbita(page);
    await cartao
      .getByLabel('Manifestação da equipe')
      .fill('Tínhamos autorização verbal da docente.');
    await cartao.getByRole('button', { name: 'Enviar manifestação' }).click();
    await expect(page.getByText(/^Manifestação enviada sobre a ocorrência/)).toBeVisible();
    await expect(
      ocorrenciaDaOrbita(page).getByText('Manifestação enviada', { exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await entrar(page, 'carla@exemplo.invalid');
    await page.goto('/aluno/ocorrencias');
    await expect(page.getByText('Nenhuma ocorrência registrada.')).toBeVisible();
  });

  test('depois da manifestação, a coordenação confirma', async ({ page }) => {
    await entrar(page, 'coordenacao@exemplo.invalid');
    await page.goto('/coordenacao/ocorrencias');
    const cartao = ocorrenciaDaOrbita(page);
    await cartao.getByLabel('Justificativa da decisão').fill('Fato comprovado pela evidência.');
    await cartao.getByRole('button', { name: 'Registrar decisão' }).click();
    await expect(ocorrenciaDaOrbita(page).getByText('Confirmada', { exact: true })).toBeVisible();
  });
});

test.describe('US4 — publicação do ranking', () => {
  test('docente registra a presença do encontro 1 (base para a revisão)', async ({ page }) => {
    await entrar(page, 'docente@exemplo.invalid');
    await page.goto('/docente/presenca');
    await page.getByRole('button', { name: 'Marcar todos presentes' }).click();
    await page.getByRole('button', { name: 'Salvar presenças' }).click();
    await expect(page.getByText('Presenças salvas.')).toBeVisible();
  });

  test('coordenação publica o parcial do 3º ano A; as pendências aparecem no detalhe da turma', async ({
    page,
  }) => {
    await entrar(page, 'coordenacao@exemplo.invalid');
    await page.goto('/coordenacao/ranking');
    // Spec 012: a publicação é por turma.
    await page.getByRole('button', { name: 'Abrir 3º ano A (fictícia)' }).click();
    await expect(page.getByText(/pendências? impedem? o definitivo/)).toBeVisible();
    await page.getByRole('checkbox', { name: 'Selecionar 3º ano A (fictícia)' }).check();
    await page.getByRole('radio', { name: 'Parcial' }).check();
    await page.getByRole('button', { name: 'Publicar 1 turma' }).click();
    await expect(page.getByText('3º ano A (fictícia) — versão 1')).toBeVisible();
    await expect(page.getByText(/Versão 1, publicada em/)).toBeVisible();
  });

  test('aluna vê o selo Parcial e o detalhe só da própria equipe', async ({ page }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    await page.goto('/aluno/ranking');
    await expect(page.getByText('Parcial', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Detalhe — Dupla Órbita' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Detalhe — Dupla Vetor' })).toHaveCount(0);
  });

  test('coordenação publica o provisório com justificativa (versão 2)', async ({ page }) => {
    await entrar(page, 'coordenacao@exemplo.invalid');
    await page.goto('/coordenacao/ranking');
    await page.getByRole('checkbox', { name: 'Selecionar 3º ano A (fictícia)' }).check();
    await page.getByRole('radio', { name: 'Provisório' }).check();
    await page.getByLabel('Justificativa').fill('Prova oficial registrada para a turma.');
    await page.getByRole('button', { name: 'Publicar 1 turma' }).click();
    await expect(page.getByText('3º ano A (fictícia) — versão 2')).toBeVisible();
  });
});

test.describe('US5 — revisão com correção ligada', () => {
  test('aluna pede revisão da presença do encontro 1', async ({ page }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    await page.goto('/aluno/ranking');
    const pedido = page.getByRole('region', { name: 'Pedir revisão dos pontos' });
    await pedido.getByLabel('Componente').selectOption({ label: 'Presença' });
    await pedido
      .getByLabel('Encontro (opcional)')
      .selectOption({ label: '1. Encontro 1 — Abertura e desafio inicial' });
    await pedido
      .getByLabel('Motivo do pedido')
      .fill('O Bruno saiu antes do início; a presença dele não vale.');
    await pedido.getByRole('button', { name: 'Pedir revisão' }).click();
    await expect(pedido.getByText(/Pedido enviado/)).toBeVisible();
  });

  test('coordenação corrige a presença ligada ao pedido e defere; o ranking só muda numa nova publicação', async ({
    page,
  }) => {
    await entrar(page, 'aluna@exemplo.invalid');
    const previaAntes = await totalDaPrevia(page);
    const publicadoAntes = await totalPublicadoDaOrbita(page);
    await page.getByRole('button', { name: 'Sair' }).click();

    await entrar(page, 'coordenacao@exemplo.invalid');
    await page.goto('/coordenacao/revisoes');
    await page.getByRole('link', { name: 'Corrigir presença' }).click();
    await expect(page).toHaveURL(/\/coordenacao\/presenca\?pedido=/);
    const presenca = page.getByRole('region', { name: 'Presença individual' });
    await presenca.getByRole('checkbox', { name: 'Bruno Exemplo presente' }).uncheck();
    await presenca
      .getByLabel('Justificativa da correção')
      .fill('Correção pedida na revisão da equipe.');
    await presenca.getByRole('button', { name: 'Salvar presenças' }).click();
    await expect(presenca.getByText('Presenças salvas.')).toBeVisible();

    await page.goto('/coordenacao/revisoes');
    const pedido = page.getByRole('article').filter({ hasText: 'Dupla Órbita' }).first();
    await expect(pedido.getByText(/Correção pedida na revisão da equipe/)).toBeVisible();
    await pedido
      .getByLabel('Justificativa da resposta')
      .fill('Presença corrigida conforme a lista.');
    await pedido.getByRole('button', { name: 'Responder pedido' }).click();
    await expect(
      page.getByText(/Resposta registrada: pedido de Dupla Órbita deferido/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sair' }).click();

    await entrar(page, 'aluna@exemplo.invalid');
    expect(await totalDaPrevia(page)).not.toBe(previaAntes);
    expect(await totalPublicadoDaOrbita(page)).toBe(publicadoAntes);
    await page.goto('/aluno/revisoes');
    await expect(page.getByText('Deferido', { exact: true })).toBeVisible();
  });
});
