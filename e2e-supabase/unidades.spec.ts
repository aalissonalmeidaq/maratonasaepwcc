import { expect, test, type APIRequestContext } from '@playwright/test';
import { tokenDoConvite, ultimoEmailPara } from './mailpit';

// Spec 016 — unidades e master contra o Supabase LOCAL: o master cadastra a "Unidade C" com a
// gestão (convite por e-mail), a gestão monta a equipe e cria a edição, e as unidades não se
// enxergam. O master não lê dados de edição.
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

/** Cria a conta pelo convite e devolve o token de sessão com a senha definida. */
async function aceitarConvite(request: APIRequestContext, email: string, depoisDe: Date) {
  const convite = tokenDoConvite(await ultimoEmailPara(request, email, depoisDe));
  const r = await request.post(`${URL}/functions/v1/definir-senha-inicial`, {
    headers: { apikey: CHAVE },
    data: { token: convite, senha: 'senha-da-unidade-1' },
  });
  expect(r.status()).toBe(200);
  return token(request, email, 'senha-da-unidade-1');
}

test('master cadastra a unidade C com gestão; a gestão monta a equipe e cria a edição; as unidades não se enxergam', async ({
  request,
}) => {
  const jwtMaster = await token(request, 'master@exemplo.invalid');
  const jwtInicial = await token(request, 'coordenacao@exemplo.invalid');

  // O master cadastra a unidade e convida a gestão (FR-001, FR-002).
  const nomeUnidade = `Unidade C ${SUFIXO}`;
  const criada = await rpc(request, jwtMaster, 'cadastrar_unidade', {
    p_chave: crypto.randomUUID(),
    p_nome: nomeUnidade,
  });
  expect(criada.ok()).toBe(true);
  const unidadeId = (await criada.json()) as string;

  const emailGestao = `gestao-c-${SUFIXO}@exemplo.invalid`;
  const inicio = new Date(Date.now() - 1000);
  const gestao = await contasDaRede(request, jwtMaster, {
    acao: 'gestao',
    nome: 'Gestão da Unidade C',
    email: emailGestao,
    unidadeId,
  });
  expect(gestao.status()).toBe(201);
  const jwtGestao = await aceitarConvite(request, emailGestao, inicio);

  // O master não lê dados de edição nem de estudantes (FR-004).
  const edicoesDoMaster = await request.get(`${URL}/rest/v1/edicoes?select=id`, {
    headers: cabecalhos(jwtMaster),
  });
  expect(await edicoesDoMaster.json()).toEqual([]);
  const painelDoMaster = await rpc(request, jwtMaster, 'painel_da_coordenacao', {
    p_edicao: 'b0000000-0000-0000-0000-000000000001',
  });
  expect(painelDoMaster.status()).toBe(403);

  // A gestão monta a equipe e cria a edição (FR-005 a FR-007).
  const emailCoordenacao = `coord-c-${SUFIXO}@exemplo.invalid`;
  const inicioCoord = new Date(Date.now() - 1000);
  const equipe = await contasDaRede(request, jwtGestao, {
    acao: 'equipe',
    nome: 'Coordenação da Unidade C',
    email: emailCoordenacao,
    funcoes: ['coordenacao'],
  });
  expect(equipe.status()).toBe(201);
  const { usuarioId: coordenacaoId } = (await equipe.json()) as { usuarioId: string };
  const jwtCoordenacao = await aceitarConvite(request, emailCoordenacao, inicioCoord);

  const edicao = await rpc(request, jwtGestao, 'criar_edicao', {
    p_chave: crypto.randomUUID(),
    p_nome: `Edição da Unidade C ${SUFIXO}`,
    p_inicio: null,
    p_fim: null,
    p_base_edicao: null,
    p_coordenacao: coordenacaoId,
  });
  expect(edicao.ok(), await edicao.text()).toBe(true);

  // Isolamento nos dois sentidos (SC-001).
  const vistaPelaC = await request.get(`${URL}/rest/v1/edicoes?select=id,nome`, {
    headers: cabecalhos(jwtCoordenacao),
  });
  const edicoesC = (await vistaPelaC.json()) as { nome: string }[];
  expect(edicoesC.map((e) => e.nome)).toEqual([`Edição da Unidade C ${SUFIXO}`]);

  const vistaPelaInicial = await request.get(`${URL}/rest/v1/edicoes?select=id,nome`, {
    headers: cabecalhos(jwtInicial),
  });
  const edicoesIniciais = (await vistaPelaInicial.json()) as { nome: string }[];
  expect(edicoesIniciais.some((e) => e.nome.includes('Unidade C'))).toBe(false);
  expect(edicoesIniciais.length).toBeGreaterThan(0);

  const equipeDaInicial = await rpc(
    request,
    await token(request, 'gestao@exemplo.invalid'),
    'equipe_da_unidade',
  );
  const nomes = ((await equipeDaInicial.json()) as { nome: string }[]).map((p) => p.nome);
  expect(nomes).not.toContain('Coordenação da Unidade C');
});

test('analista da unidade vê painel e relatório, só para leitura', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('analista@exemplo.invalid');
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/analista/);
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await page.goto('/analista/relatorios');
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  // Sem ações de escrita nem rotas de coordenação.
  await page.goto('/coordenacao');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
});

test('master: sem acesso às áreas de dados e com a lista de unidades', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('master@exemplo.invalid');
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/master/);
  await page.goto('/coordenacao');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  await page.goto('/master/unidades');
  await expect(page.getByRole('heading', { level: 1, name: /Unidades/ })).toBeVisible();
});
