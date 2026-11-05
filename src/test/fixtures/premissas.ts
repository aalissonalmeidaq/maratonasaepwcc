import type { Premissa, Resposta } from '@/modules/premissas';

/** Resposta fictícia para os testes da spec 015. */
export function resposta(parcial: Partial<Resposta> = {}): Resposta {
  return {
    id: 'r1',
    decisao: 'confirmada',
    justificativa: 'Conferido com o regulamento da unidade.',
    autorNome: 'Coordenação Teste',
    registradoEm: '2026-11-05T13:30:00.000Z',
    ...parcial,
  };
}

/** Premissa fictícia; `historico` define a situação e a resposta atual. */
export function premissa(parcial: Partial<Premissa> & { historico?: Resposta[] } = {}): Premissa {
  const historico = parcial.historico ?? [];
  const atual = historico.at(-1) ?? null;
  return {
    codigo: 'P09',
    tema: 'Pontuação',
    ordem: 1,
    pergunta: 'Como as notas fracionárias devem ser arredondadas?',
    premissaEmUso: 'Duas casas decimais, meio para cima.',
    ondeAfeta: 'Cálculo de todos os componentes.',
    opcoes: [],
    referencia: 'docs/decisoes-e-pendencias.md §3',
    resolvidaPor: null,
    situacao: atual?.decisao ?? 'aguardando',
    atual,
    ...parcial,
    historico,
  };
}
