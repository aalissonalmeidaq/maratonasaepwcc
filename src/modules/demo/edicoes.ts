/**
 * Gestão de edições na DEMONSTRAÇÃO (spec 010): a edição fictícia ativa, uma segunda edição em
 * preparação (vista só pela coordenação) e o cadastro permanente montado a partir dos cursos e
 * turmas fictícios. Nenhuma escrita é aceita.
 */
import type {
  CursoDoCadastro,
  Edicao,
  EdicaoGerida,
  RepositorioOrganizacao,
} from '@/modules/organizacao';
import { cursos, edicao, turmas } from './dados';

const recusar = async (): Promise<never> => {
  throw new Error('Indisponível no modo demonstração: nenhuma alteração é gravada.');
};

export const EDICAO_EM_PREPARACAO = {
  id: 'ed-demo-preparacao',
  nome: 'Maratona SAEP — próxima edição (fictícia)',
};

export function edicoesDemo(coordena: boolean, papeis: Edicao['meusPapeis'] = []): Edicao[] {
  const ativa: Edicao = {
    id: edicao.id,
    nome: edicao.nome,
    estado: 'ativa',
    inicio: '2026-03-02',
    fim: '2026-11-27',
    quantidadeEncontros: edicao.regras.quantidadeEncontros,
    regrasVersao: edicao.regras.versao,
    regras: edicao.regras,
    meusPapeis: papeis,
  };
  const preparacao: Edicao = {
    ...ativa,
    ...EDICAO_EM_PREPARACAO,
    estado: 'rascunho',
    inicio: null,
    fim: null,
  };
  return coordena ? [ativa, preparacao] : [ativa];
}

type MetodosDeEdicao = Pick<
  RepositorioOrganizacao,
  | 'edicoesQueCoordeno'
  | 'criarEdicao'
  | 'alterarEdicao'
  | 'apagarEdicao'
  | 'ativarEdicao'
  | 'pendenciasDaEdicao'
  | 'encerrarEdicao'
  | 'cadastro'
  | 'salvarCursoDoCadastro'
  | 'salvarTurmaDoCadastro'
  | 'apagarDoCadastro'
  | 'atualizarDoCadastro'
  | 'vincularTurmas'
  | 'desvincularTurma'
  | 'pessoasParaVincular'
  | 'vincularMentorAoCurso'
  | 'desvincularMentorDoCurso'
  | 'atribuirCoordenacao'
  | 'desativarCoordenacao'
>;

export function criarEdicoesDemo(coordena: () => boolean): MetodosDeEdicao {
  const exigirCoordenacao = () => {
    if (!coordena()) throw new Error('Você não tem permissão para esta operação.');
  };
  return {
    async edicoesQueCoordeno() {
      exigirCoordenacao();
      return edicoesDemo(true).map((e): EdicaoGerida => ({
        id: e.id,
        nome: e.nome,
        inicio: e.inicio,
        fim: e.fim,
        estado: e.estado,
        regrasVersao: e.regrasVersao,
      }));
    },
    async cadastro() {
      exigirCoordenacao();
      return cursos.map((c): CursoDoCadastro => ({
        id: `cad-${c.id}`,
        nome: c.nome,
        categoria: c.categoria,
        turmas: turmas
          .filter((t) => t.cursoId === c.id)
          .map((t) => ({
            id: `cad-${t.id}`,
            nome: t.nome,
            anoLetivo: null,
            edicoes: [{ id: edicao.id, nome: edicao.nome, estado: 'ativa' }],
          })),
      }));
    },
    async pendenciasDaEdicao() {
      exigirCoordenacao();
      return { ocorrenciasSemDecisao: 0, revisoesAbertas: 0, categoriasSemRanking: [] };
    },
    async pessoasParaVincular() {
      exigirCoordenacao();
      return [];
    },
    criarEdicao: recusar,
    alterarEdicao: recusar,
    apagarEdicao: recusar,
    ativarEdicao: recusar,
    encerrarEdicao: recusar,
    salvarCursoDoCadastro: recusar,
    salvarTurmaDoCadastro: recusar,
    apagarDoCadastro: recusar,
    atualizarDoCadastro: recusar,
    vincularTurmas: recusar,
    desvincularTurma: recusar,
    vincularMentorAoCurso: recusar,
    desvincularMentorDoCurso: recusar,
    atribuirCoordenacao: recusar,
    desativarCoordenacao: recusar,
  };
}
