// Edge Function: criação de contas pela coordenação (spec 002, US6 / RF03, FR-011).
//
// Segurança:
// - A autorização é verificada com o cliente SUJEITO À RLS de quem chama (`ctx.supabase`):
//   só a coordenação ativa da edição enxerga a própria atribuição de coordenação.
// - O cliente privilegiado (`ctx.supabaseAdmin`) só existe no servidor e é usado para criar o
//   usuário no Auth (e desfazer em caso de falha) e para registrar o convite.
// - A conta nasce sem senha conhecida: a pessoa recebe por e-mail um convite de 7 dias e uso
//   único para criar a própria senha. Nenhuma senha passa pela coordenação.
// - A atribuição é gravada como a própria coordenação, então a RLS e a auditoria valem.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { coordenaAEdicao } from '../_shared/autorizacao.ts';
import { enviarConvite } from '../_shared/enviar-convite.ts';
import { linhaDeAtribuicao, validarPedidoDeConta } from '../_shared/pedido-de-conta.ts';

const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'Método não permitido.');
    const quemChama = ctx.userClaims?.id;
    if (!quemChama) return erro(401, 'Autenticação necessária.');

    const pedido = validarPedidoDeConta(await req.json().catch(() => null));
    if (typeof pedido === 'string') return erro(400, pedido);

    // 1. Autorização com a visão (RLS) de quem chama.
    const coordena = await coordenaAEdicao(ctx.supabase, quemChama, pedido.edicaoId);
    if (coordena === 'erro') return erro(500, 'Não foi possível verificar a permissão.');
    if (coordena === 'nao') return erro(403, 'Somente a coordenação da edição pode criar contas.');

    // 2. Cria o usuário no Auth sem senha (privilegiado, somente no servidor).
    const { data: criado, error: erroCriacao } = await ctx.supabaseAdmin.auth.admin.createUser({
      email: pedido.email,
      email_confirm: true,
      user_metadata: { nome: pedido.nome },
    });
    if (erroCriacao || !criado.user) {
      const jaExiste = /already|registered|exists/i.test(erroCriacao?.message ?? '');
      return erro(
        jaExiste ? 409 : 400,
        jaExiste ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível criar a conta.',
      );
    }

    // 3. Atribuição gravada como a coordenação (RLS + auditoria). Em falha, desfaz a conta.
    //    Mentor: vínculo ao curso; as linhas por turma vêm do gatilho (spec 010).
    const { error: erroAtribuicao } = await ctx.supabase
      .from('atribuicoes')
      .insert(linhaDeAtribuicao(pedido, criado.user.id));
    if (erroAtribuicao) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(criado.user.id);
      return erro(400, 'Não foi possível vincular a conta à turma. Nada foi criado.');
    }

    // 4. Convite de primeiro acesso. Falha no envio não desfaz a conta: a resposta informa e a
    //    coordenação pode reenviar o convite.
    const conviteEnviado = await enviarConvite(ctx.supabaseAdmin, {
      usuarioId: criado.user.id,
      edicaoId: pedido.edicaoId,
      criadoPor: quemChama,
      nome: pedido.nome,
      email: pedido.email,
    });

    return Response.json({ usuarioId: criado.user.id, conviteEnviado }, { status: 201 });
  }),
};
