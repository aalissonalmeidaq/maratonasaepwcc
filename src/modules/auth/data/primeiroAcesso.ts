import { obterSupabase } from '@/shared/lib/supabase';

/**
 * Primeiro acesso pelo convite (spec 002, FR-011): envia o token do link e a nova senha à função
 * pública `definir-senha-inicial`. Devolve o e-mail da conta para preencher a entrada.
 */
export async function definirSenhaInicial(
  token: string,
  senha: string,
): Promise<{ email: string }> {
  const { data, error } = await obterSupabase().functions.invoke('definir-senha-inicial', {
    body: { token, senha },
  });
  if (!error) return data as { email: string };
  // A função responde { erro } com mensagem em português.
  const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
  throw new Error(
    (corpo as { erro?: string } | null)?.erro ??
      'Não foi possível criar a senha. Verifique a conexão e tente novamente.',
  );
}
