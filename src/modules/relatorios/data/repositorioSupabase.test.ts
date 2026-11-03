import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarRepositorioPaineisSupabase } from './repositorioSupabase';

function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc } as unknown as SupabaseClient, rpc };
}

describe('repositório Supabase dos painéis e relatórios (spec 008)', () => {
  it('cada painel é uma única RPC com a edição', async () => {
    const { sb, rpc } = clienteFalso({ data: { turmas: [] }, error: null });
    const r = criarRepositorioPaineisSupabase(sb);
    await r.painelDoAluno('ed');
    await r.painelDaGestao('ed');
    await r.painelDaCoordenacao('ed');
    expect(rpc.mock.calls).toEqual([
      ['painel_do_aluno', { p_edicao: 'ed' }],
      ['painel_da_gestao', { p_edicao: 'ed' }],
      ['painel_da_coordenacao', { p_edicao: 'ed' }],
    ]);
  });

  it('relatório: envia o tipo e os filtros, com nulo quando não há filtro', async () => {
    const relatorio = { colunas: [{ id: 'equipe', rotulo: 'Equipe', tipo: 'texto' }], linhas: [] };
    const { sb, rpc } = clienteFalso({ data: relatorio, error: null });
    const r = await criarRepositorioPaineisSupabase(sb).relatorio('presenca', {
      edicaoId: 'ed',
      categoria: null,
      turmaId: 't-a',
      encontroId: null,
    });
    expect(rpc).toHaveBeenCalledWith('relatorio', {
      p_tipo: 'presenca',
      p_edicao: 'ed',
      p_categoria: null,
      p_turma: 't-a',
      p_encontro: null,
    });
    expect(r).toEqual(relatorio);
  });

  it('recusa do servidor vira mensagem em português e nada é devolvido', async () => {
    const { sb } = clienteFalso({
      data: null,
      error: { code: '42501', message: 'Você não atua nesta turma.' },
    });
    await expect(
      criarRepositorioPaineisSupabase(sb).relatorio('pontos', {
        edicaoId: 'ed',
        categoria: null,
        turmaId: 't-b',
        encontroId: null,
      }),
    ).rejects.toThrow('Você não atua nesta turma.');
  });
});
