// Validação do pedido de criação de conta (Edge Function `criar-conta`). Sem dependências do
// runtime: testável no Vitest. Mentor é vinculado ao curso na edição (spec 010, FR-008).

export const PAPEIS = ['aluno', 'docente', 'mentor', 'apoio', 'analista'] as const;
const EXIGE_TURMA = ['aluno', 'docente'];

export interface PedidoDeConta {
  edicaoId: string;
  nome: string;
  email: string;
  papel: (typeof PAPEIS)[number];
  turmaId: string | null;
  cursoId: string | null;
}

export function validarPedidoDeConta(corpo: unknown): PedidoDeConta | string {
  if (typeof corpo !== 'object' || corpo === null) return 'Corpo da requisição inválido.';
  const c = corpo as Record<string, unknown>;
  if ('senhaProvisoria' in c) return 'Campo não aceito: senhaProvisoria.';
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const pedido: PedidoDeConta = {
    edicaoId: texto(c.edicaoId),
    nome: texto(c.nome),
    email: texto(c.email).toLowerCase(),
    papel: texto(c.papel) as PedidoDeConta['papel'],
    turmaId: texto(c.turmaId) || null,
    cursoId: texto(c.cursoId) || null,
  };
  if (!/^[0-9a-f-]{36}$/i.test(pedido.edicaoId)) return 'Edição inválida.';
  if (pedido.nome.length < 2 || pedido.nome.length > 160)
    return 'Informe o nome (2 a 160 caracteres).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pedido.email)) return 'Informe um e-mail válido.';
  if (!PAPEIS.includes(pedido.papel)) return 'Papel inválido.';
  if (pedido.papel === 'mentor') {
    if (pedido.turmaId) return 'Mentor é vinculado ao curso, não à turma.';
    if (!pedido.cursoId) return 'Selecione o curso do mentor.';
  } else {
    pedido.cursoId = null;
    if (EXIGE_TURMA.includes(pedido.papel) && !pedido.turmaId) return 'Selecione a turma.';
    if (!EXIGE_TURMA.includes(pedido.papel)) pedido.turmaId = null;
  }
  return pedido;
}

/** Linha gravada em `atribuicoes` pela coordenação (RLS e auditoria valem). */
export function linhaDeAtribuicao(p: PedidoDeConta, usuarioId: string) {
  return {
    usuario_id: usuarioId,
    edicao_id: p.edicaoId,
    papel: p.papel,
    turma_id: p.papel === 'mentor' ? null : p.turmaId,
    curso_id: p.papel === 'mentor' ? p.cursoId : null,
  };
}
