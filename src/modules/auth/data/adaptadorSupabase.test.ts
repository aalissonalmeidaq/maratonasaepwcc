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
