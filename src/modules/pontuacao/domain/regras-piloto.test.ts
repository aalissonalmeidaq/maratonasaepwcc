import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO, maximoDaEdicao, maximoPorEncontro } from './regras-piloto';

describe('configuração do piloto', () => {
  it('cada encontro vale até 100 pontos e quatro encontros somam 400', () => {
    expect(maximoPorEncontro(REGRAS_PILOTO)).toBe(100);
    expect(maximoDaEdicao(REGRAS_PILOTO)).toBe(400);
  });

  it('o máximo da edição acompanha a quantidade de encontros configurada', () => {
    expect(maximoDaEdicao({ ...REGRAS_PILOTO, quantidadeEncontros: 5 })).toBe(500);
  });

  it('a prova oficial não excede o componente objetivo do encontro', () => {
    expect(REGRAS_PILOTO.provaOficial.maximoPorDupla).toBeLessThanOrEqual(
      REGRAS_PILOTO.questoes.maximo,
    );
  });
});
