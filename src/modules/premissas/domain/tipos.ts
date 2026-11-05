// Contratos das premissas em validação (spec 015, data-model.md e contracts/rpc.md). O autor das
// respostas chega só como nome, sem e-mail nem id de pessoa.

export type Decisao = 'confirmada' | 'precisa_mudar';
export type Situacao = 'aguardando' | Decisao;

/** Temas na ordem de exibição (spec 015, US1). */
export const TEMAS = [
  'Pontuação',
  'Equipes e atividades',
  'Acesso e edições',
  'Comunicados e relatórios',
  'Identidade visual',
  'Operação',
] as const;
export type Tema = (typeof TEMAS)[number];

export interface Resposta {
  id: string;
  decisao: Decisao;
  justificativa: string;
  autorNome: string;
  registradoEm: string;
}

export interface Premissa {
  codigo: string;
  tema: Tema;
  ordem: number;
  pergunta: string;
  premissaEmUso: string;
  ondeAfeta: string;
  opcoes: string[];
  referencia: string;
  /** Spec que resolveu a premissa (fora da lista de pendentes), ou `null`. */
  resolvidaPor: string | null;
  situacao: Situacao;
  atual: Resposta | null;
  /** Da mais antiga para a mais recente (inclui a atual). */
  historico: Resposta[];
}

export interface CatalogoDePremissas {
  /** Só a coordenação registra respostas; docentes e mentores leem. */
  podeResponder: boolean;
  premissas: Premissa[];
}

export interface EntradaResposta {
  codigo: string;
  decisao: Decisao;
  justificativa: string;
  /** Id da resposta atual quando a tela carregou (`null` se aguardando): concorrência (R4). */
  respostaBase: string | null;
}

export interface RepositorioPremissas {
  premissas(): Promise<CatalogoDePremissas>;
  responder(entrada: EntradaResposta): Promise<Resposta>;
}
