export interface IntegranteAtual {
  estudanteId: string;
  nome: string;
  /** Leitura de gestão: vínculo de aluno inativo na turma (FR-011). */
  integranteInativo?: boolean;
}

/** Equipe (dupla ou trio). `nome` é nulo até a própria equipe escolher (FR-008). */
export interface Dupla {
  id: string;
  nome: string | null;
  turmaId: string;
  ativa: boolean;
  integrantes: IntegranteAtual[];
}
export type Equipe = Dupla;

/** Equipe como a gestão a enxerga, com avisos calculados no servidor (FR-011/013). */
export interface EquipeGestao extends Dupla {
  trioEmTurmaPar: boolean;
}

export interface RegistroHistorico {
  estudanteId: string;
  nome: string;
  entradaEm: string;
  saidaEm: string | null;
  motivo: string | null;
}

/** Colega da própria turma, como o aluno o enxerga (FR-005). */
export interface Colega {
  id: string;
  nome: string;
  temEquipe: boolean;
}

export type TipoConvite = 'dupla' | 'trio';
export type SituacaoConvite = 'pendente' | 'formado' | 'recusado' | 'cancelado';
export type RespostaConvite = 'pendente' | 'aceito' | 'recusado';

export interface ConviteEquipe {
  id: string;
  tipo: TipoConvite;
  situacao: SituacaoConvite;
  motivo: string | null;
  remetenteId: string;
  remetenteNome: string;
  convidados: { id: string; nome: string; resposta: RespostaConvite }[];
  criadoEm: string;
  encerradoEm: string | null;
  souRemetente: boolean;
}

export interface RepositorioDuplas {
  /** Equipes visíveis para a pessoa atual (a RLS filtra no servidor). */
  duplas(edicaoId: string): Promise<Dupla[]>;
  historico(duplaId: string): Promise<RegistroHistorico[]>;
  colegas(turmaId: string): Promise<Colega[]>;
  convites(edicaoId: string): Promise<ConviteEquipe[]>;
  enviarConvite(dados: { turmaId: string; convidados: string[] }): Promise<void>;
  responderConvite(dados: { conviteId: string; aceitar: boolean }): Promise<void>;
  cancelarConvite(conviteId: string): Promise<void>;
  retirarAceite(conviteId: string): Promise<void>;
  /** Turma ímpar e sem trio ativo: aceita convite de trio (US2). */
  permiteTrio(turmaId: string): Promise<boolean>;
  substituir(dados: {
    duplaId: string;
    sai: string;
    entra: string;
    justificativa: string;
  }): Promise<void>;
  desfazer(dados: { duplaId: string; justificativa: string }): Promise<void>;
  incluir(dados: { duplaId: string; estudante: string; justificativa: string }): Promise<void>;
  remover(dados: { duplaId: string; estudante: string; justificativa: string }): Promise<void>;
  /** FR-010: docente/mentor da turma forma equipe com alunos que sobraram. */
  formarPorDocente(dados: {
    turmaId: string;
    estudantes: string[];
    justificativa: string;
  }): Promise<void>;
  equipesGestao(turmaId: string): Promise<EquipeGestao[]>;
  /** Primeiro nome, escolhido uma vez por um integrante (FR-008). */
  definirNome(dados: { duplaId: string; nome: string }): Promise<void>;
  renomear(dados: { duplaId: string; nome: string; justificativa: string }): Promise<void>;
}
