/** Critério de uma rubrica (participação, entrega ou apresentação). */
export interface CriterioRubrica {
  id: string;
  rotulo: string;
  maximo: number;
}

export interface FaixaDeAtraso {
  /** Limite superior inclusivo, em minutos. */
  ateMinutos: number;
  desconto: number;
}

/**
 * Regras de pontuação de uma edição. São configuração versionada (constituição, princípio X):
 * nenhuma função de cálculo usa números fixos fora deste objeto.
 */
export interface RegrasDaEdicao {
  versao: string;
  quantidadeEncontros: number;
  casasDecimais: number;
  presenca: { pontosPorIntegrante: number; maximoPorDupla: number };
  participacao: { criterios: CriterioRubrica[] };
  questoes: { maximo: number };
  entrega: {
    criterios: CriterioRubrica[];
    criterioDeAtraso: string;
    faixasDeAtraso: FaixaDeAtraso[];
    limiteAtrasoMinutos: number;
  };
  apresentacao: { criterios: CriterioRubrica[] };
  provaOficial: {
    pontosRealizacao: number;
    notaMinimaBonus: number;
    pontosBonus: number;
    maximoPorDupla: number;
  };
  penalidades: { tetoDescontosPorEncontro: number };
}

export type Notas = Readonly<Record<string, number>>;

export interface RegistroPresenca {
  estudanteId: string;
  presente: boolean;
}

export type NotaOficial = { estado: 'pendente' } | { estado: 'confirmada'; valor: number };

export interface ResultadoProvaOficial {
  estudanteId: string;
  realizacao: 'confirmada' | 'pendente' | 'nao_realizou';
  nota: NotaOficial;
}

export type AvaliacaoObjetiva =
  | { tipo: 'questoes'; acertos: number; total: number }
  | { tipo: 'prova_oficial'; resultados: ResultadoProvaOficial[] };

export type LancamentoEntrega =
  | { situacao: 'pendente' }
  | { situacao: 'nao_entregue' }
  | {
      situacao: 'avaliada';
      notas: Notas;
      atrasoMinutos: number;
      /** Prorrogação ou impedimento justificado registrado pela organização. */
      excecaoAutorizada?: boolean;
      plagioComprovado?: boolean;
    };

export type LancamentoApresentacao =
  | { situacao: 'pendente' }
  | { situacao: 'nao_avaliavel'; justificativa: string }
  | { situacao: 'avaliada'; notas: Notas };

export interface Penalidade {
  id: string;
  /** Identificador do fato: penalidades com o mesmo fato não se acumulam. */
  fatoId: string;
  pontos: number;
}

export interface LancamentosDoEncontro {
  presencas: RegistroPresenca[];
  participacao?: Notas;
  avaliacaoObjetiva?: AvaliacaoObjetiva;
  entrega: LancamentoEntrega;
  apresentacao: LancamentoApresentacao;
  penalidades: Penalidade[];
}

export type ComponentePendente = 'participacao' | 'avaliacaoObjetiva' | 'entrega' | 'apresentacao';

export interface PontuacaoDoEncontro {
  presenca: number;
  participacao: number;
  avaliacaoObjetiva: number;
  entrega: number;
  apresentacao: number;
  descontos: number;
  total: number;
  pendencias: ComponentePendente[];
}

export interface TotaisDaDupla {
  total: number;
  entrega: number;
  avaliacaoObjetiva: number;
  presenca: number;
  pendente: boolean;
}

export type EstadoRanking = 'parcial' | 'provisorio' | 'definitivo';
