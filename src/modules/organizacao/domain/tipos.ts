import type { Papel } from '@/modules/acesso';
import type { CursoDoCadastro, PessoaParaVincular } from './cadastro';
import type { EdicaoGerida, EntradaEdicao, PendenciasDaEdicao } from './edicoes';

export interface Edicao {
  id: string;
  nome: string;
  estado: 'rascunho' | 'ativa' | 'encerrada';
  inicio: string | null;
  fim: string | null;
  quantidadeEncontros: number;
  regrasVersao: string;
  /** JSON das regras gravadas na edição; lido sem presumir valores (spec 009, resumo do regulamento). */
  regras: unknown;
  /** Papéis ativos da pessoa nesta edição, para o seletor por área (spec 010). */
  meusPapeis?: Papel[];
}

export interface Curso {
  id: string;
  edicaoId: string;
  nome: string;
  categoria: string;
  /** Item do cadastro permanente de que este curso na edição é a participação (spec 010). */
  cadastroCursoId?: string;
}

export interface Turma {
  id: string;
  cursoId: string;
  nome: string;
  anoLetivo: number | null;
  /** Item do cadastro permanente de que esta turma na edição é a participação (spec 010). */
  cadastroTurmaId?: string;
}

export interface Vinculo {
  id: string;
  usuarioId: string;
  nome: string;
  papel: Papel;
  turmaId: string | null;
  /** Curso na edição do vínculo de mentor (spec 010); nulo para os outros papéis. */
  cursoId?: string | null;
  /** Vínculo de mentor por turma gerado a partir do vínculo ao curso; não se altera direto. */
  derivado?: boolean;
  ativo: boolean;
}

export interface NovaConta {
  edicaoId: string;
  nome: string;
  email: string;
  papel: Exclude<Papel, 'coordenacao'>;
  turmaId: string | null;
  /** Curso na edição, obrigatório para mentor (spec 010). */
  cursoId?: string | null;
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
  definirRegulamentoPublico(id: string, publico: boolean): Promise<{ regulamentoPublico: boolean }>;
  edicoes(): Promise<Edicao[]>;
  cursos(edicaoId: string): Promise<Curso[]>;
  /** Turmas visíveis para a pessoa atual (a RLS filtra no servidor). */
  turmas(edicaoId: string): Promise<Turma[]>;
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

  // Spec 010 — edições, cadastro permanente e vínculos (contracts/rpc.md).
  edicoesQueCoordeno(): Promise<EdicaoGerida[]>;
  criarEdicao(chave: string, e: EntradaEdicao, baseEdicaoId: string | null): Promise<string>;
  alterarEdicao(id: string, e: EntradaEdicao): Promise<void>;
  apagarEdicao(id: string): Promise<void>;
  ativarEdicao(id: string): Promise<{ ativadaEm: string }>;
  pendenciasDaEdicao(id: string): Promise<PendenciasDaEdicao>;
  encerrarEdicao(
    id: string,
    justificativa: string,
  ): Promise<{ encerradaEm: string; pendencias: PendenciasDaEdicao }>;
  cadastro(): Promise<CursoDoCadastro[]>;
  salvarCursoDoCadastro(id: string | null, nome: string, categoria: string): Promise<string>;
  salvarTurmaDoCadastro(
    id: string | null,
    cursoId: string,
    nome: string,
    anoLetivo: number | null,
  ): Promise<string>;
  apagarDoCadastro(tipo: 'curso' | 'turma', id: string): Promise<void>;
  atualizarDoCadastro(edicaoId: string): Promise<{ cursos: number; turmas: number }>;
  vincularTurmas(
    edicaoId: string,
    cadastroTurmaIds: string[],
  ): Promise<{ turmaId: string; cadastroTurmaId: string }[]>;
  desvincularTurma(turmaId: string): Promise<void>;
  pessoasParaVincular(edicaoId: string, busca: string): Promise<PessoaParaVincular[]>;
  vincularMentorAoCurso(cursoId: string, usuarioId: string): Promise<void>;
  desvincularMentorDoCurso(cursoId: string, usuarioId: string): Promise<void>;
  atribuirCoordenacao(edicaoId: string, usuarioId: string): Promise<void>;
  desativarCoordenacao(edicaoId: string, usuarioId: string): Promise<void>;
}
