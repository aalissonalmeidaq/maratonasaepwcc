import type { SupabaseClient } from '@supabase/supabase-js';
import type { Papel } from '@/modules/acesso';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type { CursoDoCadastro, PessoaParaVincular } from '../domain/cadastro';
import type { EdicaoGerida, EntradaEdicao, PendenciasDaEdicao } from '../domain/edicoes';
import type { RepositorioOrganizacao, ResultadoDaImportacao } from '../domain/tipos';

const dadosDaEdicao = (e: EntradaEdicao) => ({
  p_nome: e.nome.trim(),
  p_inicio: e.inicio || null,
  p_fim: e.fim || null,
});

export function criarRepositorioOrganizacaoSupabase(sb: SupabaseClient): RepositorioOrganizacao {
  return {
    async definirRegulamentoPublico(id, publico) {
      const resposta: unknown = verificar(
        await sb.rpc('definir_regulamento_publico', { p_id: id, p_publico: publico }),
      );
      if (
        !resposta ||
        typeof resposta !== 'object' ||
        !('regulamentoPublico' in resposta) ||
        typeof resposta.regulamentoPublico !== 'boolean'
      )
        throw new Error('Resposta de publicação inválida. Tente novamente.');
      return { regulamentoPublico: resposta.regulamentoPublico };
    },
    async edicoes() {
      const dados = verificar(
        await sb
          .from('edicoes')
          .select('id, nome, estado, inicio, fim, regras, regras_versao')
          .order('criado_em', { ascending: false }),
      );
      // Papéis da própria pessoa por edição (a RLS deixa cada um ler as próprias atribuições).
      const { data: sessao } = await sb.auth.getSession();
      const eu = sessao.session?.user.id;
      const papeis = eu
        ? verificar(
            await sb
              .from('atribuicoes')
              .select('edicao_id, papel')
              .eq('usuario_id', eu)
              .eq('ativo', true),
          )
        : [];
      return dados.map((e) => ({
        id: e.id,
        nome: e.nome,
        estado: e.estado,
        meusPapeis: papeis.filter((a) => a.edicao_id === e.id).map((a) => a.papel as Papel),
        inicio: e.inicio,
        fim: e.fim,
        quantidadeEncontros: Number(
          (e.regras as { quantidadeEncontros?: number })?.quantidadeEncontros ?? 0,
        ),
        regrasVersao: e.regras_versao,
        regras: e.regras,
      }));
    },
    async cursos(edicaoId) {
      const dados = verificar(
        await sb
          .from('cursos')
          .select('id, edicao_id, nome, categoria, cadastro_curso_id')
          .eq('edicao_id', edicaoId)
          .order('nome'),
      );
      return dados.map((c) => ({
        id: c.id,
        edicaoId: c.edicao_id,
        nome: c.nome,
        categoria: c.categoria,
        cadastroCursoId: c.cadastro_curso_id,
      }));
    },
    async turmas(edicaoId) {
      const dados = verificar(
        await sb
          .from('turmas')
          .select('id, curso_id, nome, ano_letivo, cadastro_turma_id, cursos!inner(edicao_id)')
          .eq('cursos.edicao_id', edicaoId)
          .order('nome'),
      );
      return dados.map((t) => ({
        id: t.id,
        cursoId: t.curso_id,
        nome: t.nome,
        anoLetivo: t.ano_letivo,
        cadastroTurmaId: t.cadastro_turma_id,
      }));
    },
    async vinculos(edicaoId) {
      const dados = verificar(
        await sb
          .from('atribuicoes')
          .select(
            'id, usuario_id, papel, turma_id, curso_id, origem_id, ativo, perfis!atribuicoes_usuario_id_fkey(nome)',
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
        cursoId: a.curso_id,
        derivado: a.origem_id !== null,
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
    async situacaoDeAcesso(edicaoId) {
      const dados = verificar(await sb.rpc('situacao_de_acesso', { p_edicao: edicaoId }));
      return (
        dados as {
          usuario_id: string;
          email: string;
          acesso_ativo: boolean;
          convite_expira_em: string | null;
        }[]
      ).map((s) => ({
        usuarioId: s.usuario_id,
        email: s.email,
        acessoAtivo: s.acesso_ativo,
        conviteExpiraEm: s.convite_expira_em,
      }));
    },
    async importarAlunos(dados) {
      const { data, error } = await sb.functions.invoke('importar-alunos', { body: dados });
      if (!error) return data as ResultadoDaImportacao;
      const resposta = await (error as { context?: Response }).context?.json?.().catch(() => null);
      throw new Error(
        (resposta as { erro?: string } | null)?.erro ?? 'Não foi possível importar os alunos.',
      );
    },
    async reenviarConvite(dados) {
      return invocarFuncaoDeConta(
        sb,
        'reenviar-convite',
        dados,
        'Não foi possível reenviar o convite.',
      );
    },
    async criarConta(dados) {
      return invocarFuncaoDeConta(sb, 'criar-conta', dados, 'Não foi possível criar a conta.');
    },

    // Spec 010 — uma RPC por operação (contracts/rpc.md).
    async edicoesQueCoordeno() {
      return verificar(await sb.rpc('edicoes_que_coordeno')) as EdicaoGerida[];
    },
    async criarEdicao(chave, e, baseEdicaoId) {
      return verificar(
        await sb.rpc('criar_edicao', {
          p_chave: chave,
          ...dadosDaEdicao(e),
          p_base_edicao: baseEdicaoId,
        }),
      ) as string;
    },
    async alterarEdicao(id, e) {
      verificarGravacao(await sb.rpc('alterar_edicao', { p_id: id, ...dadosDaEdicao(e) }));
    },
    async apagarEdicao(id) {
      verificarGravacao(await sb.rpc('apagar_edicao', { p_id: id }));
    },
    async ativarEdicao(id) {
      return verificar(await sb.rpc('ativar_edicao', { p_id: id })) as { ativadaEm: string };
    },
    async pendenciasDaEdicao(id) {
      return verificar(await sb.rpc('pendencias_da_edicao', { p_id: id })) as PendenciasDaEdicao;
    },
    async encerrarEdicao(id, justificativa) {
      return verificar(
        await sb.rpc('encerrar_edicao', { p_id: id, p_justificativa: justificativa.trim() }),
      ) as { encerradaEm: string; pendencias: PendenciasDaEdicao };
    },
    async cadastro() {
      return verificar(await sb.rpc('cadastro')) as CursoDoCadastro[];
    },
    async salvarCursoDoCadastro(id, nome, categoria) {
      return verificar(
        await sb.rpc('salvar_curso_do_cadastro', {
          p_id: id,
          p_nome: nome.trim(),
          p_categoria: categoria.trim(),
        }),
      ) as string;
    },
    async salvarTurmaDoCadastro(id, cursoId, nome, anoLetivo) {
      return verificar(
        await sb.rpc('salvar_turma_do_cadastro', {
          p_id: id,
          p_curso: cursoId,
          p_nome: nome.trim(),
          p_ano_letivo: anoLetivo,
        }),
      ) as string;
    },
    async apagarDoCadastro(tipo, id) {
      verificarGravacao(await sb.rpc('apagar_do_cadastro', { p_tipo: tipo, p_id: id }));
    },
    async atualizarDoCadastro(edicaoId) {
      return verificar(await sb.rpc('atualizar_do_cadastro', { p_edicao: edicaoId })) as {
        cursos: number;
        turmas: number;
      };
    },
    async vincularTurmas(edicaoId, cadastroTurmaIds) {
      return verificar(
        await sb.rpc('vincular_turmas', { p_edicao: edicaoId, p_turmas: cadastroTurmaIds }),
      ) as { turmaId: string; cadastroTurmaId: string }[];
    },
    async desvincularTurma(turmaId) {
      verificarGravacao(await sb.rpc('desvincular_turma', { p_turma: turmaId }));
    },
    async pessoasParaVincular(edicaoId, busca) {
      return verificar(
        await sb.rpc('pessoas_para_vincular', { p_edicao: edicaoId, p_busca: busca.trim() }),
      ) as PessoaParaVincular[];
    },
    async vincularMentorAoCurso(cursoId, usuarioId) {
      verificarGravacao(
        await sb.rpc('vincular_mentor_ao_curso', { p_curso: cursoId, p_usuario: usuarioId }),
      );
    },
    async desvincularMentorDoCurso(cursoId, usuarioId) {
      verificarGravacao(
        await sb.rpc('desvincular_mentor_do_curso', { p_curso: cursoId, p_usuario: usuarioId }),
      );
    },
    async atribuirCoordenacao(edicaoId, usuarioId) {
      verificarGravacao(
        await sb.rpc('atribuir_coordenacao', { p_edicao: edicaoId, p_usuario: usuarioId }),
      );
    },
    async desativarCoordenacao(edicaoId, usuarioId) {
      verificarGravacao(
        await sb.rpc('desativar_coordenacao', { p_edicao: edicaoId, p_usuario: usuarioId }),
      );
    },
  };
}

/** Funções de conta respondem `{ conviteEnviado }` ou `{ erro }` com mensagem em português. */
async function invocarFuncaoDeConta(
  sb: SupabaseClient,
  nome: string,
  corpo: object,
  padrao: string,
): Promise<{ conviteEnviado: boolean }> {
  const { data, error } = await sb.functions.invoke(nome, { body: corpo });
  if (!error)
    return { conviteEnviado: Boolean((data as { conviteEnviado?: boolean }).conviteEnviado) };
  const resposta = await (error as { context?: Response }).context?.json?.().catch(() => null);
  throw new Error((resposta as { erro?: string } | null)?.erro ?? padrao);
}
