import { describe, expect, it } from 'vitest';
import { acumularEncontros, classificar } from './ranking';
import type { PontuacaoDoEncontro } from './tipos';

const enc = (p: Partial<PontuacaoDoEncontro>): PontuacaoDoEncontro => ({
  presenca: 0,
  participacao: 0,
  avaliacaoObjetiva: 0,
  entrega: 0,
  apresentacao: 0,
  descontos: 0,
  total: 0,
  pendencias: [],
  ...p,
});

describe('acumular encontros', () => {
  it('soma totais e componentes usados no desempate', () => {
    const t = acumularEncontros([
      enc({ presenca: 10, avaliacaoObjetiva: 21, entrega: 30, total: 61 }),
      enc({ presenca: 5, avaliacaoObjetiva: 4.29, entrega: 40, total: 49.29 }),
    ]);
    expect(t).toEqual({
      total: 110.29,
      entrega: 70,
      avaliacaoObjetiva: 25.29,
      presenca: 15,
      pendente: false,
    });
  });

  it('marca como pendente quando algum encontro tem pendência', () => {
    expect(acumularEncontros([enc({ pendencias: ['entrega'] })]).pendente).toBe(true);
  });
});

const dupla = (
  duplaId: string,
  total: number,
  entrega = 0,
  avaliacaoObjetiva = 0,
  presenca = 0,
) => ({
  duplaId,
  nome: duplaId,
  totais: { total, entrega, avaliacaoObjetiva, presenca, pendente: false },
});

describe('classificação e desempate', () => {
  it('ordena pelo total', () => {
    const r = classificar([dupla('A', 200), dupla('B', 300)]);
    expect(r.map((p) => [p.duplaId, p.posicao])).toEqual([
      ['B', 1],
      ['A', 2],
    ]);
  });

  it('desempata por entrega prática, depois questões/prova, depois presença', () => {
    const r = classificar([
      dupla('A', 300, 100, 80, 30),
      dupla('B', 300, 110, 70, 20),
      dupla('C', 300, 100, 90, 10),
      dupla('D', 300, 100, 80, 40),
    ]);
    expect(r.map((p) => p.duplaId)).toEqual(['B', 'C', 'D', 'A']);
    expect(r.map((p) => p.posicao)).toEqual([1, 2, 3, 4]);
  });

  it('empate persistente gera colocação compartilhada', () => {
    const r = classificar([
      dupla('A', 300, 100, 80, 30),
      dupla('B', 300, 100, 80, 30),
      dupla('C', 250),
    ]);
    expect(r.map((p) => p.posicao)).toEqual([1, 1, 3]);
    expect(r[0]?.compartilhada).toBe(true);
    expect(r[2]?.compartilhada).toBe(false);
  });

  it('não expõe dados além do agregado da dupla', () => {
    const [p] = classificar([dupla('A', 10)]);
    expect(Object.keys(p ?? {}).sort()).toEqual(
      ['compartilhada', 'duplaId', 'nome', 'posicao', 'totais'].sort(),
    );
  });
});
