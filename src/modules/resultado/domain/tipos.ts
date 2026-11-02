/**
 * Tipos do contrato do resultado oficial (spec 007, contracts/rpc.md). As RPCs devolvem JSON já
 * em camelCase; o repositório só valida a forma e converte erros.
 */
import type {
  ComponentePendente,
  EstadoRanking,
  PontuacaoDoEncontro,
  TipoOcorrencia,
  TotaisDaDupla,
} from '@/modules/pontuacao';

export type { EstadoRanking };

// ---------------------------------------------------------------------------
// Prova oficial (US1)
// ---------------------------------------------------------------------------
export type RealizacaoProva = 'confirmada' | 'pendente' | 'nao_realizou';
export type EstadoNotaProva = 'pendente' | 'confirmada' | 'indisponivel';

/** Linha da coordenação: a única leitura que contém a nota individual (FR-003). */
export interface ResultadoProva {
  estudanteId: string;
  estudanteNome: string;
  duplaId: string;
  duplaNome: string;
  turmaId: string;
  turmaNome: string;
  realizacao: RealizacaoProva | null;
  nota: number | null;
  notaEstado: EstadoNotaProva | null;
  fonte: string | null;
  escalaConfirmada: boolean;
  autorizacaoConfirmada: boolean;
  registradoEm: string | null;
}

export interface RegistroDeProva {
  estudanteId: string;
  realizacao: RealizacaoProva;
  nota?: number | null;
  fonte?: string | null;
  escalaConfirmada: boolean;
  autorizacaoConfirmada: boolean;
  notaIndisponivel?: boolean;
}

// ---------------------------------------------------------------------------
// Ocorrências (US2)
// ---------------------------------------------------------------------------
export type EstadoOcorrencia = 'registrada' | 'manifestada' | 'confirmada' | 'arquivada';
export type ResultadoDecisao = 'confirmada' | 'arquivada';

export interface Ocorrencia {
  id: string;
  edicaoId: string;
  encontroId: string;
  encontroNumero: number;
  duplaId: string;
  duplaNome: string;
  turmaId: string;
  desafioId: string | null;
  tipo: string;
  tipoRotulo: string;
  fato: string;
  evidencia: string;
  evidenciaPath: string | null;
  evidenciaNome: string | null;
  estado: EstadoOcorrencia;
  /** Prazo efetivo de manifestação (com exceção, se houver). */
  prazoManifestacao: string;
  criadoEm: string;
  autorNome: string;
  manifestacao: { texto: string; autorNome: string; enviadaEm: string } | null;
  decisao: {
    justificativa: string;
    apresentacaoDependente: boolean;
    decididoEm: string;
    decididoPorNome: string;
  } | null;
  /** Prazo efetivo para pedir revisão da decisão (nulo antes de decidir). */
  prazoRevisao: string | null;
}

export interface DadosOcorrencia {
  chave: string;
  encontroId: string;
  duplaId: string;
  edicaoId: string;
  tipo: string;
  fato: string;
  evidencia: string;
  desafioId?: string | null;
  fatoChave?: string | null;
  arquivo?: File | null;
}

export type ObjetoPrazo = 'manifestacao' | 'revisao';

// ---------------------------------------------------------------------------
// Pontos oficiais (US3)
// ---------------------------------------------------------------------------
export interface PontosDoEncontro {
  encontroId: string;
  numero: number;
  titulo: string;
  pontuacao: PontuacaoDoEncontro;
}

export interface PontosDaEquipe {
  duplaId: string;
  nome: string;
  totais: TotaisDaDupla;
  encontros: PontosDoEncontro[];
}

export type { ComponentePendente };

// ---------------------------------------------------------------------------
// Ranking publicado (US4)
// ---------------------------------------------------------------------------
export interface PosicaoPublicada {
  duplaId: string;
  nome: string;
  posicao: number;
  compartilhada: boolean;
  total: number;
  pendente: boolean;
  /** Verdadeiro só na linha da equipe de quem consulta (aluno). */
  minha: boolean;
  /** Detalhe por encontro: só para a própria equipe (aluno) ou para a gestão. */
  detalhe?: PontosDoEncontro[];
}

export interface PublicacaoRanking {
  id: string;
  categoria: string;
  versao: number;
  estado: EstadoRanking;
  publicadoEm: string;
  revisaoAte: string | null;
  posicoes: PosicaoPublicada[];
}

export interface VersaoPublicada {
  id: string;
  versao: number;
  estado: EstadoRanking;
  publicadoEm: string;
  publicadoPorNome: string;
  justificativa: string | null;
  revisaoAte: string | null;
}

export interface ResultadoPublicacao {
  id: string;
  versao: number;
  estado: EstadoRanking;
  publicadoEm: string;
  revisaoAte: string | null;
}

export interface PendenciasDaCategoria {
  componentes: {
    duplaId: string;
    duplaNome: string;
    encontroNumero: number;
    componente: ComponentePendente;
  }[];
  ocorrencias: { id: string; duplaNome: string; estado: EstadoOcorrencia }[];
  revisoes: { id: string; duplaNome: string }[];
}

// ---------------------------------------------------------------------------
// Revisão (US5)
// ---------------------------------------------------------------------------
export type ObjetoRevisao = 'ocorrencia' | 'publicacao';
export type ComponenteRevisao =
  'presenca' | 'participacao' | 'avaliacaoObjetiva' | 'entrega' | 'apresentacao';
export type EstadoRevisao = 'aberto' | 'deferido' | 'indeferido';

export interface PedidoRevisao {
  id: string;
  duplaId: string;
  duplaNome: string;
  objeto: ObjetoRevisao;
  ocorrenciaId: string | null;
  publicacaoId: string | null;
  publicacaoVersao: number | null;
  componente: ComponenteRevisao | null;
  encontroId: string | null;
  encontroNumero: number | null;
  justificativa: string;
  estado: EstadoRevisao;
  resposta: string | null;
  respondidoEm: string | null;
  criadoEm: string;
  autorNome: string;
  /** Correções de origem ligadas ao pedido (auditoria). */
  correcoes: { tabela: string; ocorridoEm: string; justificativa: string | null }[];
}

export interface DadosPedidoRevisao {
  chave: string;
  objeto: ObjetoRevisao;
  ocorrenciaId?: string | null;
  publicacaoId?: string | null;
  componente?: ComponenteRevisao | null;
  encontroId?: string | null;
  justificativa: string;
}

// ---------------------------------------------------------------------------
// Avisos (FR-026)
// ---------------------------------------------------------------------------
export type TipoAviso =
  | 'ocorrencia_registrada'
  | 'ocorrencia_decidida'
  | 'ranking_publicado'
  | 'revisao_pedida'
  | 'revisao_respondida';

export interface Aviso {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  referencia: Record<string, unknown>;
  criadoEm: string;
  lidoEm: string | null;
}

export interface Avisos {
  naoLidos: number;
  itens: Aviso[];
}

// ---------------------------------------------------------------------------
// Repositório (uma operação por RPC de contracts/rpc.md)
// ---------------------------------------------------------------------------
export interface RepositorioResultado {
  resultadosProva(encontroId: string): Promise<ResultadoProva[]>;
  registrarResultadosProva(dados: {
    encontroId: string;
    resultados: RegistroDeProva[];
    justificativa?: string;
    pedidoId?: string | null;
  }): Promise<number>;

  /** Tipos de ocorrência das regras versionadas da edição (FR-006). */
  tiposDeOcorrencia(edicaoId: string): Promise<TipoOcorrencia[]>;
  ocorrencias(edicaoId: string, turmaId?: string | null): Promise<Ocorrencia[]>;
  registrarOcorrencia(dados: DadosOcorrencia): Promise<{ id: string; prazoManifestacao: string }>;
  urlEvidencia(caminho: string): Promise<string>;
  enviarManifestacao(ocorrenciaId: string, texto: string): Promise<{ enviadaEm: string }>;
  decidirOcorrencia(dados: {
    ocorrenciaId: string;
    resultado: ResultadoDecisao;
    justificativa: string;
    apresentacaoDependente: boolean;
    pedidoId?: string | null;
  }): Promise<void>;
  registrarExcecaoPrazo(dados: {
    duplaId: string;
    objeto: ObjetoPrazo;
    ocorrenciaId?: string | null;
    publicacaoId?: string | null;
    novoPrazo: string;
    justificativa: string;
  }): Promise<string>;

  pontosDaMinhaEquipe(edicaoId: string): Promise<PontosDaEquipe | null>;
  pontosDaTurma(turmaId: string): Promise<PontosDaEquipe[]>;

  pendenciasDaCategoria(edicaoId: string, categoria: string): Promise<PendenciasDaCategoria>;
  publicarRanking(dados: {
    edicaoId: string;
    categoria: string;
    estado: EstadoRanking;
    justificativa?: string;
  }): Promise<ResultadoPublicacao>;
  rankingPublicado(edicaoId: string, categoria?: string | null): Promise<PublicacaoRanking | null>;
  historicoPublicacoes(edicaoId: string, categoria: string): Promise<VersaoPublicada[]>;

  pedirRevisao(dados: DadosPedidoRevisao): Promise<{ id: string; criadoEm: string }>;
  responderRevisao(dados: {
    pedidoId: string;
    resposta: 'deferido' | 'indeferido';
    justificativa: string;
  }): Promise<void>;
  pedidosRevisao(edicaoId: string): Promise<PedidoRevisao[]>;

  meusAvisos(): Promise<Avisos>;
  marcarAvisosLidos(ids: string[]): Promise<number>;
}
