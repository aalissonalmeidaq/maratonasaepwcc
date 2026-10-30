import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarRepositorioPainelTurmaSupabase } from './repositorioSupabase';

function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc } as unknown as SupabaseClient, rpc };
}

const RESPOSTA = {
  visao: 'gestao',
  turma: {
    id: 't1',
    nome: '3º ano A',
    anoLetivo: 2026,
    cursoNome: 'Curso',
    categoria: 'Cat',
    edicaoId: 'ed1',
  },
  alunos: [{ id: 'a', nome: 'Ana', temEquipe: false }],
  equipes: [],
  convitesPendentes: 0,
  pontuacao: null,
  encontros: [],
};

describe('repositório Supabase do painel da turma (FR-001/002)', () => {
  it('chama a RPC e devolve o painel', async () => {
    const { sb, rpc } = clienteFalso({ data: RESPOSTA, error: null });
    const painel = await criarRepositorioPainelTurmaSupabase(sb).painel('t1');
    expect(rpc).toHaveBeenCalledWith('painel_da_turma', { p_turma: 't1' });
    expect(painel).toEqual(RESPOSTA);
  });

  it('resposta sem o campo `pontuacao` vira `pontuacao: null` (FR-005)', async () => {
    const semPontuacao: Record<string, unknown> = { ...RESPOSTA };
    delete semPontuacao.pontuacao;
    const { sb } = clienteFalso({ data: semPontuacao, error: null });
    expect((await criarRepositorioPainelTurmaSupabase(sb).painel('t1')).pontuacao).toBeNull();
  });

  it.each([
    ['42501', 'Você não tem acesso a esta turma.'],
    ['P0002', 'Turma não encontrada.'],
    ['22P02', 'Turma não encontrada.'],
  ])('erro %s vira "%s"', async (code, mensagem) => {
    const { sb } = clienteFalso({ data: null, error: { code, message: 'x' } });
    await expect(criarRepositorioPainelTurmaSupabase(sb).painel('t1')).rejects.toThrow(mensagem);
  });

  it('outros erros seguem a mensagem padrão', async () => {
    const { sb } = clienteFalso({ data: null, error: { code: 'XX000', message: 'x' } });
    await expect(criarRepositorioPainelTurmaSupabase(sb).painel('t1')).rejects.toThrow(
      'Não foi possível concluir a operação. Tente novamente.',
    );
  });
});
