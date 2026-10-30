// Edge Function: reenviar o convite de primeiro acesso, com correção opcional do e-mail
// (spec 002, FR-011, US6 cenário 6). Somente a coordenação da edição.
//
// - Quem já fez o primeiro acesso não recebe convite nem tem o e-mail trocado aqui (409).
// - O reenvio revoga o convite anterior: o link antigo deixa de valer.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { coordenaAEdicao } from '../_shared/autorizacao.ts';
import { enviarConvite } from '../_shared/enviar-convite.ts';

const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });
const UUID = /^[0-9a-f-]{36}$/i;

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'Método não permitido.');
    const quemChama = ctx.userClaims?.id;
    if (!quemChama) return erro(401, 'Autenticação necessária.');

    const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const edicaoId = typeof corpo?.edicaoId === 'string' ? corpo.edicaoId : '';
    const usuarioId = typeof corpo?.usuarioId === 'string' ? corpo.usuarioId : '';
    const novoEmail =
      typeof corpo?.novoEmail === 'string' && corpo.novoEmail.trim()
        ? corpo.novoEmail.trim().toLowerCase()
        : null;
    if (!UUID.test(edicaoId) || !UUID.test(usuarioId)) return erro(400, 'Pedido inválido.');
    if (novoEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail))
      return erro(400, 'Informe um e-mail válido.');

    const coordena = await coordenaAEdicao(ctx.supabase, quemChama, edicaoId);
    if (coordena === 'erro') return erro(500, 'Não foi possível verificar a permissão.');
    if (coordena === 'nao')
      return erro(403, 'Somente a coordenação da edição pode reenviar convites.');

    // Situação vista pela coordenação (a própria função confere a permissão de novo).
    const { data: situacoes, error: erroSituacao } = await ctx.supabase.rpc('situacao_de_acesso', {
      p_edicao: edicaoId,
    });
    if (erroSituacao) return erro(500, 'Não foi possível consultar a situação de acesso.');
    const situacao = (situacoes as { usuario_id: string; acesso_ativo: boolean }[]).find(
      (s) => s.usuario_id === usuarioId,
    );
    if (!situacao) return erro(403, 'Esta pessoa não está vinculada a esta edição.');
    if (situacao.acesso_ativo) return erro(409, 'Esta pessoa já fez o primeiro acesso.');

    if (novoEmail) {
      const { error: erroEmail } = await ctx.supabaseAdmin.auth.admin.updateUserById(usuarioId, {
        email: novoEmail,
        email_confirm: true,
      });
      if (erroEmail) {
        const emUso = /already|registered|exists/i.test(erroEmail.message);
        return erro(
          emUso ? 409 : 400,
          emUso ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível corrigir o e-mail.',
        );
      }
    }

    const { data: pessoa, error: erroPessoa } =
      await ctx.supabaseAdmin.auth.admin.getUserById(usuarioId);
    if (erroPessoa || !pessoa.user?.email) return erro(500, 'Não foi possível ler a conta.');

    const conviteEnviado = await enviarConvite(ctx.supabaseAdmin, {
      usuarioId,
      edicaoId,
      criadoPor: quemChama,
      nome: String(pessoa.user.user_metadata?.nome ?? ''),
      email: pessoa.user.email,
    });
    return Response.json({ conviteEnviado });
  }),
};
