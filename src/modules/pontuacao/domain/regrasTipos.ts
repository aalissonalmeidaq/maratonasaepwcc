import type { RegrasDaEdicao } from './tipos';

/** Grupos de regras que a turma pode ajustar (spec 011, research R2). */
export type GrupoDeRegras =
  'presenca' | 'participacao' | 'questoes' | 'entrega' | 'apresentacao' | 'penalidades' | 'prazos';

/** Grupos de avaliação: os que o mentor do curso ajusta (spec 011, esclarecimento). */
export const GRUPOS_DO_MENTOR: readonly GrupoDeRegras[] = [
  'presenca',
  'participacao',
  'questoes',
  'entrega',
  'apresentacao',
];

export const GRUPOS_DA_COORDENACAO: readonly GrupoDeRegras[] = [
  ...GRUPOS_DO_MENTOR,
  'penalidades',
  'prazos',
];

export const ROTULO_DO_GRUPO: Record<GrupoDeRegras, string> = {
  presenca: 'Presença',
  participacao: 'Participação',
  questoes: 'Questões',
  entrega: 'Entrega e atrasos',
  apresentacao: 'Apresentação',
  penalidades: 'Penalidades',
  prazos: 'Prazos',
};

/** Só os grupos que a turma definiu para si; o resto vem da edição. */
export type AjustesDaTurma = Partial<Pick<RegrasDaEdicao, GrupoDeRegras>>;

/** Regras vigentes agora para uma turma, como devolvidas por `regras_da_turma`. */
export interface RegrasDaTurma {
  regras: RegrasDaEdicao;
  gruposAjustados: GrupoDeRegras[];
  ajusteId: string | null;
  versao: string;
  maximo: number;
  encontrosExcluidos: string[];
  /** Grupos que quem consulta pode ajustar (vazio = só leitura). */
  podeAjustar: GrupoDeRegras[];
  /** Só para a coordenação: encontros com lançamentos da turma, que não podem sair dela. */
  encontrosBloqueados?: EncontroBloqueado[];
}

export interface EncontroBloqueado {
  encontroId: string;
  motivo: string;
}

export interface RegrasDaEdicaoVigentes {
  regras: RegrasDaEdicao;
  rotulo: string;
  sugestao: string;
}

export interface ItemHistorico {
  tipo: 'edicao' | 'turma';
  rotulo: string | null;
  valeDesde: string | null;
  autor: string | null;
  papel: 'coordenacao' | 'mentor' | null;
  justificativa: string | null;
  grupos: GrupoDeRegras[];
}

export interface RepositorioRegras {
  regrasDaEdicaoVigentes(edicaoId: string): Promise<RegrasDaEdicaoVigentes>;
  regrasDaTurma(turmaId: string): Promise<RegrasDaTurma>;
  historico(edicaoId: string, turmaId: string | null): Promise<ItemHistorico[]>;
  gravarRegras(
    edicaoId: string,
    versaoBase: string,
    rotulo: string,
    regras: RegrasDaEdicao,
    justificativa: string,
  ): Promise<{ rotulo: string; valeDesde: string; nova: boolean }>;
  gravarAjustesTurma(
    turmaId: string,
    ajusteBase: string | null,
    grupos: AjustesDaTurma,
    justificativa: string,
  ): Promise<{ ajusteId: string; valeDesde: string; novo: boolean }>;
  definirEncontrosDaTurma(turmaId: string, excluidos: string[]): Promise<void>;
}
