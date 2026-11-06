import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { ErroDeDados } from '@/shared/dados/erros';
import { criarRepositorioRedeSupabase } from './repositorioSupabase';

function cliente(resposta: { data: unknown; error: unknown } = { data: null, error: null }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  const invoke = vi.fn().mockResolvedValue(resposta);
  return { sb: { rpc, functions: { invoke } } as unknown as SupabaseClient, rpc, invoke };
}

describe('repositório Supabase da rede (spec 016)', () => {
  it('leituras: uma RPC por lista', async () => {
    const { sb, rpc } = cliente({ data: [], error: null });
    const r = criarRepositorioRedeSupabase(sb);
    expect(await r.unidades()).toEqual([]);
    expect(await r.masters()).toEqual([]);
    expect(rpc.mock.calls).toEqual([['unidades_da_rede'], ['masters_da_rede']]);
  });

  it('cadastrar unidade envia a chave e o nome sem espaços nas pontas', async () => {
    const { sb, rpc } = cliente({ data: 'un1', error: null });
    expect(await criarRepositorioRedeSupabase(sb).cadastrarUnidade('k1', '  Unidade C ')).toBe(
      'un1',
    );
    expect(rpc).toHaveBeenCalledWith('cadastrar_unidade', { p_chave: 'k1', p_nome: 'Unidade C' });
  });

  it('renomear, situação, gestão e master chamam as RPCs do contrato', async () => {
    const { sb, rpc } = cliente();
    const r = criarRepositorioRedeSupabase(sb);
    await r.renomearUnidade('u1', ' Nova ');
    await r.definirSituacaoUnidade('u1', false, ' Encerramento do convênio. ');
    await r.definirSituacaoUnidade('u1', true, null);
    await r.definirGestao('p1', false, 'Troca de gestão.');
    await r.definirMaster('p2', true, null);
    expect(rpc.mock.calls).toEqual([
      ['renomear_unidade', { p_id: 'u1', p_nome: 'Nova' }],
      [
        'definir_situacao_unidade',
        { p_id: 'u1', p_ativa: false, p_justificativa: 'Encerramento do convênio.' },
      ],
      ['definir_situacao_unidade', { p_id: 'u1', p_ativa: true, p_justificativa: null }],
      ['definir_gestao', { p_usuario: 'p1', p_ativa: false, p_justificativa: 'Troca de gestão.' }],
      ['definir_master', { p_usuario: 'p2', p_ativo: true, p_justificativa: null }],
    ]);
  });

  it('recusa do servidor vira ErroDeDados com a mensagem em português', async () => {
    const { sb } = cliente({
      data: null,
      error: { code: '23514', message: 'Já existe uma unidade com esse nome.' },
    });
    const erro = await criarRepositorioRedeSupabase(sb)
      .cadastrarUnidade('k', 'Unidade C')
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDeDados);
    expect((erro as Error).message).toBe('Já existe uma unidade com esse nome.');
  });

  it('criar conta usa a Edge Function contas-da-rede e devolve o convite', async () => {
    const { sb, invoke } = cliente({
      data: { usuarioId: 'n1', conviteEnviado: true },
      error: null,
    });
    const r = await criarRepositorioRedeSupabase(sb).criarConta({
      acao: 'gestao',
      nome: 'Ana',
      email: 'ana@exemplo.invalid',
      unidadeId: 'u1',
    });
    expect(r).toEqual({ usuarioId: 'n1', conviteEnviado: true });
    expect(invoke).toHaveBeenCalledWith('contas-da-rede', {
      body: { acao: 'gestao', nome: 'Ana', email: 'ana@exemplo.invalid', unidadeId: 'u1' },
    });
  });

  it('erro da Edge Function mostra a mensagem do servidor', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ erro: 'Já existe uma conta com esse e-mail.' }) } },
    });
    const sb = { rpc: vi.fn(), functions: { invoke } } as unknown as SupabaseClient;
    await expect(
      criarRepositorioRedeSupabase(sb).criarConta({ acao: 'master', nome: 'Ana', email: 'a@b.co' }),
    ).rejects.toThrow('Já existe uma conta com esse e-mail.');
  });

  it('reenviar convite usa a ação reenviar, com o novo e-mail opcional', async () => {
    const { sb, invoke } = cliente({ data: { conviteEnviado: true }, error: null });
    expect(await criarRepositorioRedeSupabase(sb).reenviarConvite('p1', 'novo@b.co')).toEqual({
      conviteEnviado: true,
    });
    expect(invoke).toHaveBeenCalledWith('contas-da-rede', {
      body: { acao: 'reenviar', usuarioId: 'p1', novoEmail: 'novo@b.co' },
    });
  });

  it('gestão: equipe e edições da unidade por RPC', async () => {
    const { sb, rpc } = cliente({ data: [], error: null });
    const r = criarRepositorioRedeSupabase(sb);
    expect(await r.equipe()).toEqual([]);
    expect(await r.edicoes()).toEqual([]);
    expect(rpc.mock.calls).toEqual([['equipe_da_unidade'], ['edicoes_da_unidade']]);
  });

  it('funções, desativar e reativar membro chamam as RPCs do contrato', async () => {
    const { sb, rpc } = cliente();
    const r = criarRepositorioRedeSupabase(sb);
    await r.definirFuncoes('p1', ['docente', 'mentor'], ' Mudança de função. ');
    await r.desativarMembro('p1', ' Saída da equipe da unidade. ');
    await r.reativarMembro('p1');
    expect(rpc.mock.calls).toEqual([
      [
        'definir_funcoes',
        {
          p_usuario: 'p1',
          p_funcoes: ['docente', 'mentor'],
          p_justificativa: 'Mudança de função.',
        },
      ],
      ['desativar_membro', { p_usuario: 'p1', p_justificativa: 'Saída da equipe da unidade.' }],
      ['reativar_membro', { p_usuario: 'p1' }],
    ]);
  });

  it('criar edição envia a chave, o período e a coordenação indicada (sem regras de outra edição)', async () => {
    const { sb, rpc } = cliente({ data: 'ed1', error: null });
    const id = await criarRepositorioRedeSupabase(sb).criarEdicao({
      chave: 'k1',
      nome: ' Maratona 2027 ',
      inicio: '2027-03-01',
      fim: null,
      coordenacaoId: 'p1',
    });
    expect(id).toBe('ed1');
    expect(rpc).toHaveBeenCalledWith('criar_edicao', {
      p_chave: 'k1',
      p_nome: 'Maratona 2027',
      p_inicio: '2027-03-01',
      p_fim: null,
      p_base_edicao: null,
      p_coordenacao: 'p1',
    });
  });

  it('coordenação da edição: acrescentar ou retirar com justificativa', async () => {
    const { sb, rpc } = cliente();
    const r = criarRepositorioRedeSupabase(sb);
    await r.definirCoordenacao('ed1', 'p1', true, null);
    await r.definirCoordenacao('ed1', 'p2', false, ' Troca da coordenação. ');
    expect(rpc.mock.calls).toEqual([
      [
        'definir_coordenacao_da_edicao',
        { p_edicao: 'ed1', p_usuario: 'p1', p_ativa: true, p_justificativa: null },
      ],
      [
        'definir_coordenacao_da_edicao',
        {
          p_edicao: 'ed1',
          p_usuario: 'p2',
          p_ativa: false,
          p_justificativa: 'Troca da coordenação.',
        },
      ],
    ]);
  });

  it('equipe de uma unidade e transferência chamam as RPCs do contrato (spec 019)', async () => {
    const { sb, rpc } = cliente({ data: [], error: null });
    const repo = criarRepositorioRedeSupabase(sb);
    expect(await repo.equipeDaUnidadeDaRede('un1')).toEqual([]);
    rpc.mockResolvedValueOnce({ data: 'tr1', error: null });
    expect(
      await repo.transferirConta({
        chave: 'k1',
        usuarioId: 'p1',
        unidadeOrigemId: 'un1',
        unidadeDestinoId: 'un2',
        justificativa: '  Mudança de unidade da docente.  ',
      }),
    ).toBe('tr1');
    expect(rpc.mock.calls).toEqual([
      ['equipe_de_unidade_da_rede', { p_unidade: 'un1' }],
      [
        'transferir_conta',
        {
          p_chave: 'k1',
          p_usuario: 'p1',
          p_unidade_origem: 'un1',
          p_unidade_destino: 'un2',
          p_justificativa: 'Mudança de unidade da docente.',
        },
      ],
    ]);
  });

  it('recusa da transferência vira ErroDeDados com a mensagem do servidor', async () => {
    const { sb } = cliente({
      data: null,
      error: { code: '23514', message: 'Indique outra gestão antes.', details: '', hint: '' },
    });
    await expect(
      criarRepositorioRedeSupabase(sb).transferirConta({
        chave: 'k',
        usuarioId: 'p',
        unidadeOrigemId: 'a',
        unidadeDestinoId: 'b',
        justificativa: 'Mudança de unidade.',
      }),
    ).rejects.toThrow('Indique outra gestão antes.');
  });
});
