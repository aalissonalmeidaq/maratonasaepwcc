import { expect, test, type APIRequestContext } from '@playwright/test';

// Testes de API da Edge Function `criar-conta` contra o Supabase LOCAL (US6).
const URL = process.env.E2E_SUPABASE_URL as string;
const CHAVE = process.env.E2E_SUPABASE_ANON_KEY as string;
const EDICAO = 'b0000000-0000-0000-0000-000000000001';
const TURMA_A = 'd0000000-0000-0000-0000-000000000001';

async function token(request: APIRequestContext, email: string) {
  const r = await request.post(`${URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: CHAVE },
    data: { email, password: 'senha-local-123' },
  });
  expect(r.ok()).toBe(true);
  return ((await r.json()) as { access_token: string }).access_token;
}

function criarConta(request: APIRequestContext, jwt: string, dados: Record<string, unknown>) {
  return request.post(`${URL}/functions/v1/criar-conta`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${jwt}` },
    data: dados,
  });
}

const novaConta = () => ({
  edicaoId: EDICAO,
  nome: 'Estudante Criado Pelo Teste',
  email: `e2e-${Date.now()}@exemplo.invalid`,
  senhaProvisoria: 'provisoria-123',
  papel: 'aluno',
  turmaId: TURMA_A,
});

test('coordenação cria conta de estudante já vinculada à turma', async ({ request }) => {
  const jwt = await token(request, 'coordenacao@exemplo.invalid');
  const dados = novaConta();
  const r = await criarConta(request, jwt, dados);
  expect(r.status()).toBe(201);

  // A nova pessoa consegue entrar e vê apenas a própria turma.
  const jwtNovo = await request.post(`${URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: CHAVE },
    data: { email: dados.email, password: dados.senhaProvisoria },
  });
  expect(jwtNovo.ok()).toBe(true);
  const acesso = ((await jwtNovo.json()) as { access_token: string }).access_token;
  const turmas = await request.get(`${URL}/rest/v1/turmas?select=id`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${acesso}` },
  });
  expect(await turmas.json()).toEqual([{ id: TURMA_A }]);
});

test('docente não cria contas', async ({ request }) => {
  const jwt = await token(request, 'docente@exemplo.invalid');
  const r = await criarConta(request, jwt, novaConta());
  expect(r.status()).toBe(403);
});

test('sem autenticação de usuário a função recusa', async ({ request }) => {
  const r = await request.post(`${URL}/functions/v1/criar-conta`, {
    headers: { apikey: CHAVE },
    data: novaConta(),
  });
  expect(r.status()).toBe(401);
});

test('dados inválidos e e-mail repetido são recusados', async ({ request }) => {
  const jwt = await token(request, 'coordenacao@exemplo.invalid');
  expect(
    (await criarConta(request, jwt, { ...novaConta(), senhaProvisoria: 'curta' })).status(),
  ).toBe(400);
  expect((await criarConta(request, jwt, { ...novaConta(), turmaId: null })).status()).toBe(400);
  const repetida = await criarConta(request, jwt, {
    ...novaConta(),
    email: 'aluna@exemplo.invalid',
  });
  expect(repetida.status()).toBe(409);
});
