import { describe, expect, it } from 'vitest';
import { premiacaoDaTurma } from './premiacao';
import type { EstadoRanking, PublicacaoRanking } from './tipos';

const itens = [
  { posicao: 1, descricao: 'Prêmio do 1º', detalhes: null },
  { posicao: 2, descricao: 'Prêmio do 2º', detalhes: null },
  { posicao: 3, descricao: 'Prêmio do 3º', detalhes: 'A confirmar' },
];

/** Publicação com as posições dadas como `[nome, posição, compartilhada]`. */
function publicacao(
  estado: EstadoRanking,
  posicoes: [string, number, boolean][],
): PublicacaoRanking {
  return {
    id: 'pub1',
    turmaId: 't1',
    turma: 'KA',
    categoria: 'Categoria K',
    versao: 1,
    estado,
    publicadoEm: '2026-11-03T12:00:00Z',
    revisaoAte: null,
    posicoes: posicoes.map(([nome, posicao, compartilhada]) => ({
      duplaId: `id-${nome}`,
      nome,
      posicao,
      compartilhada,
      total: 0,
      pendente: false,
      minha: false,
    })),
  };
}

const base = { turmaId: 't1', turma: 'KA', itens, decisoes: [] };
const nomes = (r: ReturnType<typeof premiacaoDaTurma>) =>
  r.itens.map((i) => i.equipes.map((e) => e.nome).join('+') || '-');

describe('premiacaoDaTurma (spec 012, FR-018)', () => {
  it('sem publicação ou com a última parcial: a definir, sem equipes', () => {
    for (const pub of [null, publicacao('parcial', [['A', 1, false]])]) {
      const r = premiacaoDaTurma({ ...base, publicacao: pub, perfil: 'coordenacao' });
      expect(r.situacao).toBe('a_definir');
      expect(nomes(r)).toEqual(['-', '-', '-']);
      expect(r.itens.map((i) => i.descricao)).toEqual([
        'Prêmio do 1º',
        'Prêmio do 2º',
        'Prêmio do 3º',
      ]);
    }
  });

  it('provisória: a gestão vê as equipes como provisório; o aluno vê a definir', () => {
    const pub = publicacao('provisorio', [
      ['A', 1, false],
      ['B', 2, false],
      ['C', 3, false],
    ]);
    for (const perfil of ['coordenacao', 'gestao'] as const) {
      const r = premiacaoDaTurma({ ...base, publicacao: pub, perfil });
      expect(r.situacao).toBe('provisorio');
      expect(nomes(r)).toEqual(['A', 'B', 'C']);
    }
    const aluno = premiacaoDaTurma({ ...base, publicacao: pub, perfil: 'aluno' });
    expect(aluno.situacao).toBe('a_definir');
    expect(nomes(aluno)).toEqual(['-', '-', '-']);
  });

  it('definitiva sem empate: final, com as equipes das posições premiadas', () => {
    const r = premiacaoDaTurma({
      ...base,
      publicacao: publicacao('definitivo', [
        ['A', 1, false],
        ['B', 2, false],
        ['C', 3, false],
        ['D', 4, false],
      ]),
      perfil: 'aluno',
    });
    expect(r.situacao).toBe('final');
    expect(r.publicacaoId).toBe('pub1');
    expect(nomes(r)).toEqual(['A', 'B', 'C']);
    expect(r.itens.every((i) => !i.empate && !i.semEquipePorEmpate)).toBe(true);
  });

  it('empate numa posição premiada: empate a decidir e a posição pulada fica sem equipe', () => {
    const r = premiacaoDaTurma({
      ...base,
      publicacao: publicacao('definitivo', [
        ['A', 1, true],
        ['B', 1, true],
        ['C', 3, false],
      ]),
      perfil: 'coordenacao',
    });
    expect(r.situacao).toBe('empate_a_decidir');
    expect(nomes(r)).toEqual(['A+B', '-', 'C']);
    expect(r.itens.map((i) => [i.empate, i.semEquipePorEmpate])).toEqual([
      [true, false],
      [false, true],
      [false, false],
    ]);
  });

  it('empate fora das posições premiadas não muda a situação', () => {
    const r = premiacaoDaTurma({
      ...base,
      publicacao: publicacao('definitivo', [
        ['A', 1, false],
        ['B', 2, false],
        ['C', 3, false],
        ['D', 4, true],
        ['E', 4, true],
      ]),
      perfil: 'coordenacao',
    });
    expect(r.situacao).toBe('final');
  });

  it('decisão registrada: as premiadas substituem as empatadas e a situação vira final', () => {
    const decisao = {
      posicao: 1,
      decisao: 'Prêmio dividido.',
      premiadas: ['id-A'],
      justificativa: 'Critério da coordenação.',
      decididoEm: '2026-11-04T12:00:00Z',
    };
    const r = premiacaoDaTurma({
      ...base,
      decisoes: [decisao],
      publicacao: publicacao('definitivo', [
        ['A', 1, true],
        ['B', 1, true],
        ['C', 3, false],
      ]),
      perfil: 'coordenacao',
    });
    expect(r.situacao).toBe('final');
    expect(nomes(r)).toEqual(['A', '-', 'C']);
    expect(r.itens[0]!.empate).toBe(true);
    expect(r.itens[0]!.decisao).toEqual({
      decisao: 'Prêmio dividido.',
      premiadas: ['id-A'],
      justificativa: 'Critério da coordenação.',
      decididoEm: '2026-11-04T12:00:00Z',
    });
  });

  it('itens fora de ordem saem ordenados por posição', () => {
    const r = premiacaoDaTurma({
      ...base,
      itens: [itens[2]!, itens[0]!],
      publicacao: null,
      perfil: 'coordenacao',
    });
    expect(r.itens.map((i) => i.posicao)).toEqual([1, 3]);
  });
});
