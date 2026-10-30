import type { Papel } from '@/modules/acesso';

export interface Edicao {
  id: string;
  nome: string;
  estado: 'rascunho' | 'ativa' | 'encerrada';
  quantidadeEncontros: number;
  regrasVersao: string;
}

export interface Curso {
  id: string;
  edicaoId: string;
  nome: string;
  categoria: string;
}

export interface Turma {
  id: string;
  cursoId: string;
  nome: string;
  anoLetivo: number | null;
}

export interface Vinculo {
  id: string;
  usuarioId: string;
  nome: string;
  papel: Papel;
  turmaId: string | null;
  ativo: boolean;
}

export interface NovaConta {
  edicaoId: string;
  nome: string;
  email: string;
  papel: Exclude<Papel, 'coordenacao'>;
  turmaId: string | null;
}

/** Situação do primeiro acesso de uma conta (visível só para a coordenação). */
export interface SituacaoDeAcesso {
  usuarioId: string;
  email: string;
  acessoAtivo: boolean;
  /** Vencimento do convite pendente; nulo quando o acesso já está ativo. */
  conviteExpiraEm: string | null;
}

/** Relatório da importação por CSV devolvido pelo servidor (FR-015). */
export interface ResultadoDaImportacao {
  criadas: { linha: number; email: string; conviteEnviado: boolean }[];
  vinculadas: { linha: number; email: string }[];
  recusadas: { linha: number; email: string; motivo: string }[];
}

export interface Pessoa {
  id: string;
  nome: string;
}

export interface RepositorioOrganizacao {
  edicoes(): Promise<Edicao[]>;
  cursos(edicaoId: string): Promise<Curso[]>;
  /** Turmas visíveis para a pessoa atual (a RLS filtra no servidor). */
  turmas(edicaoId: string): Promise<Turma[]>;
  salvarCurso(dados: Omit<Curso, 'id'> & { id?: string }): Promise<void>;
  removerCurso(id: string): Promise<void>;
  salvarTurma(dados: Omit<Turma, 'id'> & { id?: string }): Promise<void>;
  removerTurma(id: string): Promise<void>;
  vinculos(edicaoId: string): Promise<Vinculo[]>;
  pessoas(): Promise<Pessoa[]>;
  vincular(dados: {
    usuarioId: string;
    edicaoId: string;
    papel: Papel;
    turmaId: string | null;
  }): Promise<void>;
  definirVinculoAtivo(id: string, ativo: boolean): Promise<void>;
  /** Cria a conta pela Edge Function `criar-conta` (a chave privada fica só no servidor). */
  /** Conta sem senha; `conviteEnviado` informa se o e-mail de primeiro acesso saiu. */
  criarConta(dados: NovaConta): Promise<{ conviteEnviado: boolean }>;
  situacaoDeAcesso(edicaoId: string): Promise<SituacaoDeAcesso[]>;
  importarAlunos(dados: {
    edicaoId: string;
    turmaId: string;
    linhas: { linha: number; nome: string; email: string }[];
  }): Promise<ResultadoDaImportacao>;
  /** Revoga o convite anterior e envia outro; `novoEmail` corrige o e-mail antes. */
  reenviarConvite(dados: {
    edicaoId: string;
    usuarioId: string;
    novoEmail?: string;
  }): Promise<{ conviteEnviado: boolean }>;
}

/** Escolhe a edição em uso: ativa, depois rascunho, depois a mais recente encerrada. */
export function edicaoAtual(edicoes: Edicao[]): Edicao | null {
  const ordem = { ativa: 0, rascunho: 1, encerrada: 2 } as const;
  return [...edicoes].sort((a, b) => ordem[a.estado] - ordem[b.estado])[0] ?? null;
}
