import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
test('coordenação publica, visitante lê só dados públicos e retirada remove a edição', async ({
  page,
}) => {
  const sb = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const login = await sb.auth.signInWithPassword({
    email: 'coordenacao@exemplo.invalid',
    password: 'senha-local-123',
  });
  expect(login.error).toBeNull();
  const edicoes = await sb.rpc('edicoes_que_coordeno');
  expect(edicoes.error).toBeNull();
  const e = (
    edicoes.data as { id: string; nome: string; estado: string; regulamentoPublico: boolean }[]
  ).find((x) => x.estado === 'ativa');
  expect(e).toBeDefined();
  if (!e) return;
  for (const papel of ['docente', 'aluno']) {
    const outro = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    expect(
      (
        await outro.auth.signInWithPassword({
          email: `${papel}@exemplo.invalid`,
          password: 'senha-local-123',
        })
      ).error,
    ).toBeNull();
    expect(
      (await outro.rpc('definir_regulamento_publico', { p_id: e.id, p_publico: true })).error?.code,
    ).toBe('42501');
    await outro.auth.signOut();
  }
  try {
    expect(
      (await sb.rpc('definir_regulamento_publico', { p_id: e.id, p_publico: true })).error,
    ).toBeNull();
    const resposta = page.waitForResponse((r) => r.url().includes('/rpc/regulamento_publico'));
    await page.goto('/regulamento');
    const json: unknown = await (await resposta).json();
    const texto = JSON.stringify(json);
    expect(texto).not.toMatch(
      /"(?:ambiente|ambiente_id|orientacoes|usuario_id|turma_id|premiacao|comunicados)"/,
    );
    await expect(page.getByRole('heading', { name: e.nome, exact: true })).toBeVisible();
    expect(
      (await sb.rpc('definir_regulamento_publico', { p_id: e.id, p_publico: false })).error,
    ).toBeNull();
    await page.reload();
    await expect(page.getByRole('heading', { name: e.nome, exact: true })).toHaveCount(0);
  } finally {
    await sb.rpc('definir_regulamento_publico', { p_id: e.id, p_publico: e.regulamentoPublico });
    await sb.auth.signOut();
  }
});
