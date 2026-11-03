import type { ComunicadoRecebido, PapelAutor, PublicoComunicado } from '../domain/tipos';

export const PAPEL_DO_AUTOR: Record<PapelAutor, string> = {
  coordenacao: 'coordenação',
  docente: 'docente',
  mentor: 'mentor',
};

const PUBLICO: Record<PublicoComunicado, string> = {
  estudantes: 'Estudantes',
  equipe_docente: 'Equipe docente',
  todos: 'Todos',
};

/** "Estudantes — 3º ano A" ou "Todos — edição inteira". */
export function descreverPublico(c: Pick<ComunicadoRecebido, 'publico' | 'turmas'>): string {
  const turmas = c.turmas.length ? c.turmas.map((t) => t.nome).join(', ') : 'edição inteira';
  return `${PUBLICO[c.publico]} — ${turmas}`;
}
