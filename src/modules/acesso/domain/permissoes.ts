/** Papéis atribuídos por edição. Apoio e analista recebem só permissões explícitas. */
export type Papel = 'coordenacao' | 'docente' | 'mentor' | 'aluno' | 'apoio' | 'analista';

/** Funções da conta na sua unidade (spec 016). Estudantes não têm função de unidade. */
export type FuncaoUnidade = 'gestao' | 'coordenacao' | 'docente' | 'mentor' | 'analista';

export type Area = 'master' | 'gestao' | 'coordenacao' | 'docente' | 'analista' | 'aluno';

export type Destino = Area | 'aguardando-permissao' | 'unidade-desativada';

/** Áreas que dependem só do papel na edição (as de rede e de unidade vêm do acesso completo). */
const PAPEIS_POR_AREA: Partial<Record<Area, readonly Papel[]>> = {
  coordenacao: ['coordenacao'],
  docente: ['docente', 'mentor'],
  aluno: ['aluno'],
};

/** Ordem de prioridade quando a pessoa possui mais de uma área (spec 016, R8). */
const PRIORIDADE: readonly Area[] = [
  'master',
  'gestao',
  'coordenacao',
  'docente',
  'analista',
  'aluno',
];

/** O que a sessão sabe da conta: papéis nas edições, função na unidade, master e a unidade. */
export interface Acesso {
  papeis: readonly Papel[];
  master?: boolean;
  funcoes?: readonly FuncaoUnidade[];
  unidade?: { ativa: boolean } | null;
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  coordenacao: 'Coordenação',
  docente: 'Docente',
  mentor: 'Mentor SAEP',
  aluno: 'Aluno',
  apoio: 'Apoio técnico-administrativo',
  analista: 'Analista educacional',
};

export function papeisDaArea(area: Area): Papel[] {
  return [...(PAPEIS_POR_AREA[area] ?? [])];
}

/**
 * Regra de navegação. Não é barreira de segurança: o acesso aos dados é garantido por RLS
 * no Supabase (constituição, princípio V).
 */
export function podeAcessarArea(papeis: readonly Papel[], area: Area): boolean {
  return papeis.some((p) => PAPEIS_POR_AREA[area]?.includes(p));
}

/**
 * Áreas a que a conta tem direito, na ordem de prioridade. Conta de unidade desativada não abre
 * nenhuma (o servidor também recusa); o master não pertence a unidade. Navegação, não barreira.
 */
export function areasDoAcesso(a: Acesso): Area[] {
  if (a.master) return ['master'];
  if (a.unidade && !a.unidade.ativa) return [];
  const funcoes = a.funcoes ?? [];
  const tem: Record<Area, boolean> = {
    master: false,
    gestao: funcoes.includes('gestao'),
    coordenacao: podeAcessarArea(a.papeis, 'coordenacao'),
    docente: podeAcessarArea(a.papeis, 'docente'),
    analista: funcoes.includes('analista') || a.papeis.includes('analista'),
    aluno: podeAcessarArea(a.papeis, 'aluno'),
  };
  return PRIORIDADE.filter((area) => tem[area]);
}

export function areaInicialDoAcesso(a: Acesso): Destino {
  if (!a.master && a.unidade && !a.unidade.ativa) return 'unidade-desativada';
  return areasDoAcesso(a)[0] ?? 'aguardando-permissao';
}

export function podeAcessar(a: Acesso, area: Area): boolean {
  return areasDoAcesso(a).includes(area);
}

export function areaInicial(papeis: readonly Papel[]): Destino {
  return PRIORIDADE.find((area) => podeAcessarArea(papeis, area)) ?? 'aguardando-permissao';
}
