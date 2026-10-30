/** Projeção de leitura do painel da turma (spec 004), devolvida pela RPC `painel_da_turma`. */

/** `gestao`: coordenação da edição, docente ou mentor da turma; `aluno`: aluno ativo da turma. */
export type VisaoPainel = 'gestao' | 'aluno';

export interface TurmaDoPainel {
  id: string;
  nome: string;
  anoLetivo: number | null;
  cursoNome: string;
  categoria: string;
  edicaoId: string;
}

/** Só nome e se já tem equipe (FR-003): nenhum dado de contato ou situação individual. */
export interface AlunoDoPainel {
  id: string;
  nome: string;
  temEquipe: boolean;
}

export interface IntegranteDoPainel {
  estudanteId: string;
  nome: string;
  /** Sempre `false` na visão do aluno. */
  integranteInativo: boolean;
}

export interface EquipeDoPainel {
  id: string;
  nome: string | null;
  integrantes: IntegranteDoPainel[];
}

export type EstadoEncontroPainel = 'agendado' | 'realizado' | 'cancelado';

export interface EncontroDoPainel {
  id: string;
  numero: number;
  titulo: string;
  /** AAAA-MM-DD */
  data: string;
  /** HH:MM ou `null` (a confirmar) */
  inicio: string | null;
  fim: string | null;
  estado: EstadoEncontroPainel;
  ambienteNome: string | null;
}

export type EstadoClassificacao = 'parcial' | 'provisorio' | 'definitivo';

/** Só o total da equipe e a posição na categoria: sem componentes nem notas individuais. */
export interface PontuacaoDaEquipe {
  equipeId: string;
  nome: string;
  total: number;
  posicao: number;
  compartilhada: boolean;
  /** Há lançamentos pendentes: a pontuação pode mudar. */
  pendente: boolean;
}

/** Pontuação da turma (FR-005). Por enquanto, só a demonstração a preenche. */
export interface PontuacaoDoPainel {
  /** `true` na demonstração: a interface exibe o selo "Dados fictícios". */
  ficticia: boolean;
  estado: EstadoClassificacao;
  /** Publicada pela coordenação (em qualquer estado, PRD RF16/HU05). Na visão do aluno, `equipes` fica vazio se `false`. */
  publicada: boolean;
  /** Ordenadas pela posição na categoria. */
  equipes: PontuacaoDaEquipe[];
}

export interface PainelTurma {
  visao: VisaoPainel;
  turma: TurmaDoPainel;
  alunos: AlunoDoPainel[];
  equipes: EquipeDoPainel[];
  /** `null` na visão do aluno. */
  convitesPendentes: number | null;
  /** `null` enquanto não houver lançamentos reais (Incrementos 3/4). */
  pontuacao: PontuacaoDoPainel | null;
  encontros: EncontroDoPainel[];
}

export interface RepositorioPainelTurma {
  painel(turmaId: string): Promise<PainelTurma>;
}
