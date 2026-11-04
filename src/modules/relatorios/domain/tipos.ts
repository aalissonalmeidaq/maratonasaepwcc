// Contratos de leitura dos painéis e dos relatórios CSV (spec 008, data-model.md). Os números vêm
// prontos do servidor; nenhum formato traz nota individual da prova, e-mail ou id de pessoa.
import type { EstadoRanking } from '@/modules/resultado';

export interface EncontroDoPainel {
  id: string;
  numero: number;
  titulo: string;
  /** `AAAA-MM-DD`. */
  data: string;
  /** `HH:MM` ou nulo quando o horário não foi definido. */
  inicio: string | null;
}

export type TipoAcaoDoAluno = 'manifestacao' | 'revisao_ocorrencia' | 'revisao_publicacao';

export interface AcaoDoAluno {
  tipo: TipoAcaoDoAluno;
  titulo: string;
  /** Prazo efetivo (ISO), já com as exceções registradas pela coordenação. */
  prazo: string;
  caminho: string;
}

export interface PainelDoAluno {
  equipe: { id: string; nome: string } | null;
  previa: { total: number; pendente: boolean } | null;
  ranking: {
    estado: EstadoRanking;
    versao: number;
    /** Nulo quando a equipe não estava na publicação (ex.: formada depois). */
    posicao: number | null;
    compartilhada: boolean;
    publicadoEm: string;
  } | null;
  proximoEncontro: EncontroDoPainel | null;
  proximoPrazo: { tipo: 'desafio' | 'lista'; id: string; titulo: string; prazo: string } | null;
  acoes: AcaoDoAluno[];
  avisosNaoLidos: number;
}

export type TipoPendenciaGestao = 'presenca' | 'participacao' | 'avaliacao' | 'ocorrencia';

export interface PendenciaDaGestao {
  tipo: TipoPendenciaGestao;
  encontroNumero: number;
  descricao: string;
  caminho: string;
}

export interface TurmaDoPainel {
  id: string;
  nome: string;
  categoria: string;
  equipes: number;
  equipesPendentes: number;
  pendencias: PendenciaDaGestao[];
}

export interface PainelDaGestao {
  proximoEncontro: EncontroDoPainel | null;
  turmas: TurmaDoPainel[];
}

/** Linha do painel da coordenação por turma (spec 012, FR-015). */
export interface TurmaDoPainelCoordenacao {
  turmaId: string;
  turma: string;
  categoria: string;
  componentesPendentes: number;
  provasPendentes: number;
  ocorrenciasSemDecisao: number;
  revisoesAbertas: number;
  publicacao: { estado: EstadoRanking; versao: number; publicadoEm: string } | null;
}

export interface PainelDaCoordenacao {
  indicadores: {
    cursos: number;
    turmas: number;
    equipes: number;
    estudantes: number;
    encontrosRealizados: number;
    encontrosTotal: number;
  };
  turmas: TurmaDoPainelCoordenacao[];
}

export type TipoRelatorio = 'pontos' | 'presenca' | 'entregas' | 'ocorrencias' | 'revisoes';

export type TipoColuna = 'texto' | 'numero' | 'data_hora' | 'sim_nao';

export interface ColunaRelatorio {
  id: string;
  rotulo: string;
  tipo: TipoColuna;
}

export type ValorCelula = string | number | boolean | null;

export interface Relatorio {
  colunas: ColunaRelatorio[];
  linhas: Record<string, ValorCelula>[];
}

export interface FiltrosRelatorio {
  edicaoId: string;
  categoria: string | null;
  turmaId: string | null;
  encontroId: string | null;
}

export interface RepositorioPaineis {
  painelDoAluno(edicaoId: string): Promise<PainelDoAluno>;
  painelDaGestao(edicaoId: string): Promise<PainelDaGestao>;
  painelDaCoordenacao(edicaoId: string): Promise<PainelDaCoordenacao>;
  /** Gera os dados no servidor e registra a exportação; recusado na demonstração. */
  relatorio(tipo: TipoRelatorio, filtros: FiltrosRelatorio): Promise<Relatorio>;
}
