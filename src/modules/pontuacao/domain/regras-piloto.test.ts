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

  it('tipos de ocorrência do PRD com pontos ou zeramento da entrega (spec 007, R3)', () => {
    expect(REGRAS_PILOTO.penalidades.tipos).toEqual([
      { id: 'reincidencia', rotulo: 'Reincidência após orientação registrada', pontos: 2 },
      { id: 'desrespeito', rotulo: 'Desrespeito com responsabilidade da equipe', pontos: 5 },
      { id: 'uso_nao_autorizado', rotulo: 'Uso não autorizado', pontos: 5 },
      { id: 'plagio', rotulo: 'Plágio comprovado', zeraEntrega: true },
    ]);
  });

  it('prazos de manifestação e de revisão de 24 horas', () => {
    expect(REGRAS_PILOTO.prazos).toEqual({ manifestacaoHoras: 24, revisaoHoras: 24 });
  });
});
