/** Papéis atribuídos por edição. Apoio e analista recebem só permissões explícitas. */
export type Papel = 'coordenacao' | 'docente' | 'mentor' | 'aluno' | 'apoio' | 'analista';

export type Area = 'coordenacao' | 'docente' | 'aluno';

export type Destino = Area | 'aguardando-permissao';

const PAPEIS_POR_AREA: Record<Area, readonly Papel[]> = {
  coordenacao: ['coordenacao'],
  docente: ['docente', 'mentor'],
  aluno: ['aluno'],
};

/** Ordem de prioridade quando a pessoa possui mais de um papel. */
const PRIORIDADE: readonly Area[] = ['coordenacao', 'docente', 'aluno'];

export const ROTULO_PAPEL: Record<Papel, string> = {
  coordenacao: 'Coordenação',
  docente: 'Docente',
  mentor: 'Mentor SAEP',
  aluno: 'Aluno',
  apoio: 'Apoio técnico-administrativo',
  analista: 'Analista educacional',
};

export function papeisDaArea(area: Area): Papel[] {
  return [...PAPEIS_POR_AREA[area]];
}

/**
 * Regra de navegação. Não é barreira de segurança: o acesso aos dados é garantido por RLS
 * no Supabase (constituição, princípio V).
 */
export function podeAcessarArea(papeis: readonly Papel[], area: Area): boolean {
  return papeis.some((p) => PAPEIS_POR_AREA[area].includes(p));
}

export function areaInicial(papeis: readonly Papel[]): Destino {
  return PRIORIDADE.find((area) => podeAcessarArea(papeis, area)) ?? 'aguardando-permissao';
}
