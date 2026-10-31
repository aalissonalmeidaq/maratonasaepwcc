import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO, calcularEncontro } from '@/modules/pontuacao';
import { calcularParcial } from './lancamentos';
import type { AvaliacaoDoDesafio, EncontroDaEquipe } from './tipos';

const avaliado = (
  entrega: Record<string, number> | null,
  apresentacao: Record<string, number> | null,
  extra: Partial<AvaliacaoDoDesafio> = {},
): AvaliacaoDoDesafio => ({
  desafioId: Math.random().toString(),
  temEntrega: entrega !== null,
  atrasoMinutos: 0,
  prorrogada: false,
  avaliacao: {
    notasEntrega: entrega,
    notasApresentacao: apresentacao,
    apresentacaoNaoAvaliavel: apresentacao === null,
    feedback: null,
    registradoEm: '2026-11-05T20:00:00Z',
  },
  ...extra,
});

const n = (a: number, b: number, c: number, d: number) => ({
  compreensao: a,
  aplicacao: b,
  qualidade: c,
  organizacao: d,
});
const ap = (a: number, b: number, c: number) => ({ clareza: a, explicacao: b, respostas: c });

const base: EncontroDaEquipe = {
  encontroId: 'en1',
  numero: 1,
  titulo: 'Encontro 1',
  avaliacaoObjetiva: 'questoes',
  presencas: [
    { estudanteId: 'a', presente: true },
    { estudanteId: 'b', presente: true },
  ],
  participacao: { envolvimento: 4, colaboracao: 3, organizacao: 3 },
  desafios: [avaliado(n(9, 8, 8, 9), ap(3, 3, 3), { atrasoMinutos: 10 })],
  listas: [{ listaId: 'l1', encerrada: true, acertos: 10, total: 12 }],
};

describe('calcularParcial — um item por componente bate com o contrato (SC-006)', () => {
  it('mesmo resultado de calcularEncontro com os lançamentos equivalentes', () => {
    const contrato = calcularEncontro(
      {
        presencas: base.presencas,
        participacao: base.participacao!,
        avaliacaoObjetiva: { tipo: 'questoes', acertos: 10, total: 12 },
        entrega: { situacao: 'avaliada', notas: n(9, 8, 8, 9), atrasoMinutos: 10 },
        apresentacao: { situacao: 'avaliada', notas: ap(3, 3, 3) },
        penalidades: [],
      },
      REGRAS_PILOTO,
    );
    const { pontuacao, aguardando } = calcularParcial(base, REGRAS_PILOTO);
    expect(pontuacao).toEqual(contrato);
    expect(aguardando).toEqual([]);
  });

  it('prorrogação: sem desconto de atraso', () => {
    const { pontuacao } = calcularParcial(
      {
        ...base,
        desafios: [avaliado(n(9, 8, 8, 9), ap(3, 3, 3), { atrasoMinutos: 10, prorrogada: true })],
      },
      REGRAS_PILOTO,
    );
    expect(pontuacao.entrega).toBe(34);
  });
});

describe('calcularParcial — média de vários itens no encontro (FR-026)', () => {
  it('entrega: média dos desafios, com o desconto de atraso aplicado em cada um antes da média', () => {
    const { pontuacao } = calcularParcial(
      {
        ...base,
        desafios: [
          avaliado(n(8, 8, 7, 7), ap(3, 3, 3)), // 30
          avaliado(n(5, 5, 5, 7), ap(1, 1, 1), { atrasoMinutos: 20 }), // 22 − 5 = 17
        ],
      },
      REGRAS_PILOTO,
    );
    expect(pontuacao.entrega).toBe(23.5);
    expect(pontuacao.apresentacao).toBe(6);
  });

  it('desafio avaliado sem entrega conta 0 na média', () => {
    const { pontuacao } = calcularParcial(
      { ...base, desafios: [avaliado(n(8, 8, 7, 7), ap(3, 4, 3)), avaliado(null, null)] },
      REGRAS_PILOTO,
    );
    expect(pontuacao.entrega).toBe(15);
    expect(pontuacao.apresentacao).toBe(5);
  });

  it('questões: média das listas encerradas; lista sem submissão conta 0', () => {
    const duas = calcularParcial(
      {
        ...base,
        listas: [
          { listaId: 'l1', encerrada: true, acertos: 10, total: 10 },
          { listaId: 'l2', encerrada: true, acertos: 5, total: 10 },
        ],
      },
      REGRAS_PILOTO,
    );
    expect(duas.pontuacao.avaliacaoObjetiva).toBe(22.5);
    const semEnvio = calcularParcial(
      {
        ...base,
        listas: [
          { listaId: 'l1', encerrada: true, acertos: 10, total: 10 },
          { listaId: 'l2', encerrada: true, acertos: null, total: 10 },
        ],
      },
      REGRAS_PILOTO,
    );
    expect(semEnvio.pontuacao.avaliacaoObjetiva).toBe(15);
  });
});

describe('calcularParcial — "aguardando registro" (FR-021)', () => {
  it('qualquer item pendente deixa o componente aguardando', () => {
    const { aguardando } = calcularParcial(
      {
        ...base,
        presencas: [],
        participacao: null,
        desafios: [
          avaliado(n(8, 8, 7, 7), ap(3, 3, 3)),
          { ...avaliado(null, null), avaliacao: null },
        ],
        listas: [
          { listaId: 'l1', encerrada: true, acertos: 10, total: 10 },
          { listaId: 'l2', encerrada: false, acertos: null, total: 10 },
        ],
      },
      REGRAS_PILOTO,
    );
    expect(aguardando).toEqual([
      'presenca',
      'participacao',
      'avaliacaoObjetiva',
      'entrega',
      'apresentacao',
    ]);
  });

  it('sem desafio ou lista publicados, o componente aguarda; prova oficial fica para o Incremento 4', () => {
    const { aguardando } = calcularParcial(
      { ...base, avaliacaoObjetiva: 'prova_oficial', desafios: [], listas: [] },
      REGRAS_PILOTO,
    );
    expect(aguardando).toEqual(['avaliacaoObjetiva', 'entrega', 'apresentacao']);
  });
});
