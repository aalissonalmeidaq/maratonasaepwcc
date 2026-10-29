export interface IntegranteAtual {
  estudanteId: string;
  nome: string;
}

export interface Dupla {
  id: string;
  nome: string;
  turmaId: string;
  ativa: boolean;
  integrantes: IntegranteAtual[];
}

export interface RegistroHistorico {
  estudanteId: string;
  nome: string;
  entradaEm: string;
  saidaEm: string | null;
  motivo: string | null;
}

export interface RepositorioDuplas {
  /** Duplas visíveis para a pessoa atual (a RLS filtra no servidor). */
  duplas(edicaoId: string): Promise<Dupla[]>;
  historico(duplaId: string): Promise<RegistroHistorico[]>;
  formar(dados: { turmaId: string; nome: string; integrantes: string[] }): Promise<void>;
  substituir(dados: {
    duplaId: string;
    sai: string;
    entra: string;
    justificativa: string;
  }): Promise<void>;
  desfazer(dados: { duplaId: string; justificativa: string }): Promise<void>;
}
