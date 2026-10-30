import { expect, test, type APIRequestContext } from '@playwright/test';
import { tokenDoConvite, ultimoEmailPara } from './mailpit';

// Contas sem senha e convite de primeiro acesso contra o Supabase LOCAL (spec 002, US6, FR-011).
const URL = process.env.E2E_SUPABASE_URL as string;
const CHAVE = process.env.E2E_SUPABASE_ANON_KEY as string;
const EDICAO = 'b0000000-0000-0000-0000-000000000001';
const TURMA_A = 'd0000000-0000-0000-0000-000000000001';
const LINK_INVALIDO = 'Link inválido ou vencido';

async function token(request: APIRequestContext, email: string, senha = 'senha-local-123') {
  const r = await request.post(`${URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: CHAVE },
    data: { email, password: senha },
  });
  return r.ok() ? ((await r.json()) as { access_token: string }).access_token : null;
}

async function tokenObrigatorio(request: APIRequestContext, email: string) {
  const jwt = await token(request, email);
  expect(jwt).not.toBeNull();
  return jwt!;
}

function funcao(request: APIRequestContext, nome: string, dados: unknown, jwt?: string) {
  return request.post(`${URL}/functions/v1/${nome}`, {
    headers: { apikey: CHAVE, ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    data: dados,
  });
}

const novaConta = () => ({
  edicaoId: EDICAO,
  nome: 'Estudante Criado Pelo Teste',
  email: `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}@exemplo.invalid`,
  papel: 'aluno',
  turmaId: TURMA_A,
});

test('conta nasce sem senha; o convite por e-mail define a senha uma única vez', async ({
  request,
}) => {
  const jwt = await tokenObrigatorio(request, 'coordenacao@exemplo.invalid');
  const dados = novaConta();
  const inicio = new Date(Date.now() - 1000);
  const r = await funcao(request, 'criar-conta', dados, jwt);
  expect(r.status()).toBe(201);
  expect(await r.json()).toMatchObject({ conviteEnviado: true });

  const convite = tokenDoConvite(await ultimoEmailPara(request, dados.email, inicio));

  // Senha curta é recusada e o link continua valendo.
  const curta = await funcao(request, 'definir-senha-inicial', { token: convite, senha: 'curta' });
  expect(curta.status()).toBe(422);

  const ok = await funcao(request, 'definir-senha-inicial', {
    token: convite,
    senha: 'minha-senha-nova-1',
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ email: dados.email });

  // Entra com a senha que escolheu e vê apenas a própria turma.
  const acesso = await token(request, dados.email, 'minha-senha-nova-1');
  expect(acesso).not.toBeNull();
  const turmas = await request.get(`${URL}/rest/v1/turmas?select=id`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${acesso}` },
  });
  expect(await turmas.json()).toEqual([{ id: TURMA_A }]);

  // O mesmo link não vale de novo.
  const repetido = await funcao(request, 'definir-senha-inicial', {
    token: convite,
    senha: 'outra-senha-qualquer',
  });
  expect(repetido.status()).toBe(400);
  expect(((await repetido.json()) as { erro: string }).erro).toContain(LINK_INVALIDO);
});

test('link inexistente recebe a mesma resposta de link vencido', async ({ request }) => {
  const r = await funcao(request, 'definir-senha-inicial', {
    token: 'token-que-nao-existe-aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    senha: 'uma-senha-valida',
  });
  expect(r.status()).toBe(400);
  expect(((await r.json()) as { erro: string }).erro).toContain(LINK_INVALIDO);
});

test('senha provisória não é mais aceita', async ({ request }) => {
  const jwt = await tokenObrigatorio(request, 'coordenacao@exemplo.invalid');
  const r = await funcao(
    request,
    'criar-conta',
    { ...novaConta(), senhaProvisoria: 'provisoria-123' },
    jwt,
  );
  expect(r.status()).toBe(400);
});

test('docente não cria contas', async ({ request }) => {
  const jwt = await tokenObrigatorio(request, 'docente@exemplo.invalid');
  const r = await funcao(request, 'criar-conta', novaConta(), jwt);
  expect(r.status()).toBe(403);
});

test('sem autenticação de usuário a função recusa', async ({ request }) => {
  const r = await funcao(request, 'criar-conta', novaConta());
  expect(r.status()).toBe(401);
});

test('dados inválidos e e-mail repetido são recusados', async ({ request }) => {
  const jwt = await tokenObrigatorio(request, 'coordenacao@exemplo.invalid');
  expect(
    (await funcao(request, 'criar-conta', { ...novaConta(), turmaId: null }, jwt)).status(),
  ).toBe(400);
  expect((await funcao(request, 'criar-conta', { ...novaConta(), email: 'x' }, jwt)).status()).toBe(
    400,
  );
  const repetida = await funcao(
    request,
    'criar-conta',
    { ...novaConta(), email: 'aluna@exemplo.invalid' },
    jwt,
  );
  expect(repetida.status()).toBe(409);
});

test('corrigir e-mail e reenviar invalida o link anterior; após o acesso a situação fica ativa', async ({
  request,
}) => {
  const jwt = await tokenObrigatorio(request, 'coordenacao@exemplo.invalid');
  const dados = novaConta();
  const inicio = new Date(Date.now() - 1000);
  const criada = await funcao(request, 'criar-conta', dados, jwt);
  const { usuarioId } = (await criada.json()) as { usuarioId: string };
  const primeiroLink = tokenDoConvite(await ultimoEmailPara(request, dados.email, inicio));

  const situacao = async () => {
    const r = await request.post(`${URL}/rest/v1/rpc/situacao_de_acesso`, {
      headers: { apikey: CHAVE, Authorization: `Bearer ${jwt}` },
      data: { p_edicao: EDICAO },
    });
    const linhas = (await r.json()) as { usuario_id: string; acesso_ativo: boolean }[];
    return linhas.find((l) => l.usuario_id === usuarioId)?.acesso_ativo;
  };
  expect(await situacao()).toBe(false);

  // Docente não reenvia convites.
  const jwtDocente = await tokenObrigatorio(request, 'docente@exemplo.invalid');
  expect(
    (
      await funcao(request, 'reenviar-convite', { edicaoId: EDICAO, usuarioId }, jwtDocente)
    ).status(),
  ).toBe(403);

  const corrigido = dados.email.replace('e2e-', 'e2e-corrigido-');
  const reenvio = await funcao(
    request,
    'reenviar-convite',
    { edicaoId: EDICAO, usuarioId, novoEmail: corrigido },
    jwt,
  );
  expect(reenvio.status()).toBe(200);
  expect(await reenvio.json()).toEqual({ conviteEnviado: true });
  const segundoLink = tokenDoConvite(await ultimoEmailPara(request, corrigido, inicio));

  const antigo = await funcao(request, 'definir-senha-inicial', {
    token: primeiroLink,
    senha: 'senha-valida-123',
  });
  expect(antigo.status()).toBe(400);
  const novo = await funcao(request, 'definir-senha-inicial', {
    token: segundoLink,
    senha: 'senha-valida-123',
  });
  expect(await novo.json()).toEqual({ email: corrigido });
  expect(await situacao()).toBe(true);

  // Depois do primeiro acesso, não há reenvio.
  expect(
    (await funcao(request, 'reenviar-convite', { edicaoId: EDICAO, usuarioId }, jwt)).status(),
  ).toBe(409);
});
