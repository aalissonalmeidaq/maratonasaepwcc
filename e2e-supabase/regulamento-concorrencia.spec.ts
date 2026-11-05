import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
test('publicação concorrente com encerramento nunca expõe edição encerrada', async () => {
  const sb = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  expect(
    (
      await sb.auth.signInWithPassword({
        email: 'coordenacao@exemplo.invalid',
        password: 'senha-local-123',
      })
    ).error,
  ).toBeNull();
  const cadastro = await sb.rpc('cadastro');
  const turma = (cadastro.data as { turmas: { id: string }[] }[]).flatMap((c) => c.turmas)[0];
  expect(turma).toBeDefined();
  if (!turma) return;
  const criada = await sb.rpc('criar_edicao', {
    p_chave: randomUUID(),
    p_nome: `Concorrência fictícia ${Date.now()}`,
    p_inicio: '2030-03-01',
    p_fim: '2030-11-30',
    p_base_edicao: null,
  });
  expect(criada.error).toBeNull();
  const id = criada.data as string;
  let encerrada = false;
  try {
    expect(
      (await sb.rpc('vincular_turmas', { p_edicao: id, p_turmas: [turma.id] })).error,
    ).toBeNull();
    expect((await sb.rpc('ativar_edicao', { p_id: id })).error).toBeNull();
    const [publicacao, encerramento] = await Promise.all([
      sb.rpc('definir_regulamento_publico', { p_id: id, p_publico: true }),
      sb.rpc('encerrar_edicao', {
        p_id: id,
        p_justificativa: 'Encerramento fictício para testar concorrência.',
      }),
    ]);
    expect(encerramento.error).toBeNull();
    encerrada = encerramento.error === null;
    if (publicacao.error) expect(publicacao.error.code).toBe('23514');
    const publico = await sb.rpc('regulamento_publico');
    expect((publico.data as { edicoes: { id: string }[] }).edicoes.some((e) => e.id === id)).toBe(
      false,
    );
    expect(
      (await sb.rpc('definir_regulamento_publico', { p_id: id, p_publico: true })).error?.code,
    ).toBe('23514');
  } finally {
    // Edição encerrada é histórico imutável; fixture termina encerrada, sem publicação pública.
    if (!encerrada)
      await sb.rpc('encerrar_edicao', {
        p_id: id,
        p_justificativa: 'Limpeza da fixture fictícia de concorrência.',
      });
    await sb.auth.signOut();
  }
});
