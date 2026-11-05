/**
 * Gestão de edições na DEMONSTRAÇÃO (spec 010): a edição fictícia ativa, uma segunda edição em
 * preparação (vista só pela coordenação) e o cadastro permanente montado a partir dos cursos e
 * turmas fictícios. Nenhuma escrita é aceita.
 */
import type {
  CursoDoCadastro,
  Edicao,
  EdicaoGerida,
  PendenciasDaEdicao,
  RepositorioOrganizacao,
  TurmaSemDefinitiva,
} from '@/modules/organizacao';
import { cursos, duplas, edicao, turmas } from './dados';
import { estadoDaUltimaPublicacaoDemo } from './resultado';

const recusar = async (): Promise<never> => {
  throw new Error('Indisponível no modo demonstração: nenhuma alteração é gravada.');
};

export const EDICAO_EM_PREPARACAO = {
  id: 'ed-demo-preparacao',
  nome: 'Maratona SAEP — próxima edição (fictícia)',
};

/** Edição encerrada fictícia, com o registro do encerramento (spec 013). */
export const EDICAO_ENCERRADA = {
  id: 'ed-demo-encerrada',
  nome: 'Maratona SAEP — edição anterior (fictícia)',
};
const ENCERRAMENTO = {
  encerradaEm: '2025-12-05T15:00:00Z',
  justificativaEncerramento: 'Encerramento fictício da edição anterior.',
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
  const encerrada: Edicao = {
    ...ativa,
    ...EDICAO_ENCERRADA,
    estado: 'encerrada',
    inicio: '2025-03-03',
    fim: '2025-11-28',
  };
  return coordena ? [ativa, preparacao, encerrada] : [ativa];
}

/** Turmas com equipes cuja última publicação fictícia não é a definitiva (spec 013). */
function turmasSemDefinitiva(): TurmaSemDefinitiva[] {
  return turmas
    .filter((t) => duplas.some((d) => d.turmaId === t.id))
    .flatMap((t): TurmaSemDefinitiva[] => {
      const estado = estadoDaUltimaPublicacaoDemo(t.id);
      if (estado === 'definitivo') return [];
      return [
        {
          turmaId: t.id,
          turma: t.nome,
          categoria: cursos.find((c) => c.id === t.cursoId)?.categoria ?? '',
          estado: estado ?? 'sem_publicacao',
        },
      ];
    });
}

const pendenciasDemo = (): PendenciasDaEdicao => ({
  ocorrenciasSemDecisao: 0,
  revisoesAbertas: 0,
  turmasSemDefinitiva: turmasSemDefinitiva(),
});

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
        regulamentoPublico: e.estado === 'ativa',
        id: e.id,
        nome: e.nome,
        inicio: e.inicio,
        fim: e.fim,
        estado: e.estado,
        regrasVersao: e.regrasVersao,
        ...(e.id === EDICAO_ENCERRADA.id
          ? { ...ENCERRAMENTO, pendenciasNoEncerramento: pendenciasDemo() }
          : {}),
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
      return pendenciasDemo();
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
