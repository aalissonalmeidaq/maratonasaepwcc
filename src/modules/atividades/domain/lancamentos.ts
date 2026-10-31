/**
 * Pontuação parcial de um encontro da equipe (US5, FR-021, FR-026). Converte os registros do
 * servidor nos lançamentos do cálculo oficial (`calcularEncontro`, casos de contrato) e aplica a
 * média simples quando o encontro tem vários desafios ou listas.
 */
import {
  arredondar,
  calcularEncontro,
  descontoPorAtraso,
  pontuarQuestoes,
  type CriterioRubrica,
  type LancamentosDoEncontro,
  type Notas,
  type PontuacaoDoEncontro,
  type RegrasDaEdicao,
} from '@/modules/pontuacao';
import type { AvaliacaoDoDesafio, EncontroDaEquipe } from './tipos';

export type ComponenteParcial =
  'presenca' | 'participacao' | 'avaliacaoObjetiva' | 'entrega' | 'apresentacao';

const zeros = (criterios: CriterioRubrica[]): Record<string, number> =>
  Object.fromEntries(criterios.map((c) => [c.id, 0]));

/** Média simples, critério a critério (a soma das médias é a média das somas). */
function mediaPorCriterio(lista: Notas[], criterios: CriterioRubrica[]): Notas {
  return Object.fromEntries(
    criterios.map((c) => [c.id, lista.reduce((t, n) => t + (n[c.id] ?? 0), 0) / lista.length]),
  );
}

/** Notas de entrega do desafio já com o desconto de atraso no critério das regras (FR-013). */
function entregaComDesconto(d: AvaliacaoDoDesafio, regras: RegrasDaEdicao): Notas {
  const notas = d.avaliacao?.notasEntrega;
  if (!d.temEntrega || !notas) return zeros(regras.entrega.criterios);
  const atraso = d.prorrogada
    ? { desconto: 0, naoRealizada: false }
    : descontoPorAtraso(d.atrasoMinutos, regras);
  if (atraso.naoRealizada) return zeros(regras.entrega.criterios);
  const criterio = regras.entrega.criterioDeAtraso;
  const nota = notas[criterio] ?? 0;
  return { ...notas, [criterio]: nota - Math.min(atraso.desconto, nota) };
}

export function calcularParcial(
  encontro: EncontroDaEquipe,
  regras: RegrasDaEdicao,
): { pontuacao: PontuacaoDoEncontro; aguardando: ComponenteParcial[] } {
  const aguardando: ComponenteParcial[] = [];
  if (encontro.presencas.length === 0) aguardando.push('presenca');
  if (!encontro.participacao) aguardando.push('participacao');

  // Questões: média das listas encerradas; lista sem submissão conta 0 (FR-020, FR-026).
  let objetiva: number | null = null;
  const listas = encontro.listas;
  if (
    encontro.avaliacaoObjetiva === 'questoes' &&
    listas.length > 0 &&
    listas.every((l) => l.encerrada)
  ) {
    const pontos = listas.map((l) =>
      l.acertos === null ? 0 : pontuarQuestoes(l.acertos, l.total, regras),
    );
    objetiva = arredondar(pontos.reduce((t, p) => t + p, 0) / pontos.length, regras.casasDecimais);
  } else {
    aguardando.push('avaliacaoObjetiva');
  }

  // Entrega e apresentação: média dos desafios, todos avaliados (FR-026).
  const desafios = encontro.desafios;
  const avaliados = desafios.length > 0 && desafios.every((d) => d.avaliacao !== null);
  let entrega: LancamentosDoEncontro['entrega'] = { situacao: 'pendente' };
  let apresentacao: LancamentosDoEncontro['apresentacao'] = { situacao: 'pendente' };
  if (avaliados) {
    entrega = desafios.every((d) => !d.temEntrega)
      ? { situacao: 'nao_entregue' }
      : {
          situacao: 'avaliada',
          notas: mediaPorCriterio(
            desafios.map((d) => entregaComDesconto(d, regras)),
            regras.entrega.criterios,
          ),
          atrasoMinutos: 0,
        };
    const naoAvaliavel = (d: AvaliacaoDoDesafio) =>
      d.avaliacao!.apresentacaoNaoAvaliavel || !d.avaliacao!.notasApresentacao;
    apresentacao = desafios.every(naoAvaliavel)
      ? { situacao: 'nao_avaliavel', justificativa: 'Apresentação não avaliável.' }
      : {
          situacao: 'avaliada',
          notas: mediaPorCriterio(
            desafios.map((d) =>
              naoAvaliavel(d)
                ? zeros(regras.apresentacao.criterios)
                : d.avaliacao!.notasApresentacao!,
            ),
            regras.apresentacao.criterios,
          ),
        };
  } else {
    aguardando.push('entrega', 'apresentacao');
  }

  const base = calcularEncontro(
    {
      presencas: encontro.presencas,
      participacao: encontro.participacao ?? undefined,
      entrega,
      apresentacao,
      penalidades: [],
    },
    regras,
  );
  if (objetiva === null) return { pontuacao: base, aguardando };

  const bruto = base.presenca + base.participacao + objetiva + base.entrega + base.apresentacao;
  return {
    pontuacao: {
      ...base,
      avaliacaoObjetiva: objetiva,
      total: arredondar(Math.max(0, bruto - base.descontos), regras.casasDecimais),
      pendencias: base.pendencias.filter((p) => p !== 'avaliacaoObjetiva'),
    },
    aguardando,
  };
}
