import { obterSupabase } from '@/shared/lib/supabase';

/**
 * Recuperação de senha pelo fluxo padrão do Supabase Auth (spec 002, FR-014). O link vale 1 hora
 * (`otp_expiry`). O Auth não revela se o e-mail tem conta; a tela responde sempre igual.
 */
export async function pedirRecuperacaoDeSenha(email: string): Promise<void> {
  const { error } = await obterSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  // Limite de envios ou falha de rede: informar, sem revelar nada sobre a conta.
  if (error) throw new Error('Não foi possível enviar agora. Aguarde um pouco e tente novamente.');
}

/** O cliente processa o link (#access_token…) ao iniciar; aqui só se confirma a sessão. */
export async function haSessaoDeRecuperacao(): Promise<boolean> {
  const { data } = await obterSupabase().auth.getSession();
  return Boolean(data.session);
}

export async function redefinirSenha(senha: string): Promise<void> {
  const { error } = await obterSupabase().auth.updateUser({ password: senha });
  if (error) throw new Error('Não foi possível salvar a senha. Peça um novo link e tente de novo.');
}

export async function encerrarSessaoDeRecuperacao(): Promise<void> {
  await obterSupabase().auth.signOut();
}
