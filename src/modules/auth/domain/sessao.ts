import type { FuncaoUnidade, Papel } from '@/modules/acesso';

export interface Sessao {
  usuarioId: string;
  nome: string;
  papeis: Papel[];
  /** Spec 016: conta master (da rede, sem unidade). Ausente = não é master. */
  master?: boolean;
  /** Spec 016: funções da conta na unidade. */
  funcoes?: FuncaoUnidade[];
  /** Spec 016: unidade da conta (`null` para o master). */
  unidade?: { id: string; nome: string; ativa: boolean } | null;
  /** Sessão do modo demonstração: sem servidor, sem segurança real. */
  demo: boolean;
}

export interface Credenciais {
  email: string;
  senha: string;
}

export interface AdaptadorAuth {
  sessaoAtual(): Promise<Sessao | null>;
  entrar(credenciais: Credenciais): Promise<Sessao>;
  sair(): Promise<void>;
  aoMudar(callback: (sessao: Sessao | null) => void): () => void;
}

export class ErroDeAutenticacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeAutenticacao';
  }
}
