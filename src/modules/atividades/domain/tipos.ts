/**
 * Tipos das atividades dos encontros (spec 006). Espelham as respostas das RPCs; a autoridade
 * sobre prazos, limites e permissões é sempre o servidor.
 */
import type { Notas, RegrasDaEdicao } from '@/modules/pontuacao';

export type EstadoAtividade = 'rascunho' | 'publicado' | 'encerrado';

// ---------------------------------------------------------------------------
// Desafios e entregas
// ---------------------------------------------------------------------------
export interface Desafio {
  id: string;
  edicaoId: string;
  encontroId: string;
  titulo: string;
  enunciado: string;
  recursosPermitidos: string;
  politicaIa: string;
  /** ISO 8601 (horário do servidor) */
  prazo: string;
  aceitaArquivo: boolean;
  aceitaLink: boolean;
  estado: EstadoAtividade;
  turmas: string[];
}

export type DadosDesafio = Omit<Desafio, 'id' | 'edicaoId' | 'estado'> & { id?: string };

export interface Comprovante {
  protocolo: string;
  /** Horário do servidor (ISO 8601). */
  recebidaEm: string;
  versao: number;
  atrasoMinutos: number;
  descontoPrevisto: number;
}

export interface EntregaVersao extends Comprovante {
  id: string;
  autorNome: string;
  arquivoPath: string | null;
  arquivoNome: string | null;
  link: string | null;
}

/** Uma tentativa de envio: a `chave` é reaproveitada se a pessoa tentar de novo (idempotência). */
export interface EnvioDeEntrega {
  desafioId: string;
  duplaId: string;
  chave: string;
  arquivo?: File;
  link?: string;
}

export interface AvaliacaoRegistrada {
  notasEntrega: Notas | null;
  notasApresentacao: Notas | null;
  apresentacaoNaoAvaliavel: boolean;
  feedback: string | null;
  registradoEm: string;
}

export interface Prorrogacao {
  novoPrazo: string;
  justificativa: string;
}

/** Desafio como a equipe o vê (FR-002, FR-005, FR-015). */
export interface DesafioDaEquipe extends Desafio {
  /** Equipe ativa do aluno, ou `null` (não pode enviar). */
  duplaId: string | null;
  prazoEfetivo: string;
  encerrado: boolean;
  entregas: EntregaVersao[];
  avaliacao: AvaliacaoRegistrada | null;
}

// ---------------------------------------------------------------------------
// Questões
// ---------------------------------------------------------------------------
export interface AlternativaEditavel {
  texto: string;
  correta: boolean;
}

export interface QuestaoEditavel {
  enunciado: string;
  justificativa: string;
  capacidade: string;
  alternativas: AlternativaEditavel[];
}

export interface ListaQuestoes {
  id: string;
  edicaoId: string;
  encontroId: string;
  titulo: string;
  prazo: string;
  estado: EstadoAtividade;
  versao: number;
  turmas: string[];
  questoes: QuestaoEditavel[];
}

export type DadosLista = Pick<
  ListaQuestoes,
  'encontroId' | 'titulo' | 'prazo' | 'turmas' | 'questoes'
> & {
  id?: string;
};

export interface ListaResumo {
  id: string;
  encontroId: string;
  titulo: string;
  prazo: string;
  encerrada: boolean;
}

export interface QuestaoParaEquipe {
  id: string;
  enunciado: string;
  capacidade: string;
  alternativas: { id: string; texto: string }[];
  /** Só depois do prazo (FR-017). */
  gabarito?: string;
  justificativa?: string;
}

export interface SubmissaoDaEquipe {
  autorNome: string;
  enviadaEm: string;
  /** Só depois do prazo. */
  respostas?: Record<string, string>;
  acertos?: number;
  total?: number;
}

export interface ListaParaEquipe {
  id: string;
  titulo: string;
  prazo: string;
  encerrada: boolean;
  versao: number;
  questoes: QuestaoParaEquipe[];
  submissao: SubmissaoDaEquipe | null;
}

export interface AtividadesDaTurma {
  regras: RegrasDaEdicao;
  desafios: DesafioDaEquipe[];
  listas: ListaResumo[];
}

// ---------------------------------------------------------------------------
// Presença, participação e avaliação (gestão)
// ---------------------------------------------------------------------------
export interface AlunoDaPresenca {
  estudanteId: string;
  nome: string;
  duplaId: string | null;
  /** `null` = ainda não registrado. */
  presente: boolean | null;
  observacao: string | null;
}

export interface EquipeResumo {
  id: string;
  nome: string | null;
  integrantes: { estudanteId: string; nome: string }[];
}

export interface PresencaDaTurma {
  regras: RegrasDaEdicao;
  alunos: AlunoDaPresenca[];
  equipes: EquipeResumo[];
  participacoes: { duplaId: string; notas: Notas }[];
}

export interface RegistroDePresenca {
  estudanteId: string;
  presente: boolean;
  observacao?: string;
}

export interface EquipeParaAvaliar extends EquipeResumo {
  ultimaEntrega: EntregaVersao | null;
  versoes: EntregaVersao[];
  avaliacao: AvaliacaoRegistrada | null;
  prorrogacao: Prorrogacao | null;
}

export interface PainelAvaliacao {
  regras: RegrasDaEdicao;
  desafio: Desafio;
  equipes: EquipeParaAvaliar[];
}

export interface DadosAvaliacao {
  desafioId: string;
  duplaId: string;
  notasEntrega: Notas | null;
  notasApresentacao: Notas | null;
  apresentacaoNaoAvaliavel: boolean;
  feedback: string;
  justificativa?: string;
}

// ---------------------------------------------------------------------------
// Pontuação parcial (US5)
// ---------------------------------------------------------------------------
export interface AvaliacaoDoDesafio {
  desafioId: string;
  /** `null` = ainda não avaliado. */
  avaliacao: AvaliacaoRegistrada | null;
  temEntrega: boolean;
  atrasoMinutos: number;
  prorrogada: boolean;
}

export interface ListaDoEncontro {
  listaId: string;
  encerrada: boolean;
  acertos: number | null;
  total: number;
}

export interface EncontroDaEquipe {
  encontroId: string;
  numero: number;
  titulo: string;
  avaliacaoObjetiva: 'questoes' | 'prova_oficial';
  presencas: { estudanteId: string; presente: boolean }[];
  participacao: Notas | null;
  desafios: AvaliacaoDoDesafio[];
  listas: ListaDoEncontro[];
}

export interface LancamentosDaEquipe {
  regras: RegrasDaEdicao;
  equipe: EquipeResumo | null;
  encontros: EncontroDaEquipe[];
}

// ---------------------------------------------------------------------------
// Repositório
// ---------------------------------------------------------------------------
export interface RepositorioAtividades {
  desafiosDaGestao(edicaoId: string): Promise<Desafio[]>;
  salvarDesafio(dados: DadosDesafio): Promise<string>;
  publicarDesafio(id: string): Promise<void>;
  encerrarDesafio(id: string): Promise<void>;
  registrarProrrogacao(dados: {
    desafioId: string;
    duplaId: string;
    novoPrazo: string;
    justificativa: string;
  }): Promise<void>;

  atividadesDaTurma(turmaId: string): Promise<AtividadesDaTurma>;
  enviarEntrega(envio: EnvioDeEntrega): Promise<Comprovante>;
  urlArquivo(caminho: string): Promise<string>;

  presencasDaTurma(encontroId: string, turmaId: string): Promise<PresencaDaTurma>;
  registrarPresencas(dados: {
    encontroId: string;
    turmaId: string;
    registros: RegistroDePresenca[];
    justificativa?: string;
  }): Promise<void>;
  registrarParticipacao(dados: {
    encontroId: string;
    duplaId: string;
    notas: Notas;
    justificativa?: string;
  }): Promise<void>;

  painelAvaliacao(desafioId: string): Promise<PainelAvaliacao>;
  registrarAvaliacao(dados: DadosAvaliacao): Promise<void>;

  listasDaGestao(edicaoId: string): Promise<ListaQuestoes[]>;
  salvarLista(dados: DadosLista): Promise<string>;
  publicarLista(id: string): Promise<void>;
  encerrarLista(id: string): Promise<void>;
  listaParaEquipe(listaId: string): Promise<ListaParaEquipe>;
  enviarRespostas(dados: {
    listaId: string;
    chave: string;
    respostas: Record<string, string>;
  }): Promise<{ enviadaEm: string; autorNome: string }>;

  lancamentosDaMinhaEquipe(edicaoId: string): Promise<LancamentosDaEquipe>;
}
