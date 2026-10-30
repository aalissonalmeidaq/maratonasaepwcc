import { describe, expect, it } from 'vitest';
import { agruparEncontros, alunosSemEquipe, indicadores } from './painel';
import type { EncontroDoPainel, PainelTurma } from './tipos';

const encontro = (
  numero: number,
  data: string,
  estado: EncontroDoPainel['estado'] = 'agendado',
): EncontroDoPainel => ({
  id: `e${numero}`,
  numero,
  titulo: `Encontro ${numero}`,
  data,
  inicio: null,
  fim: null,
  estado,
  ambienteNome: null,
});

const painel = (parcial: Partial<PainelTurma> = {}): PainelTurma => ({
  visao: 'gestao',
  turma: {
    id: 't1',
    nome: '3º ano A',
    anoLetivo: 2026,
    cursoNome: 'Curso',
    categoria: 'Categoria',
    edicaoId: 'ed1',
  },
  alunos: [
    { id: 'a', nome: 'Ana', temEquipe: true },
    { id: 'b', nome: 'Bruno', temEquipe: true },
    { id: 'c', nome: 'Caio', temEquipe: false },
  ],
  equipes: [
    {
      id: 'd1',
      nome: null,
      integrantes: [
        { estudanteId: 'a', nome: 'Ana', integranteInativo: false },
        { estudanteId: 'b', nome: 'Bruno', integranteInativo: false },
      ],
    },
  ],
  convitesPendentes: 2,
  pontuacao: null,
  encontros: [],
  ...parcial,
});

describe('indicadores do painel (FR-001, SC-003)', () => {
  it('derivam das listas do próprio painel', () => {
    const p = painel();
    const ind = indicadores(p);
    expect(ind).toEqual({
      alunosAtivos: 3,
      comEquipe: 2,
      semEquipe: 1,
      equipes: 1,
      convitesPendentes: 2,
    });
    expect(ind.semEquipe).toBe(alunosSemEquipe(p).length);
    expect(ind.comEquipe + ind.semEquipe).toBe(p.alunos.length);
  });

  it('turma vazia: tudo zero', () => {
    expect(indicadores(painel({ alunos: [], equipes: [], convitesPendentes: 0 }))).toEqual({
      alunosAtivos: 0,
      comEquipe: 0,
      semEquipe: 0,
      equipes: 0,
      convitesPendentes: 0,
    });
  });

  it('na visão do aluno, convites pendentes não existem', () => {
    expect(indicadores(painel({ visao: 'aluno', convitesPendentes: null })).convitesPendentes).toBe(
      null,
    );
  });
});

describe('alunosSemEquipe', () => {
  it('mantém a ordem recebida do servidor', () => {
    const p = painel({
      alunos: [
        { id: 'z', nome: 'Zeca', temEquipe: false },
        { id: 'a', nome: 'Ana', temEquipe: true },
        { id: 'b', nome: 'Bia', temEquipe: false },
      ],
    });
    expect(alunosSemEquipe(p).map((a) => a.id)).toEqual(['z', 'b']);
  });
});

describe('agruparEncontros', () => {
  const hoje = '2026-11-10';

  it('separa realizados, agendados e cancelados e aponta o próximo', () => {
    const g = agruparEncontros(
      [
        encontro(3, '2026-11-20'),
        encontro(1, '2026-11-01'),
        encontro(2, '2026-11-12', 'cancelado'),
        encontro(4, '2026-11-10'),
      ],
      hoje,
    );
    expect(g.realizados.map((e) => e.numero)).toEqual([1]);
    expect(g.agendados.map((e) => e.numero)).toEqual([4, 3]);
    expect(g.cancelados.map((e) => e.numero)).toEqual([2]);
    expect(g.proximo?.numero).toBe(4);
  });

  it('encontro marcado como realizado conta como realizado mesmo com data futura', () => {
    const g = agruparEncontros([encontro(1, '2026-12-01', 'realizado')], hoje);
    expect(g.realizados).toHaveLength(1);
    expect(g.proximo).toBeNull();
  });

  it('sem encontros: listas vazias e nenhum próximo', () => {
    expect(agruparEncontros([], hoje)).toEqual({
      proximo: null,
      agendados: [],
      realizados: [],
      cancelados: [],
    });
  });
});
