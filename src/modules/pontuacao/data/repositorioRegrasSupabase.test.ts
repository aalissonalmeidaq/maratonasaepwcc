import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { REGRAS_PILOTO } from '../domain/regras-piloto';
import { criarRepositorioRegrasSupabase } from './repositorioRegrasSupabase';

function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc } as unknown as SupabaseClient, rpc };
}

describe('repositório Supabase das regras (spec 011)', () => {
  it('gravar regras envia a base, o rótulo sem espaços, as regras e a justificativa', async () => {
    const { sb, rpc } = clienteFalso({
      data: { rotulo: 'v2', valeDesde: 'x', nova: true },
      error: null,
    });
    const r = await criarRepositorioRegrasSupabase(sb).gravarRegras(
      'e1',
      'v1',
      ' v2 ',
      REGRAS_PILOTO,
      ' Pontos revisados. ',
    );
    expect(r.nova).toBe(true);
    expect(rpc).toHaveBeenCalledWith('gravar_regras', {
      p_edicao: 'e1',
      p_versao_base: 'v1',
      p_rotulo: 'v2',
      p_regras: REGRAS_PILOTO,
      p_justificativa: 'Pontos revisados.',
    });
  });

  it('ajustes da turma, encontros da turma e leituras chamam a RPC do contrato', async () => {
    const { sb, rpc } = clienteFalso({ data: null, error: null });
    const r = criarRepositorioRegrasSupabase(sb);
    await expect(r.definirEncontrosDaTurma('t1', ['enc'])).resolves.toBeUndefined();
    rpc.mockResolvedValue({ data: { ajusteId: 'a', valeDesde: 'x', novo: true }, error: null });
    await r.gravarAjustesTurma(
      't1',
      null,
      { presenca: REGRAS_PILOTO.presenca },
      'Justificativa válida.',
    );
    rpc.mockResolvedValue({ data: [], error: null });
    await r.historico('e1', 't1');
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      'definir_encontros_da_turma',
      'gravar_ajustes_turma',
      'historico_regras',
    ]);
    expect(rpc.mock.calls[1]?.[1]).toEqual({
      p_turma: 't1',
      p_ajuste_base: null,
      p_grupos: { presenca: REGRAS_PILOTO.presenca },
      p_justificativa: 'Justificativa válida.',
    });
  });

  it('recusa do servidor vira mensagem em português', async () => {
    const { sb } = clienteFalso({
      data: null,
      error: {
        code: '23514',
        message: 'As regras mudaram desde que você abriu a tela; recarregue.',
      },
    });
    await expect(
      criarRepositorioRegrasSupabase(sb).gravarRegras(
        'e1',
        'v1',
        'v2',
        REGRAS_PILOTO,
        'Justificativa.',
      ),
    ).rejects.toThrow('As regras mudaram desde que você abriu a tela; recarregue.');
  });
});
