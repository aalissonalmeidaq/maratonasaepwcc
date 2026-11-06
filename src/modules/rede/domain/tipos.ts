// Contratos da rede (spec 016, data-model.md e contracts/rpc.md). Master e gestão não leem dados
// de estudantes; o e-mail só aparece para quem gere as contas.

export type SituacaoDoAcesso = 'ativo' | 'aguardando';

export interface ContaDeGestao {
  usuarioId: string;
  nome: string;
  email: string;
  situacaoAcesso: SituacaoDoAcesso;
  /** Função de gestão ativa. */
  ativa: boolean;
}

export interface Unidade {
  id: string;
  nome: string;
  ativa: boolean;
  desativadaEm: string | null;
  justificativaDesativacao: string | null;
  gestao: ContaDeGestao[];
}

export interface MasterDaRede {
  usuarioId: string;
  nome: string;
  email: string;
  situacaoAcesso: SituacaoDoAcesso;
  ativo: boolean;
}

export type FuncaoDaEquipe = 'coordenacao' | 'docente' | 'mentor' | 'analista';
export type FuncaoDaConta = FuncaoDaEquipe | 'gestao';

export const FUNCOES_DA_EQUIPE: readonly FuncaoDaEquipe[] = [
  'coordenacao',
  'docente',
  'mentor',
  'analista',
];

export const ROTULO_FUNCAO: Record<FuncaoDaConta, string> = {
  gestao: 'Gestão',
  coordenacao: 'Coordenação',
  docente: 'Docente',
  mentor: 'Mentor SAEP',
  analista: 'Analista',
};

/** Conta com função na unidade (sem estudantes). */
export interface MembroDaUnidade {
  usuarioId: string;
  nome: string;
  email: string;
  /** Funções ativas. */
  funcoes: FuncaoDaConta[];
  situacaoAcesso: SituacaoDoAcesso;
  ativo: boolean;
}

export type EstadoDaEdicao = 'rascunho' | 'ativa' | 'encerrada';

export interface CoordenacaoDaEdicao {
  usuarioId: string;
  nome: string;
  ativa: boolean;
}

/** Edição da unidade, sem dados de estudantes. */
export interface EdicaoDaUnidade {
  id: string;
  nome: string;
  inicio: string | null;
  fim: string | null;
  estado: EstadoDaEdicao;
  coordenacao: CoordenacaoDaEdicao[];
}

export interface DadosParaCriarEdicao {
  chave: string;
  nome: string;
  inicio: string | null;
  fim: string | null;
  coordenacaoId: string;
}

/** Pedido à Edge Function `contas-da-rede`. */
export type PedidoDeContaDaRede =
  | { acao: 'master'; nome: string; email: string }
  | { acao: 'gestao'; nome: string; email: string; unidadeId: string }
  | { acao: 'equipe'; nome: string; email: string; funcoes: FuncaoDaEquipe[] };

export interface ResultadoDaConta {
  usuarioId: string;
  /** `false`: a conta foi criada, mas o e-mail do convite não saiu; dá para reenviar. */
  conviteEnviado: boolean;
}

export interface RepositorioRede {
  unidades(): Promise<Unidade[]>;
  masters(): Promise<MasterDaRede[]>;
  cadastrarUnidade(chave: string, nome: string): Promise<string>;
  renomearUnidade(id: string, nome: string): Promise<void>;
  definirSituacaoUnidade(id: string, ativa: boolean, justificativa: string | null): Promise<void>;
  definirGestao(usuarioId: string, ativa: boolean, justificativa: string | null): Promise<void>;
  definirMaster(usuarioId: string, ativo: boolean, justificativa: string | null): Promise<void>;
  criarConta(pedido: PedidoDeContaDaRede): Promise<ResultadoDaConta>;
  reenviarConvite(
    usuarioId: string,
    novoEmail?: string | null,
  ): Promise<{ conviteEnviado: boolean }>;
  // Gestão da unidade (US2)
  equipe(): Promise<MembroDaUnidade[]>;
  definirFuncoes(
    usuarioId: string,
    funcoes: FuncaoDaEquipe[],
    justificativa: string,
  ): Promise<void>;
  desativarMembro(usuarioId: string, justificativa: string): Promise<void>;
  reativarMembro(usuarioId: string): Promise<void>;
  edicoes(): Promise<EdicaoDaUnidade[]>;
  criarEdicao(dados: DadosParaCriarEdicao): Promise<string>;
  definirCoordenacao(
    edicaoId: string,
    usuarioId: string,
    ativa: boolean,
    justificativa: string | null,
  ): Promise<void>;
}
