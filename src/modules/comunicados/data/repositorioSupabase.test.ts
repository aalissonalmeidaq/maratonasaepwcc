import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarRepositorioComunicadosSupabase } from './repositorioSupabase';

function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc } as unknown as SupabaseClient, rpc };
}

describe('repositório Supabase dos comunicados (spec 009)', () => {
  it('listas: uma RPC por lista, com a edição', async () => {
    const { sb, rpc } = clienteFalso({ data: [], error: null });
    const r = criarRepositorioComunicadosSupabase(sb);
    expect(await r.comunicadosParaMim('ed')).toEqual([]);
    expect(await r.comunicadosQueGerencio('ed')).toEqual([]);
    expect(rpc.mock.calls).toEqual([
      ['comunicados_para_mim', { p_edicao: 'ed' }],
      ['comunicados_que_gerencio', { p_edicao: 'ed' }],
    ]);
  });

  it('salvar: envia a chave, o rascunho e as turmas; título e texto sem espaços nas pontas', async () => {
    const { sb, rpc } = clienteFalso({ data: 'c1', error: null });
    const id = await criarRepositorioComunicadosSupabase(sb).salvarComunicado('k1', null, 'ed', {
      titulo: '  Mudança de sala ',
      texto: ' Laboratório 2. ',
      publico: 'estudantes',
      turmaIds: ['t-a'],
    });
    expect(id).toBe('c1');
    expect(rpc).toHaveBeenCalledWith('salvar_comunicado', {
      p_chave: 'k1',
      p_id: null,
      p_edicao: 'ed',
      p_titulo: 'Mudança de sala',
      p_texto: 'Laboratório 2.',
      p_publico: 'estudantes',
      p_turmas: ['t-a'],
    });
  });

  it('publicar, corrigir, retirar, apagar e marcar como lido chamam a RPC do contrato', async () => {
    const { sb, rpc } = clienteFalso({ data: { publicadoEm: 'x', avisos: 2 }, error: null });
    const r = criarRepositorioComunicadosSupabase(sb);
    expect(await r.publicarComunicado('c1')).toEqual({ publicadoEm: 'x', avisos: 2 });
    await r.corrigirComunicado('c1', 'T', 'X', 'Data trocada no texto.');
    await r.retirarComunicado('c1', 'Publicado por engano.');
    await r.apagarRascunho('c2');
    await r.marcarComunicadoLido('c1');
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      'publicar_comunicado',
      'corrigir_comunicado',
      'retirar_comunicado',
      'apagar_rascunho',
      'marcar_comunicado_lido',
    ]);
    expect(rpc.mock.calls[1]?.[1]).toEqual({
      p_id: 'c1',
      p_titulo: 'T',
      p_texto: 'X',
      p_justificativa: 'Data trocada no texto.',
    });
  });

  it('retirar e apagar não devolvem dados: resposta vazia do servidor é sucesso', async () => {
    const { sb } = clienteFalso({ data: null, error: null });
    const r = criarRepositorioComunicadosSupabase(sb);
    await expect(r.retirarComunicado('c1', 'Publicado por engano.')).resolves.toBeUndefined();
    await expect(r.apagarRascunho('c2')).resolves.toBeUndefined();
  });

  it('recusa do servidor vira mensagem em português', async () => {
    const { sb } = clienteFalso({
      data: null,
      error: { code: '42501', message: 'Você só publica para as turmas em que atua.' },
    });
    await expect(criarRepositorioComunicadosSupabase(sb).publicarComunicado('c1')).rejects.toThrow(
      'Você só publica para as turmas em que atua.',
    );
  });
});
