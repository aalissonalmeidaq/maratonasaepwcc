import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarRepositorioOrganizacaoSupabase } from './repositorioSupabase';

function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc } as unknown as SupabaseClient, rpc };
}

describe('repositório de edições, cadastro e vínculos (spec 010)', () => {
  it('criar edição envia a chave, os dados com nome sem espaços nas pontas e a base', async () => {
    const { sb, rpc } = clienteFalso({ data: 'e-nova', error: null });
    const id = await criarRepositorioOrganizacaoSupabase(sb).criarEdicao(
      'k1',
      { nome: '  Maratona 2027 ', inicio: '2027-03-01', fim: null },
      null,
    );
    expect(id).toBe('e-nova');
    expect(rpc).toHaveBeenCalledWith('criar_edicao', {
      p_chave: 'k1',
      p_nome: 'Maratona 2027',
      p_inicio: '2027-03-01',
      p_fim: null,
      p_base_edicao: null,
    });
  });

  it('operações sem retorno aceitam a resposta vazia do servidor', async () => {
    const { sb, rpc } = clienteFalso({ data: null, error: null });
    const r = criarRepositorioOrganizacaoSupabase(sb);
    await expect(
      r.alterarEdicao('e1', { nome: 'Nome', inicio: null, fim: null }),
    ).resolves.toBeUndefined();
    await expect(r.apagarEdicao('e1')).resolves.toBeUndefined();
    await expect(r.apagarDoCadastro('turma', 't1')).resolves.toBeUndefined();
    await expect(r.desvincularTurma('t1')).resolves.toBeUndefined();
    await expect(r.vincularMentorAoCurso('c1', 'u1')).resolves.toBeUndefined();
    await expect(r.desvincularMentorDoCurso('c1', 'u1')).resolves.toBeUndefined();
    await expect(r.atribuirCoordenacao('e1', 'u1')).resolves.toBeUndefined();
    await expect(r.desativarCoordenacao('e1', 'u1')).resolves.toBeUndefined();
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      'alterar_edicao',
      'apagar_edicao',
      'apagar_do_cadastro',
      'desvincular_turma',
      'vincular_mentor_ao_curso',
      'desvincular_mentor_do_curso',
      'atribuir_coordenacao',
      'desativar_coordenacao',
    ]);
  });

  it('vincular turmas envia a edição e os itens do cadastro', async () => {
    const { sb, rpc } = clienteFalso({
      data: [{ turmaId: 't1', cadastroTurmaId: 'k1' }],
      error: null,
    });
    const r = await criarRepositorioOrganizacaoSupabase(sb).vincularTurmas('e1', ['k1']);
    expect(r).toEqual([{ turmaId: 't1', cadastroTurmaId: 'k1' }]);
    expect(rpc).toHaveBeenCalledWith('vincular_turmas', { p_edicao: 'e1', p_turmas: ['k1'] });
  });

  it('busca de pessoas envia a edição e o texto sem espaços nas pontas', async () => {
    const { sb, rpc } = clienteFalso({ data: [{ usuarioId: 'u1', nome: 'Ana' }], error: null });
    expect(await criarRepositorioOrganizacaoSupabase(sb).pessoasParaVincular('e1', ' an ')).toEqual(
      [{ usuarioId: 'u1', nome: 'Ana' }],
    );
    expect(rpc).toHaveBeenCalledWith('pessoas_para_vincular', { p_edicao: 'e1', p_busca: 'an' });
  });

  it('recusa do servidor vira mensagem em português', async () => {
    const { sb } = clienteFalso({
      data: null,
      error: { code: '23514', message: 'Vincule ao menos uma turma antes de ativar.' },
    });
    await expect(criarRepositorioOrganizacaoSupabase(sb).ativarEdicao('e1')).rejects.toThrow(
      'Vincule ao menos uma turma antes de ativar.',
    );
  });
});
