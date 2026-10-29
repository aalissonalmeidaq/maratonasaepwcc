// Edge Function: criação de contas pela coordenação (spec 002, US6 / RF03).
//
// Segurança:
// - A autorização é verificada com o cliente SUJEITO À RLS de quem chama (`ctx.supabase`):
//   só a coordenação ativa da edição enxerga a própria atribuição de coordenação.
// - O cliente privilegiado (`ctx.supabaseAdmin`) só existe no servidor e é usado apenas para
//   criar o usuário no Auth (e desfazer em caso de falha).
// - A atribuição é gravada como a própria coordenação, então a RLS e a auditoria valem.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

const PAPEIS = ['aluno', 'docente', 'mentor', 'apoio', 'analista'] as const;
const EXIGE_TURMA = ['aluno', 'docente', 'mentor'];

interface Pedido {
  edicaoId: string;
  nome: string;
  email: string;
  senhaProvisoria: string;
  papel: (typeof PAPEIS)[number];
  turmaId: string | null;
}

const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

function validar(corpo: unknown): Pedido | string {
  if (typeof corpo !== 'object' || corpo === null) return 'Corpo da requisição inválido.';
  const c = corpo as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const pedido: Pedido = {
    edicaoId: texto(c.edicaoId),
    nome: texto(c.nome),
    email: texto(c.email).toLowerCase(),
    senhaProvisoria: typeof c.senhaProvisoria === 'string' ? c.senhaProvisoria : '',
    papel: texto(c.papel) as Pedido['papel'],
    turmaId: texto(c.turmaId) || null,
  };
  if (!/^[0-9a-f-]{36}$/i.test(pedido.edicaoId)) return 'Edição inválida.';
  if (pedido.nome.length < 2 || pedido.nome.length > 160)
    return 'Informe o nome (2 a 160 caracteres).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pedido.email)) return 'Informe um e-mail válido.';
  if (pedido.senhaProvisoria.length < 10)
    return 'A senha provisória deve ter pelo menos 10 caracteres.';
  if (!PAPEIS.includes(pedido.papel)) return 'Papel inválido.';
  if (EXIGE_TURMA.includes(pedido.papel) && !pedido.turmaId) return 'Selecione a turma.';
  return pedido;
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'Método não permitido.');
    const quemChama = ctx.userClaims?.id;
    if (!quemChama) return erro(401, 'Autenticação necessária.');

    const pedido = validar(await req.json().catch(() => null));
    if (typeof pedido === 'string') return erro(400, pedido);

    // 1. Autorização com a visão (RLS) de quem chama.
    const { data: coordena, error: erroCoord } = await ctx.supabase
      .from('atribuicoes')
      .select('id')
      .eq('usuario_id', quemChama)
      .eq('edicao_id', pedido.edicaoId)
      .eq('papel', 'coordenacao')
      .eq('ativo', true)
      .maybeSingle();
    if (erroCoord) return erro(500, 'Não foi possível verificar a permissão.');
    if (!coordena) return erro(403, 'Somente a coordenação da edição pode criar contas.');

    // 2. Cria o usuário no Auth (privilegiado, somente no servidor).
    const { data: criado, error: erroCriacao } = await ctx.supabaseAdmin.auth.admin.createUser({
      email: pedido.email,
      password: pedido.senhaProvisoria,
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
    const { error: erroAtribuicao } = await ctx.supabase.from('atribuicoes').insert({
      usuario_id: criado.user.id,
      edicao_id: pedido.edicaoId,
      papel: pedido.papel,
      turma_id: EXIGE_TURMA.includes(pedido.papel) ? pedido.turmaId : null,
    });
    if (erroAtribuicao) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(criado.user.id);
      return erro(400, 'Não foi possível vincular a conta à turma. Nada foi criado.');
    }

    return Response.json({ usuarioId: criado.user.id }, { status: 201 });
  }),
};
