import type { SupabaseClient } from '@supabase/supabase-js';
import type { Papel } from '@/modules/acesso';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type { RepositorioOrganizacao } from '../domain/tipos';

export function criarRepositorioOrganizacaoSupabase(sb: SupabaseClient): RepositorioOrganizacao {
  return {
    async edicoes() {
      const dados = verificar(
        await sb
          .from('edicoes')
          .select('id, nome, estado, regras, regras_versao')
          .order('criado_em', { ascending: false }),
      );
      return dados.map((e) => ({
        id: e.id,
        nome: e.nome,
        estado: e.estado,
        quantidadeEncontros: Number(
          (e.regras as { quantidadeEncontros?: number })?.quantidadeEncontros ?? 0,
        ),
        regrasVersao: e.regras_versao,
      }));
    },
    async cursos(edicaoId) {
      const dados = verificar(
        await sb
          .from('cursos')
          .select('id, edicao_id, nome, categoria')
          .eq('edicao_id', edicaoId)
          .order('nome'),
      );
      return dados.map((c) => ({
        id: c.id,
        edicaoId: c.edicao_id,
        nome: c.nome,
        categoria: c.categoria,
      }));
    },
    async turmas(edicaoId) {
      const dados = verificar(
        await sb
          .from('turmas')
          .select('id, curso_id, nome, ano_letivo, cursos!inner(edicao_id)')
          .eq('cursos.edicao_id', edicaoId)
          .order('nome'),
      );
      return dados.map((t) => ({
        id: t.id,
        cursoId: t.curso_id,
        nome: t.nome,
        anoLetivo: t.ano_letivo,
      }));
    },
    async salvarCurso({ id, edicaoId, nome, categoria }) {
      const linha = { edicao_id: edicaoId, nome: nome.trim(), categoria: categoria.trim() };
      verificarGravacao(
        id
          ? await sb.from('cursos').update(linha).eq('id', id)
          : await sb.from('cursos').insert(linha),
      );
    },
    async removerCurso(id) {
      verificarGravacao(await sb.from('cursos').delete().eq('id', id));
    },
    async salvarTurma({ id, cursoId, nome, anoLetivo }) {
      const linha = { curso_id: cursoId, nome: nome.trim(), ano_letivo: anoLetivo };
      verificarGravacao(
        id
          ? await sb.from('turmas').update(linha).eq('id', id)
          : await sb.from('turmas').insert(linha),
      );
    },
    async removerTurma(id) {
      verificarGravacao(await sb.from('turmas').delete().eq('id', id));
    },
    async vinculos(edicaoId) {
      const dados = verificar(
        await sb
          .from('atribuicoes')
          .select(
            'id, usuario_id, papel, turma_id, ativo, perfis!atribuicoes_usuario_id_fkey(nome)',
          )
          .eq('edicao_id', edicaoId)
          .order('papel'),
      );
      return dados.map((a) => ({
        id: a.id,
        usuarioId: a.usuario_id,
        nome: (a.perfis as unknown as { nome: string } | null)?.nome ?? '—',
        papel: a.papel as Papel,
        turmaId: a.turma_id,
        ativo: a.ativo,
      }));
    },
    async pessoas() {
      return verificar(await sb.from('perfis').select('id, nome').eq('ativo', true).order('nome'));
    },
    async vincular({ usuarioId, edicaoId, papel, turmaId }) {
      verificarGravacao(
        await sb
          .from('atribuicoes')
          .insert({ usuario_id: usuarioId, edicao_id: edicaoId, papel, turma_id: turmaId }),
      );
    },
    async definirVinculoAtivo(id, ativo) {
      verificarGravacao(await sb.from('atribuicoes').update({ ativo }).eq('id', id));
    },
    async criarConta(dados) {
      const { error } = await sb.functions.invoke('criar-conta', { body: dados });
      if (!error) return;
      // A função responde { erro } com mensagem em português.
      const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
      throw new Error(
        (corpo as { erro?: string } | null)?.erro ?? 'Não foi possível criar a conta.',
      );
    },
  };
}
