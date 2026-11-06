import { expect, test, type APIRequestContext } from '@playwright/test';
import { tokenDoConvite, ultimoEmailPara } from './mailpit';

// Spec 019 — transferência de conta entre unidades contra o Supabase LOCAL. A conta transferida é
// criada pela própria jornada (o seed não é alterado): o master cria a Unidade T com gestão, a
// gestão da unidade inicial cria uma docente, e o master a transfere pela tela.
const URL = process.env.E2E_SUPABASE_URL as string;
const CHAVE = process.env.E2E_SUPABASE_ANON_KEY as string;
const SENHA = 'senha-local-123';
const SUFIXO = `${Date.now()}`;

async function token(request: APIRequestContext, email: string, senha = SENHA) {
  const r = await request.post(`${URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: CHAVE },
    data: { email, password: senha },
  });
  expect(r.ok(), `login de ${email}`).toBe(true);
  return ((await r.json()) as { access_token: string }).access_token;
}

const cabecalhos = (jwt: string) => ({ apikey: CHAVE, Authorization: `Bearer ${jwt}` });

function rpc(request: APIRequestContext, jwt: string, nome: string, dados: unknown = {}) {
  return request.post(`${URL}/rest/v1/rpc/${nome}`, { headers: cabecalhos(jwt), data: dados });
}

function contasDaRede(request: APIRequestContext, jwt: string, dados: unknown) {
  return request.post(`${URL}/functions/v1/contas-da-rede`, {
    headers: cabecalhos(jwt),
    data: dados,
  });
}

async function aceitarConvite(request: APIRequestContext, email: string, depoisDe: Date) {
  const convite = tokenDoConvite(await ultimoEmailPara(request, email, depoisDe));
  const r = await request.post(`${URL}/functions/v1/definir-senha-inicial`, {
    headers: { apikey: CHAVE },
    data: { token: convite, senha: 'senha-da-unidade-1' },
  });
  expect(r.status()).toBe(200);
  return token(request, email, 'senha-da-unidade-1');
}

test('master transfere uma docente da unidade inicial para a unidade T; a gestão do destino define as funções', async ({
  request,
  page,
}) => {
  const jwtMaster = await token(request, 'master@exemplo.invalid');
  const jwtGestaoInicial = await token(request, 'gestao@exemplo.invalid');

  // Unidade T com gestão (convite aceito).
  const nomeUnidade = `Unidade T ${SUFIXO}`;
  const criada = await rpc(request, jwtMaster, 'cadastrar_unidade', {
    p_chave: crypto.randomUUID(),
    p_nome: nomeUnidade,
  });
  expect(criada.ok()).toBe(true);
  const unidadeT = (await criada.json()) as string;
  const emailGestaoT = `gestao-t-${SUFIXO}@exemplo.invalid`;
  const inicioGestao = new Date(Date.now() - 1000);
  expect(
    (
      await contasDaRede(request, jwtMaster, {
        acao: 'gestao',
        nome: 'Gestão da Unidade T',
        email: emailGestaoT,
        unidadeId: unidadeT,
      })
    ).status(),
  ).toBe(201);
  const jwtGestaoT = await aceitarConvite(request, emailGestaoT, inicioGestao);

  // Docente criada na unidade inicial pela gestão dela.
  const emailDocente = `docente-t-${SUFIXO}@exemplo.invalid`;
  const nomeDocente = `Docente Transferida ${SUFIXO}`;
  const inicioDocente = new Date(Date.now() - 1000);
  const equipe = await contasDaRede(request, jwtGestaoInicial, {
    acao: 'equipe',
    nome: nomeDocente,
    email: emailDocente,
    funcoes: ['docente'],
  });
  expect(equipe.status()).toBe(201);
  const { usuarioId } = (await equipe.json()) as { usuarioId: string };
  const jwtDocente = await aceitarConvite(request, emailDocente, inicioDocente);
  const antes = await rpc(request, jwtDocente, 'minha_conta');
  expect(((await antes.json()) as { funcoes: string[] }).funcoes).toEqual(['docente']);

  // O master transfere pela tela.
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('master@exemplo.invalid');
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/master/);
  await page.goto('/master/unidades');
  await page.getByRole('button', { name: /Ver equipe de SENAI Juazeiro do Norte/ }).click();
  await page.getByRole('button', { name: new RegExp(`Transferir ${nomeDocente}`) }).click();
  const dialogo = page.getByRole('dialog', { name: `Transferir ${nomeDocente}` });
  await dialogo.getByRole('button', { name: 'Transferir', exact: true }).click();
  await expect(dialogo.getByText('Escolha a unidade de destino.')).toBeVisible();
  await dialogo.getByLabel('Unidade de destino').selectOption({ label: nomeUnidade });
  await dialogo.getByLabel('Justificativa').fill('Mudança de unidade da docente.');
  await dialogo.getByRole('button', { name: 'Transferir', exact: true }).click();
  await expect(
    page.getByText('Conta transferida. A gestão da unidade de destino define as funções.'),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // A conta mudou de unidade e ficou sem funções; não aparece mais na equipe da origem.
  const depois = await rpc(request, jwtDocente, 'minha_conta');
  const conta = (await depois.json()) as { unidade: { nome: string }; funcoes: string[] };
  expect(conta.unidade.nome).toBe(nomeUnidade);
  expect(conta.funcoes).toEqual([]);
  const equipeOrigem = await rpc(request, jwtGestaoInicial, 'equipe_da_unidade');
  expect(
    ((await equipeOrigem.json()) as { usuarioId: string }[]).map((m) => m.usuarioId),
  ).not.toContain(usuarioId);

  // A gestão do destino a vê sem funções e define a função de docente.
  const equipeT = await rpc(request, jwtGestaoT, 'equipe_da_unidade');
  const naT = ((await equipeT.json()) as { usuarioId: string; funcoes: string[] }[]).find(
    (m) => m.usuarioId === usuarioId,
  );
  expect(naT?.funcoes).toEqual([]);
  const definir = await rpc(request, jwtGestaoT, 'definir_funcoes', {
    p_usuario: usuarioId,
    p_funcoes: ['docente'],
    p_justificativa: 'Docente da Unidade T.',
  });
  expect(definir.ok(), await definir.text()).toBe(true);
  const final = await rpc(request, jwtDocente, 'minha_conta');
  expect(((await final.json()) as { funcoes: string[] }).funcoes).toEqual(['docente']);
});

test('as recusas do servidor chegam à API: não-master e mesma unidade', async ({ request }) => {
  const jwtGestao = await token(request, 'gestao@exemplo.invalid');
  const jwtMaster = await token(request, 'master@exemplo.invalid');
  const naoMaster = await rpc(request, jwtGestao, 'transferir_conta', {
    p_chave: crypto.randomUUID(),
    p_usuario: crypto.randomUUID(),
    p_unidade_origem: crypto.randomUUID(),
    p_unidade_destino: crypto.randomUUID(),
    p_justificativa: 'Tentativa sem permissão.',
  });
  expect(naoMaster.status()).toBeGreaterThanOrEqual(400);
  expect(await naoMaster.text()).toContain('Somente o master');
  const mesma = crypto.randomUUID();
  const igual = await rpc(request, jwtMaster, 'transferir_conta', {
    p_chave: crypto.randomUUID(),
    p_usuario: crypto.randomUUID(),
    p_unidade_origem: mesma,
    p_unidade_destino: mesma,
    p_justificativa: 'Origem igual ao destino.',
  });
  expect(igual.status()).toBeGreaterThanOrEqual(400);
});
