import type { AjustesDaTurma } from './regrasTipos';
import type { RegrasDaEdicao } from './tipos';

/** Regras vigentes de uma turma: o grupo ajustado pela turma substitui o grupo inteiro (R2). */
export function combinarRegras(edicao: RegrasDaEdicao, ajustes: AjustesDaTurma): RegrasDaEdicao {
  return { ...edicao, ...ajustes };
}

const soma = (c: { maximo: number }[]) => c.reduce((t, x) => t + x.maximo, 0);

/**
 * Máximo de pontos de um encontro pelas regras dadas (spec 011, R7): a avaliação objetiva é a
 * lista de questões ou a prova oficial, conforme o encontro.
 */
export function pontuacaoMaximaDoEncontro(
  regras: RegrasDaEdicao,
  avaliacaoObjetiva: 'questoes' | 'prova_oficial',
): number {
  return (
    regras.presenca.maximoPorDupla +
    soma(regras.participacao.criterios) +
    (avaliacaoObjetiva === 'prova_oficial'
      ? regras.provaOficial.maximoPorDupla
      : regras.questoes.maximo) +
    soma(regras.entrega.criterios) +
    soma(regras.apresentacao.criterios)
  );
}
