// Edge Function PÚBLICA: primeiro acesso pelo link do convite (spec 002, FR-011, US6 cenário 3).
//
// Segurança:
// - Sem login (a pessoa ainda não tem senha). A prova é o token de 32 bytes do e-mail; o banco
//   só conhece o hash. O consumo é atômico e de uso único (`consumir_convite`).
// - Token inexistente, usado, revogado ou vencido recebem a MESMA resposta.
// - Se o Auth recusar a senha, o consumo é desfeito e o link continua valendo.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { hashDoToken } from '../_shared/convites.ts';

const LINK_INVALIDO =
  'Link inválido ou vencido. Peça um novo à coordenação ou use “Esqueci minha senha”.';
const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'Método não permitido.');
    const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = typeof corpo?.token === 'string' ? corpo.token.trim() : '';
    const senha = typeof corpo?.senha === 'string' ? corpo.senha : '';
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return erro(400, LINK_INVALIDO);
    if (senha.length < 10) return erro(422, 'A senha deve ter pelo menos 10 caracteres.');

    const { data, error } = await ctx.supabaseAdmin.rpc('consumir_convite', {
      p_token_hash: await hashDoToken(token),
    });
    if (error) return erro(500, 'Não foi possível verificar o link. Tente novamente.');
    const convite = (data as { convite_id: string; usuario_id: string }[] | null)?.[0];
    if (!convite) return erro(400, LINK_INVALIDO);

    const { data: atualizado, error: erroSenha } =
      await ctx.supabaseAdmin.auth.admin.updateUserById(convite.usuario_id, { password: senha });
    if (erroSenha || !atualizado.user) {
      await ctx.supabaseAdmin.rpc('desfazer_consumo', { p_convite: convite.convite_id });
      return erro(
        422,
        'Não foi possível usar essa senha. Escolha outra (mínimo de 10 caracteres).',
      );
    }

    return Response.json({ email: atualizado.user.email });
  }),
};
