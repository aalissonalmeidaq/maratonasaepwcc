import { describe, expect, it } from 'vitest';
import { calcularEncontro } from './calculo';
import { classificar, type DuplaParaRanking } from './ranking';
import { REGRAS_PILOTO } from './regras-piloto';
import { combinarRegras } from './regrasVigentes';
import type { AjustesDaTurma } from './regrasTipos';
import type { LancamentosDoEncontro, PontuacaoDoEncontro } from './tipos';
import casosEncontro from './casos-contrato.json';
import casosRanking from './casos-ranking.json';

/**
 * Casos de contrato compartilhados com o cálculo do servidor (spec 007, R2): os mesmos
 * esperados são conferidos aqui (TS) e em scripts/testar-paridade-calculo.mjs (SQL).
 */
describe('casos de contrato do encontro', () => {
  for (const caso of casosEncontro.casos) {
    it(caso.nome, () => {
      expect(caso.regras).toBe('piloto');
      const ajustes = ('ajustes' in caso ? caso.ajustes : {}) as AjustesDaTurma;
      const r = calcularEncontro(
        caso.lancamentos as LancamentosDoEncontro,
        combinarRegras(REGRAS_PILOTO, ajustes),
      );
      expect(r).toEqual(caso.esperado as PontuacaoDoEncontro);
    });
  }
});

describe('casos de contrato da classificação', () => {
  for (const caso of casosRanking.casos) {
    it(caso.nome, () => {
      const r = classificar(caso.equipes as DuplaParaRanking[]);
      expect(
        r.map(({ duplaId, posicao, compartilhada }) => ({ duplaId, posicao, compartilhada })),
      ).toEqual(caso.esperado);
    });
  }
});
