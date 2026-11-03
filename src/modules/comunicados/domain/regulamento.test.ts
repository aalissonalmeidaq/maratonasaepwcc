import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO, maximoPorEncontro } from '@/modules/pontuacao';
import { resumoDoRegulamento } from './regulamento';

const valor = (r: ReturnType<typeof resumoDoRegulamento>, rotulo: string) =>
  r.grupos.flatMap((g) => g.itens).find((i) => i.rotulo === rotulo)?.valor;

describe('resumoDoRegulamento (US4, FR-014, SC-005)', () => {
  const r = resumoDoRegulamento(REGRAS_PILOTO);

  it('usa os valores e a versão das regras da edição', () => {
    expect(r.versao).toBe(REGRAS_PILOTO.versao);
    expect(r.grupos.map((g) => g.titulo)).toEqual([
      'Pontuação por encontro',
      'Prova oficial, atrasos e ocorrências',
    ]);
    expect(valor(r, 'Presença')).toBe('5 por integrante, até 10 por equipe.');
    expect(valor(r, 'Participação')).toBe(
      'Até 10 (envolvimento nas atividades 4, colaboração 3, organização e cumprimento das orientações 3).',
    );
    expect(valor(r, 'Questões')).toBe('Acertos ÷ total × 30.');
    expect(valor(r, 'Entrega prática')).toBe(
      'Até 40 (compreensão do problema 10, aplicação de conhecimentos técnicos 10, qualidade e adequação da solução 10, organização e entrega 10).',
    );
    expect(valor(r, 'Apresentação')).toBe(
      'Até 10 (clareza 3, explicação das decisões e etapas 4, respostas às perguntas 3).',
    );
    expect(valor(r, 'Total')).toBe(`Até ${maximoPorEncontro(REGRAS_PILOTO)} por encontro.`);
  });

  it('prova oficial, faixas de atraso, teto de descontos e prazos vêm da configuração', () => {
    expect(valor(r, 'Prova oficial')).toBe(
      '5 pontos por estudante com realização confirmada e +10 com nota confirmada ≥ 70. Nota pendente não gera bônus.',
    );
    expect(valor(r, 'Atrasos')).toBe(
      'Até 15 min: −2 em “Organização e entrega”; até 30 min: −5; acima de 30 min: entrega não realizada, salvo exceção registrada.',
    );
    expect(valor(r, 'Descontos por ocorrências')).toBe(
      'Até 10 pontos por encontro; nunca duas penalidades pelo mesmo fato.',
    );
    expect(valor(r, 'Manifestação')).toBe('Até 24 horas após o registro da ocorrência.');
    expect(valor(r, 'Pedido de revisão')).toBe('Até 24 horas após a publicação.');
  });

  it('valor ausente ou não numérico vira nulo ("a definir"), sem número presumido', () => {
    const regras = structuredClone(REGRAS_PILOTO) as unknown as Record<string, unknown>;
    delete regras.prazos;
    (regras.questoes as Record<string, unknown>).maximo = 'trinta';
    const parcial = resumoDoRegulamento(regras);
    expect(valor(parcial, 'Pedido de revisão')).toBeNull();
    expect(valor(parcial, 'Manifestação')).toBeNull();
    expect(valor(parcial, 'Questões')).toBeNull();
    expect(valor(parcial, 'Total')).toBeNull();
    expect(valor(parcial, 'Presença')).toBe('5 por integrante, até 10 por equipe.');
  });

  it('regras ausentes: tudo a definir e sem versão', () => {
    const vazio = resumoDoRegulamento(null);
    expect(vazio.versao).toBeNull();
    expect(vazio.grupos.flatMap((g) => g.itens).every((i) => i.valor === null || i.fixo)).toBe(
      true,
    );
  });

  it('regras da turma: critérios próprios, grupos marcados e pontuação máxima (spec 011, FR-014)', () => {
    const daTurma = resumoDoRegulamento(
      {
        ...REGRAS_PILOTO,
        apresentacao: { criterios: [{ id: 'demonstracao', rotulo: 'Demonstração', maximo: 5 }] },
      },
      { gruposAjustados: ['apresentacao', 'prazos'], maximo: 304 },
    );
    const itens = daTurma.grupos.flatMap((g) => g.itens);
    expect(valor(daTurma, 'Apresentação')).toBe('Até 5 (demonstração 5).');
    expect(itens.filter((i) => i.daTurma).map((i) => i.rotulo)).toEqual([
      'Apresentação',
      'Manifestação',
      'Pedido de revisão',
    ]);
    expect(valor(daTurma, 'Pontuação máxima da turma')).toBe('304 pontos nos encontros da turma.');
    expect(valor(r, 'Pontuação máxima da turma')).toBeUndefined();
  });
});
