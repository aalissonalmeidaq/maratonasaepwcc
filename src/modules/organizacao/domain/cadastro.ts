import type { EstadoEdicao } from './edicoes';

/** Turma do cadastro permanente, com as edições de que participa (spec 010). */
export interface TurmaDoCadastro {
  id: string;
  nome: string;
  anoLetivo: number | null;
  edicoes: { id: string; nome: string; estado: EstadoEdicao }[];
}

export interface CursoDoCadastro {
  id: string;
  nome: string;
  categoria: string;
  turmas: TurmaDoCadastro[];
}

/** Conta encontrada pela busca de pessoas para vincular; nunca traz e-mail. */
export interface PessoaParaVincular {
  usuarioId: string;
  nome: string;
}

type EntradaCurso = { nome: string; categoria: string };
type EntradaTurma = { nome: string; anoLetivo: number | null };

export function validarItemDoCadastro(
  tipo: 'curso',
  e: EntradaCurso,
): Partial<Record<keyof EntradaCurso, string>>;
export function validarItemDoCadastro(
  tipo: 'turma',
  e: EntradaTurma,
): Partial<Record<keyof EntradaTurma, string>>;
/** Mesmos limites do banco (data-model.md). */
export function validarItemDoCadastro(
  tipo: 'curso' | 'turma',
  e: EntradaCurso | EntradaTurma,
): Record<string, string> {
  const erros: Record<string, string> = {};
  const nome = e.nome.trim();
  if (tipo === 'curso') {
    const { categoria } = e as EntradaCurso;
    if (nome.length < 2 || nome.length > 160) erros.nome = 'Informe um nome de 2 a 160 caracteres.';
    const cat = categoria.trim();
    if (cat.length < 1 || cat.length > 120)
      erros.categoria = 'Informe uma categoria de 1 a 120 caracteres.';
  } else {
    const { anoLetivo } = e as EntradaTurma;
    if (nome.length < 1 || nome.length > 120) erros.nome = 'Informe um nome de 1 a 120 caracteres.';
    if (anoLetivo !== null && (anoLetivo < 2000 || anoLetivo > 2100))
      erros.anoLetivo = 'Ano letivo entre 2000 e 2100.';
  }
  return erros;
}
