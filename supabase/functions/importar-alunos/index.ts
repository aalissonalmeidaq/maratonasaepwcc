// Edge Function: importação de alunos de uma turma por CSV (spec 002, FR-015, US6 cenário 5).
//
// O navegador lê o arquivo e mostra a prévia; aqui chegam só as linhas confirmadas, que são
// revalidadas. Cada linha é independente:
// - e-mail que já tem conta → apenas o vínculo de aluno na turma (sem novo convite);
// - e-mail novo → conta sem senha + vínculo + convite de primeiro acesso por e-mail;
// - recusas voltam com o motivo (ex.: já ativo em outra turma da edição).
// Vínculos são gravados com o cliente da coordenação (RLS + auditoria).
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { coordenaAEdicao } from '../_shared/autorizacao.ts';
import { enviarConvite } from '../_shared/enviar-convite.ts';

const LIMITE = 500;
const UUID = /^[0-9a-f-]{36}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

interface Linha {
  linha: number;
  nome: string;
  email: string;
}

function motivoDoVinculo(mensagem: string): string {
  if (mensagem.includes('atribuicoes_aluno_uma_turma'))
    return 'Já ativo em outra turma desta edição.';
  if (mensagem.includes('atribuicoes_unica')) return 'Já é aluno desta turma.';
  return 'Não foi possível vincular à turma.';
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'Método não permitido.');
    const quemChama = ctx.userClaims?.id;
    if (!quemChama) return erro(401, 'Autenticação necessária.');

    const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const edicaoId = typeof corpo?.edicaoId === 'string' ? corpo.edicaoId : '';
    const turmaId = typeof corpo?.turmaId === 'string' ? corpo.turmaId : '';
    const linhas = Array.isArray(corpo?.linhas) ? (corpo.linhas as unknown[]) : null;
    if (!UUID.test(edicaoId) || !UUID.test(turmaId) || !linhas)
      return erro(400, 'Pedido inválido.');
    if (linhas.length === 0) return erro(400, 'Nenhum aluno para importar.');
    if (linhas.length > LIMITE)
      return erro(413, `Envie no máximo ${LIMITE} alunos por importação.`);

    const coordena = await coordenaAEdicao(ctx.supabase, quemChama, edicaoId);
    if (coordena === 'erro') return erro(500, 'Não foi possível verificar a permissão.');
    if (coordena === 'nao')
      return erro(403, 'Somente a coordenação da edição pode importar alunos.');

    const { data: turma } = await ctx.supabase
      .from('turmas')
      .select('id, cursos!inner(edicao_id)')
      .eq('id', turmaId)
      .maybeSingle();
    const edicaoDaTurma = (turma as { cursos?: { edicao_id: string } } | null)?.cursos?.edicao_id;
    if (edicaoDaTurma !== edicaoId) return erro(400, 'A turma não pertence a esta edição.');

    const criadas: { linha: number; email: string; conviteEnviado: boolean }[] = [];
    const vinculadas: { linha: number; email: string }[] = [];
    const recusadas: { linha: number; email: string; motivo: string }[] = [];
    const vistos = new Set<string>();

    const vincular = (usuarioId: string) =>
      ctx.supabase.from('atribuicoes').insert({
        usuario_id: usuarioId,
        edicao_id: edicaoId,
        papel: 'aluno',
        turma_id: turmaId,
      });

    for (const bruta of linhas) {
      const l = bruta as Partial<Linha>;
      const numero = typeof l.linha === 'number' ? l.linha : 0;
      const email = typeof l.email === 'string' ? l.email.trim().toLowerCase() : '';
      const nome = typeof l.nome === 'string' ? l.nome.trim().replace(/\s+/g, ' ') : '';
      const recusar = (motivo: string) => recusadas.push({ linha: numero, email, motivo });

      if (!EMAIL.test(email)) {
        recusar('E-mail inválido.');
        continue;
      }
      if (nome.length < 2 || nome.length > 160) {
        recusar('O nome deve ter de 2 a 160 caracteres.');
        continue;
      }
      if (vistos.has(email)) {
        recusar('E-mail repetido na importação.');
        continue;
      }
      vistos.add(email);

      const { data: existente, error: erroBusca } = await ctx.supabaseAdmin.rpc(
        'usuario_por_email',
        { p_email: email },
      );
      if (erroBusca) {
        recusar('Não foi possível verificar o e-mail.');
        continue;
      }

      if (existente) {
        const { error } = await vincular(existente as string);
        if (error) recusar(motivoDoVinculo(error.message));
        else vinculadas.push({ linha: numero, email });
        continue;
      }

      const { data: criado, error: erroCriacao } = await ctx.supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { nome },
      });
      if (erroCriacao || !criado.user) {
        recusar('Não foi possível criar a conta.');
        continue;
      }
      const { error: erroVinculo } = await vincular(criado.user.id);
      if (erroVinculo) {
        await ctx.supabaseAdmin.auth.admin.deleteUser(criado.user.id);
        recusar(motivoDoVinculo(erroVinculo.message));
        continue;
      }
      const conviteEnviado = await enviarConvite(ctx.supabaseAdmin, {
        usuarioId: criado.user.id,
        edicaoId,
        criadoPor: quemChama,
        nome,
        email,
      });
      criadas.push({ linha: numero, email, conviteEnviado });
    }

    return Response.json({ criadas, vinculadas, recusadas });
  }),
};
