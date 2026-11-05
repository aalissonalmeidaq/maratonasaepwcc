import type { Edicao } from './tipos';

export type EstadoEdicao = Edicao['estado'];

/** Edição que a pessoa coordena, como devolvida por `edicoes_que_coordeno` (spec 010). */
export interface EdicaoGerida {
  regulamentoPublico: boolean;
  id: string;
  nome: string;
  inicio: string | null;
  fim: string | null;
  estado: EstadoEdicao;
  regrasVersao: string;
  encerradaEm?: string | null;
  justificativaEncerramento?: string | null;
  /** Pendências gravadas no encerramento, no formato da época (spec 013, FR-006a). */
  pendenciasNoEncerramento?: RegistroDoEncerramento | null;
}

export interface EntradaEdicao {
  nome: string;
  inicio: string | null;
  fim: string | null;
}

/** Turma cuja última publicação do ranking não é a definitiva (spec 013, FR-001). */
export interface TurmaSemDefinitiva {
  turmaId: string;
  turma: string;
  categoria: string;
  estado: 'sem_publicacao' | 'parcial' | 'provisorio';
}

/** Pendências mostradas antes de encerrar (FR-011); não impedem o encerramento. */
export interface PendenciasDaEdicao {
  ocorrenciasSemDecisao: number;
  revisoesAbertas: number;
  turmasSemDefinitiva: TurmaSemDefinitiva[];
}

/**
 * Pendências gravadas no encerramento: o formato novo (turmas, spec 013) ou o anterior
 * (categorias, spec 010), como foram registradas.
 */
export interface RegistroDoEncerramento {
  ocorrenciasSemDecisao: number;
  revisoesAbertas: number;
  turmasSemDefinitiva?: TurmaSemDefinitiva[];
  categoriasSemRanking?: string[];
}

export type ErrosDaEdicao = Partial<Record<keyof EntradaEdicao, string>>;

/** Mesmas regras do servidor: nome de 3 a 160 caracteres; fim não anterior ao início. */
export function validarEdicao(e: EntradaEdicao): ErrosDaEdicao {
  const erros: ErrosDaEdicao = {};
  const nome = e.nome.trim();
  if (nome.length < 3 || nome.length > 160) erros.nome = 'Informe um nome de 3 a 160 caracteres.';
  if (e.inicio && e.fim && e.fim < e.inicio) erros.fim = 'O fim não pode ser antes do início.';
  return erros;
}

const porInicioDesc = (a: Edicao, b: Edicao) => {
  if (a.inicio === b.inicio) return 0;
  if (a.inicio === null) return 1;
  if (b.inicio === null) return -1;
  return a.inicio < b.inicio ? 1 : -1;
};

/** Edição inicial do seletor: a ativa de maior início; sem ativa, a de maior início (FR-019). */
export function edicaoPadrao(edicoes: Edicao[]): Edicao | null {
  const ativas = edicoes.filter((e) => e.estado === 'ativa');
  return [...(ativas.length > 0 ? ativas : edicoes)].sort(porInicioDesc)[0] ?? null;
}
