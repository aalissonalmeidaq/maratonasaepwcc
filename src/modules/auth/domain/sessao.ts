import type { Papel } from '@/modules/acesso';

export interface Sessao {
  usuarioId: string;
  nome: string;
  papeis: Papel[];
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
