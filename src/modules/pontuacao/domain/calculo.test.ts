import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from './regras-piloto';
import {
  ErroDeRegra,
  calcularEncontro,
  consolidarPenalidades,
  descontoPorAtraso,
  pontuarPresenca,
  pontuarProvaOficial,
  pontuarQuestoes,
  pontuarRubrica,
} from './calculo';
import type { LancamentosDoEncontro } from './tipos';

const regras = REGRAS_PILOTO;

describe('questões preparatórias (acertos ÷ total × máximo)', () => {
  it('calcula proporcionalmente com duas casas decimais', () => {
    expect(pontuarQuestoes(7, 10, regras)).toBe(21);
    expect(pontuarQuestoes(2, 3, regras)).toBe(20);
    expect(pontuarQuestoes(1, 7, regras)).toBe(4.29); // 4,2857…
    expect(pontuarQuestoes(10, 10, regras)).toBe(30);
    expect(pontuarQuestoes(0, 12, regras)).toBe(0);
  });

  it('não arredonda etapas intermediárias', () => {
    // Arredondar 1/3 antes (0,33 × 30 = 9,9) daria resultado diferente de 10.
    expect(pontuarQuestoes(1, 3, regras)).toBe(10);
  });

  it('rejeita total zero ou acertos fora do intervalo', () => {
    expect(() => pontuarQuestoes(0, 0, regras)).toThrow(ErroDeRegra);
    expect(() => pontuarQuestoes(11, 10, regras)).toThrow(ErroDeRegra);
    expect(() => pontuarQuestoes(-1, 10, regras)).toThrow(ErroDeRegra);
  });
});

describe('presença individual', () => {
  it('vale 5 por integrante presente, até 10 por dupla', () => {
    expect(
      pontuarPresenca(
        [
          { estudanteId: 'a', presente: true },
          { estudanteId: 'b', presente: true },
        ],
        regras,
      ),
    ).toBe(10);
  });

  it('falta isolada retira apenas os pontos do ausente', () => {
    expect(
      pontuarPresenca(
        [
          { estudanteId: 'a', presente: true },
          { estudanteId: 'b', presente: false },
        ],
        regras,
      ),
    ).toBe(5);
  });

  it('não ultrapassa o máximo por dupla mesmo com registros a mais', () => {
    const tres = ['a', 'b', 'c'].map((id) => ({ estudanteId: id, presente: true }));
    expect(pontuarPresenca(tres, regras)).toBe(10);
  });
});

describe('rubricas', () => {
  it('soma os quatro critérios da entrega até 40', () => {
    expect(
      pontuarRubrica(
        { compreensao: 10, aplicacao: 8, qualidade: 7.5, organizacao: 9 },
        regras.entrega.criterios,
      ),
    ).toBe(34.5);
  });

  it('soma os critérios da apresentação (3 + 4 + 3)', () => {
    expect(
      pontuarRubrica({ clareza: 3, explicacao: 4, respostas: 2 }, regras.apresentacao.criterios),
    ).toBe(9);
  });

  it('soma os critérios de participação (4 + 3 + 3)', () => {
    expect(
      pontuarRubrica(
        { envolvimento: 4, colaboracao: 2, organizacao: 3 },
        regras.participacao.criterios,
      ),
    ).toBe(9);
  });

  it('rejeita nota acima do máximo, negativa, ausente ou critério desconhecido', () => {
    const c = regras.apresentacao.criterios;
    expect(() => pontuarRubrica({ clareza: 4, explicacao: 4, respostas: 3 }, c)).toThrow(
      ErroDeRegra,
    );
    expect(() => pontuarRubrica({ clareza: -1, explicacao: 4, respostas: 3 }, c)).toThrow(
      ErroDeRegra,
    );
    expect(() => pontuarRubrica({ clareza: 3, explicacao: 4 }, c)).toThrow(ErroDeRegra);
    expect(() => pontuarRubrica({ clareza: 3, explicacao: 4, respostas: 3, extra: 1 }, c)).toThrow(
      ErroDeRegra,
    );
  });
});

describe('atraso na entrega', () => {
  it.each([
    [0, 0, false],
    [1, 2, false],
    [15, 2, false],
    [16, 5, false],
    [30, 5, false],
    [31, 0, true],
  ])('%i minutos → desconto %i, não realizada: %s', (minutos, desconto, naoRealizada) => {
    expect(descontoPorAtraso(minutos, regras)).toEqual({ desconto, naoRealizada });
  });

  it('rejeita minutos negativos', () => {
    expect(() => descontoPorAtraso(-1, regras)).toThrow(ErroDeRegra);
  });
});

describe('prova oficial', () => {
  it('soma 5 pela realização confirmada e +10 pela nota confirmada ≥ 70', () => {
    const r = pontuarProvaOficial(
      [
        { estudanteId: 'a', realizacao: 'confirmada', nota: { estado: 'confirmada', valor: 70 } },
        {
          estudanteId: 'b',
          realizacao: 'confirmada',
          nota: { estado: 'confirmada', valor: 69.9 },
        },
      ],
      regras,
    );
    expect(r).toEqual({ pontos: 20, pendente: false });
  });

  it('nota pendente não gera bônus e marca o resultado como pendente', () => {
    const r = pontuarProvaOficial(
      [
        { estudanteId: 'a', realizacao: 'confirmada', nota: { estado: 'pendente' } },
        { estudanteId: 'b', realizacao: 'confirmada', nota: { estado: 'confirmada', valor: 95 } },
      ],
      regras,
    );
    expect(r).toEqual({ pontos: 20, pendente: true });
  });

  it('realização não confirmada não gera pontos', () => {
    const r = pontuarProvaOficial(
      [
        { estudanteId: 'a', realizacao: 'pendente', nota: { estado: 'pendente' } },
        { estudanteId: 'b', realizacao: 'nao_realizou', nota: { estado: 'pendente' } },
      ],
      regras,
    );
    expect(r).toEqual({ pontos: 0, pendente: true });
  });

  it('não ultrapassa 30 pontos por dupla', () => {
    const ok = { realizacao: 'confirmada', nota: { estado: 'confirmada', valor: 100 } } as const;
    const r = pontuarProvaOficial(
      [
        { estudanteId: 'a', ...ok },
        { estudanteId: 'b', ...ok },
      ],
      regras,
    );
    expect(r.pontos).toBe(30);
  });
});

describe('penalidades', () => {
  it('não aplica duas penalidades pelo mesmo fato', () => {
    const r = consolidarPenalidades(
      [
        { id: 'p1', fatoId: 'f1', pontos: 5 },
        { id: 'p2', fatoId: 'f1', pontos: 5 },
      ],
      regras,
    );
    expect(r).toEqual({ desconto: 5, duplicadasIgnoradas: ['p2'] });
  });

  it('limita descontos de fatos distintos ao teto por encontro', () => {
    const r = consolidarPenalidades(
      [
        { id: 'p1', fatoId: 'f1', pontos: 5 },
        { id: 'p2', fatoId: 'f2', pontos: 5 },
        { id: 'p3', fatoId: 'f3', pontos: 2 },
      ],
      regras,
    );
    expect(r.desconto).toBe(10);
  });

  it('rejeita penalidade com pontos negativos', () => {
    expect(() => consolidarPenalidades([{ id: 'p', fatoId: 'f', pontos: -2 }], regras)).toThrow(
      ErroDeRegra,
    );
  });
});

const entregaCompleta = { compreensao: 10, aplicacao: 10, qualidade: 10, organizacao: 10 };
const base: LancamentosDoEncontro = {
  presencas: [
    { estudanteId: 'a', presente: true },
    { estudanteId: 'b', presente: true },
  ],
  participacao: { envolvimento: 4, colaboracao: 3, organizacao: 3 },
  avaliacaoObjetiva: { tipo: 'questoes', acertos: 10, total: 10 },
  entrega: { situacao: 'avaliada', notas: entregaCompleta, atrasoMinutos: 0 },
  apresentacao: { situacao: 'avaliada', notas: { clareza: 3, explicacao: 4, respostas: 3 } },
  penalidades: [],
};

describe('pontuação do encontro', () => {
  it('soma os componentes até 100 pontos', () => {
    expect(calcularEncontro(base, regras)).toMatchObject({
      presenca: 10,
      participacao: 10,
      avaliacaoObjetiva: 30,
      entrega: 40,
      apresentacao: 10,
      descontos: 0,
      total: 100,
      pendencias: [],
    });
  });

  it('desconta atraso apenas do critério organização, sem deixá-lo negativo', () => {
    const r = calcularEncontro(
      {
        ...base,
        entrega: {
          situacao: 'avaliada',
          notas: { ...entregaCompleta, organizacao: 3 },
          atrasoMinutos: 20,
        },
      },
      regras,
    );
    expect(r.entrega).toBe(30); // organização 3 − 5 → 0
  });

  it('entrega com mais de 30 minutos de atraso é não realizada, salvo exceção registrada', () => {
    const atrasada: LancamentosDoEncontro = {
      ...base,
      entrega: { situacao: 'avaliada', notas: entregaCompleta, atrasoMinutos: 45 },
    };
    expect(calcularEncontro(atrasada, regras).entrega).toBe(0);
    expect(
      calcularEncontro(
        {
          ...base,
          entrega: {
            situacao: 'avaliada',
            notas: entregaCompleta,
            atrasoMinutos: 45,
            excecaoAutorizada: true,
          },
        },
        regras,
      ).entrega,
    ).toBe(40);
  });

  it('sem entrega prática: zero na entrega, apresentação avaliável continua valendo', () => {
    const r = calcularEncontro({ ...base, entrega: { situacao: 'nao_entregue' } }, regras);
    expect(r.entrega).toBe(0);
    expect(r.apresentacao).toBe(10);
  });

  it('plágio comprovado zera a entrega afetada', () => {
    const r = calcularEncontro(
      {
        ...base,
        entrega: {
          situacao: 'avaliada',
          notas: entregaCompleta,
          atrasoMinutos: 0,
          plagioComprovado: true,
        },
      },
      regras,
    );
    expect(r.entrega).toBe(0);
  });

  it('apresentação não avaliável recebe zero', () => {
    const r = calcularEncontro(
      { ...base, apresentacao: { situacao: 'nao_avaliavel', justificativa: 'sem compreensão' } },
      regras,
    );
    expect(r.apresentacao).toBe(0);
  });

  it('nunca fica negativa', () => {
    const r = calcularEncontro(
      {
        presencas: [
          { estudanteId: 'a', presente: true },
          { estudanteId: 'b', presente: false },
        ],
        avaliacaoObjetiva: { tipo: 'questoes', acertos: 0, total: 10 },
        participacao: { envolvimento: 0, colaboracao: 0, organizacao: 0 },
        entrega: { situacao: 'nao_entregue' },
        apresentacao: { situacao: 'nao_avaliavel', justificativa: 'sem entrega' },
        penalidades: [
          { id: 'p1', fatoId: 'f1', pontos: 5 },
          { id: 'p2', fatoId: 'f2', pontos: 5 },
        ],
      },
      regras,
    );
    expect(r.total).toBe(0);
  });

  it('registra pendências de componentes ainda não avaliados, sem inventar pontos', () => {
    const r = calcularEncontro(
      {
        presencas: base.presencas,
        entrega: { situacao: 'pendente' },
        apresentacao: { situacao: 'pendente' },
        penalidades: [],
      },
      regras,
    );
    expect(r.total).toBe(10);
    expect(r.pendencias).toEqual(['participacao', 'avaliacaoObjetiva', 'entrega', 'apresentacao']);
  });

  it('usa a prova oficial no lugar das questões e propaga a pendência da nota', () => {
    const r = calcularEncontro(
      {
        ...base,
        avaliacaoObjetiva: {
          tipo: 'prova_oficial',
          resultados: [
            { estudanteId: 'a', realizacao: 'confirmada', nota: { estado: 'pendente' } },
            {
              estudanteId: 'b',
              realizacao: 'confirmada',
              nota: { estado: 'confirmada', valor: 80 },
            },
          ],
        },
      },
      regras,
    );
    expect(r.avaliacaoObjetiva).toBe(20);
    expect(r.pendencias).toContain('avaliacaoObjetiva');
  });
});
