import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarRepositorioDuplasSupabase } from './repositorioSupabase';

function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc } as unknown as SupabaseClient, rpc };
}

describe('repositório Supabase de equipes — leitura de gestão (FR-005/011/013)', () => {
  it('mapeia a projeção do servidor para camelCase', async () => {
    const { sb, rpc } = clienteFalso({
      data: [
        {
          id: 'd1',
          turma_id: 't1',
          nome: null,
          ativa: true,
          integrantes: [
            { estudanteId: 'a', nome: 'Ana', integranteInativo: false },
            { estudanteId: 'b', nome: 'Bruno', integranteInativo: true },
          ],
          trio_em_turma_par: true,
        },
      ],
      error: null,
    });
    const equipes = await criarRepositorioDuplasSupabase(sb).equipesGestao('t1');
    expect(rpc).toHaveBeenCalledWith('equipes_da_turma_gestao', { p_turma: 't1' });
    expect(equipes).toEqual([
      {
        id: 'd1',
        turmaId: 't1',
        nome: null,
        ativa: true,
        integrantes: [
          { estudanteId: 'a', nome: 'Ana', integranteInativo: false },
          { estudanteId: 'b', nome: 'Bruno', integranteInativo: true },
        ],
        trioEmTurmaPar: true,
      },
    ]);
  });

  it('propaga a recusa do servidor com mensagem em português', async () => {
    const { sb } = clienteFalso({
      data: null,
      error: { code: '42501', message: 'Acesso não autorizado.' },
    });
    await expect(criarRepositorioDuplasSupabase(sb).equipesGestao('t1')).rejects.toThrow();
  });
});
