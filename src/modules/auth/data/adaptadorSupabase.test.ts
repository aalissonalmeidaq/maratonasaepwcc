import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { criarAdaptadorSupabase } from './adaptadorSupabase';

describe('Falhas ao entrar', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'E-mail ou senha incorretos'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'Muitas tentativas'],
    [{ code: 'unexpected_failure', status: 503 }, 'indisponível no momento'],
  ])('distingue o erro %j sem expor detalhes do serviço', async (error, mensagem) => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null }, error });
    const cliente = { auth: { signInWithPassword } } as unknown as SupabaseClient;
    await expect(
      criarAdaptadorSupabase(cliente).entrar({ email: 'pessoa@exemplo.invalid', senha: 'teste' }),
    ).rejects.toThrow(mensagem);
  });

  it('orienta a verificar a conexão quando a requisição é rejeitada', async () => {
    const cliente = {
      auth: { signInWithPassword: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) },
    } as unknown as SupabaseClient;
    await expect(
      criarAdaptadorSupabase(cliente).entrar({ email: 'pessoa@exemplo.invalid', senha: 'teste' }),
    ).rejects.toThrow('Verifique sua conexão');
  });
});

describe('sessão montada por minha_conta() (spec 016)', () => {
  function clienteComConta(conta: unknown, erro: unknown = null) {
    const rpc = vi.fn().mockResolvedValue({ data: conta, error: erro });
    const cliente = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      },
      rpc,
    } as unknown as SupabaseClient;
    return { cliente, rpc };
  }

  it('traz nome, papéis, funções, unidade e master do servidor', async () => {
    const { cliente, rpc } = clienteComConta({
      nome: 'Ana Gestão',
      master: false,
      unidade: { id: 'un1', nome: 'Unidade B', ativa: true },
      funcoes: ['coordenacao', 'gestao'],
      papeis: ['coordenacao'],
    });
    expect(await criarAdaptadorSupabase(cliente).sessaoAtual()).toEqual({
      usuarioId: 'u1',
      nome: 'Ana Gestão',
      papeis: ['coordenacao'],
      master: false,
      funcoes: ['coordenacao', 'gestao'],
      unidade: { id: 'un1', nome: 'Unidade B', ativa: true },
      demo: false,
    });
    expect(rpc).toHaveBeenCalledWith('minha_conta');
  });

  it('master não tem unidade', async () => {
    const { cliente } = clienteComConta({
      nome: 'Master',
      master: true,
      unidade: null,
      funcoes: [],
      papeis: [],
    });
    expect(await criarAdaptadorSupabase(cliente).sessaoAtual()).toMatchObject({
      master: true,
      unidade: null,
      funcoes: [],
    });
  });

  it('falha ao carregar a conta vira erro de autenticação com mensagem pronta', async () => {
    const { cliente } = clienteComConta(null, { code: '500', message: 'x' });
    await expect(criarAdaptadorSupabase(cliente).sessaoAtual()).rejects.toThrow(
      'Não foi possível carregar o seu perfil',
    );
  });
});
