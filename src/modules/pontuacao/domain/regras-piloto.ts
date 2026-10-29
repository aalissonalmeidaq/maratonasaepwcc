import type { RegrasDaEdicao } from './tipos';

/**
 * Regras da edição piloto conforme o PRD v1.0 e as instruções do usuário (2026-10-29).
 * PENDENTE: confirmar contra o regulamento/projeto pedagógico aprovado, que não foi fornecido.
 * No banco, cada edição guarda a própria cópia em `edicoes.regras` com `regras_versao`.
 */
export const REGRAS_PILOTO: RegrasDaEdicao = {
  versao: 'piloto-2026.0-a-confirmar',
  quantidadeEncontros: 4,
  casasDecimais: 2,
  presenca: { pontosPorIntegrante: 5, maximoPorDupla: 10 },
  participacao: {
    criterios: [
      { id: 'envolvimento', rotulo: 'Envolvimento nas atividades', maximo: 4 },
      { id: 'colaboracao', rotulo: 'Colaboração', maximo: 3 },
      { id: 'organizacao', rotulo: 'Organização e cumprimento das orientações', maximo: 3 },
    ],
  },
  questoes: { maximo: 30 },
  entrega: {
    criterios: [
      { id: 'compreensao', rotulo: 'Compreensão do problema', maximo: 10 },
      { id: 'aplicacao', rotulo: 'Aplicação de conhecimentos técnicos', maximo: 10 },
      { id: 'qualidade', rotulo: 'Qualidade e adequação da solução', maximo: 10 },
      { id: 'organizacao', rotulo: 'Organização e entrega', maximo: 10 },
    ],
    criterioDeAtraso: 'organizacao',
    faixasDeAtraso: [
      { ateMinutos: 15, desconto: 2 },
      { ateMinutos: 30, desconto: 5 },
    ],
    limiteAtrasoMinutos: 30,
  },
  apresentacao: {
    criterios: [
      { id: 'clareza', rotulo: 'Clareza', maximo: 3 },
      { id: 'explicacao', rotulo: 'Explicação das decisões e etapas', maximo: 4 },
      { id: 'respostas', rotulo: 'Respostas às perguntas', maximo: 3 },
    ],
  },
  provaOficial: { pontosRealizacao: 5, notaMinimaBonus: 70, pontosBonus: 10, maximoPorDupla: 30 },
  penalidades: { tetoDescontosPorEncontro: 10 },
};

/** Máximo de pontos por encontro derivado das regras (piloto: 100). */
export function maximoPorEncontro(regras: RegrasDaEdicao): number {
  const soma = (c: { maximo: number }[]) => c.reduce((t, x) => t + x.maximo, 0);
  return (
    regras.presenca.maximoPorDupla +
    soma(regras.participacao.criterios) +
    regras.questoes.maximo +
    soma(regras.entrega.criterios) +
    soma(regras.apresentacao.criterios)
  );
}

/** Máximo acumulado da edição (piloto: 4 × 100 = 400). */
export function maximoDaEdicao(regras: RegrasDaEdicao): number {
  return maximoPorEncontro(regras) * regras.quantidadeEncontros;
}
