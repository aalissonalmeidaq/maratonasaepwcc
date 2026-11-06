// Edge Function: contas de master, de gestão da unidade e da equipe da unidade (spec 016, FR-002,
// FR-003, FR-005), todas por convite para criar a própria senha (ADR 0009).
//
// Segurança:
// - Quem pode o quê vem de `minha_conta()`, lida com o cliente SUJEITO À RLS de quem chama:
//   master cadastra masters e gestão; gestão da unidade ativa cadastra a equipe.
// - O cliente privilegiado (`ctx.supabaseAdmin`) só existe no servidor e só cria/remove a conta no
//   Auth, corrige o e-mail e registra o convite.
// - A função (master, gestão, coordenação, docente…) é concedida pelas RPCs como quem chama, então
//   a permissão é reconferida no banco e a auditoria registra o autor. Em falha, a conta é removida.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import {
  processarPedido,
  validarPedidoDaRede,
  type ContaDeQuemChama,
  type Dependencias,
} from '../_shared/contasDaRede.ts';
import { enviarConvite } from '../_shared/enviar-convite.ts';

const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });
// Só repassa mensagens de regra escritas pelo servidor; qualquer outro erro vira texto genérico.
const CODIGOS_DE_REGRA = ['23514', '42501', 'P0001'];

interface ContaListada {
  usuarioId: string;
  nome: string;
  email: string;
  situacaoAcesso: string;
  funcoes?: string[];
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'Método não permitido.');
    const quemChama = ctx.userClaims?.id;
    if (!quemChama) return erro(401, 'Autenticação necessária.');

    const pedido = validarPedidoDaRede(await req.json().catch(() => null));
    if (typeof pedido === 'string') return erro(400, pedido);

    const { data: dadosConta, error: erroConta } = await ctx.supabase.rpc('minha_conta');
    if (erroConta || !dadosConta) return erro(500, 'Não foi possível verificar a permissão.');
    const conta = dadosConta as ContaDeQuemChama;

    const dependencias: Dependencias = {
      async criarConta({ email, metadados }) {
        const { data, error } = await ctx.supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: metadados,
        });
        if (error || !data.user) {
          return {
            erro: /already|registered|exists/i.test(error?.message ?? '') ? 'ja_existe' : 'falha',
          };
        }
        return { usuarioId: data.user.id };
      },
      async removerConta(usuarioId) {
        await ctx.supabaseAdmin.auth.admin.deleteUser(usuarioId);
      },
      async conceder({ rpc, args }) {
        const { error } = await ctx.supabase.rpc(rpc, args);
        if (!error) return null;
        return CODIGOS_DE_REGRA.includes(error.code) && error.message
          ? error.message
          : 'Não foi possível conceder a função.';
      },
      enviarConvite: ({ usuarioId, nome, email }) =>
        enviarConvite(ctx.supabaseAdmin, {
          usuarioId,
          edicaoId: null,
          criadoPor: quemChama,
          nome,
          email,
        }),
      async localizarParaReenvio(usuarioId) {
        const listas: ContaListada[] = [];
        if (conta.master) {
          const [unidades, masters] = await Promise.all([
            ctx.supabase.rpc('unidades_da_rede'),
            ctx.supabase.rpc('masters_da_rede'),
          ]);
          if (unidades.error || masters.error) return null;
          for (const u of unidades.data as { gestao: ContaListada[] }[]) listas.push(...u.gestao);
          listas.push(...(masters.data as ContaListada[]));
        } else {
          const equipe = await ctx.supabase.rpc('equipe_da_unidade');
          if (equipe.error) return null;
          listas.push(...(equipe.data as ContaListada[]));
        }
        const alvo = listas.find((c) => c.usuarioId === usuarioId);
        return alvo
          ? {
              nome: alvo.nome,
              email: alvo.email,
              ativo: alvo.situacaoAcesso === 'ativo',
              gestao: alvo.funcoes?.includes('gestao') ?? false,
            }
          : null;
      },
      async corrigirEmail(usuarioId, email) {
        const { error } = await ctx.supabaseAdmin.auth.admin.updateUserById(usuarioId, {
          email,
          email_confirm: true,
        });
        if (!error) return 'ok';
        return /already|registered|exists/i.test(error.message) ? 'ja_existe' : 'falha';
      },
    };

    const resultado = await processarPedido(pedido, conta, quemChama, dependencias);
    return Response.json(resultado.corpo, { status: resultado.status });
  }),
};
