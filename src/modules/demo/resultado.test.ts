import { describe, expect, it } from 'vitest';
import { criarRepositoriosDemo } from './repositorios';

const como = (usuarioId: string) => criarRepositoriosDemo(() => usuarioId).resultado;

describe('ranking por turma da demonstração (spec 012)', () => {
  it('aluno vê só a publicação da própria turma; outra turma é recusada', async () => {
    const r = como('e01');
    const pub = await r.rankingDaTurma('t-a');
    expect(pub?.turma).toBe('3º ano A (fictícia)');
    expect(pub?.estado).toBe('definitivo');
    expect(pub?.posicoes.every((p) => ['d1', 'd2', 'd3', 'd4'].includes(p.duplaId))).toBe(true);
    expect(pub?.posicoes.filter((p) => p.detalhe).map((p) => p.duplaId)).toEqual(['d1']);
    await expect(r.rankingDaTurma('t-b')).rejects.toThrow(/permissão/);
  });

  it('turma sem publicação devolve nulo', async () => {
    expect(await como('u-doc-b').rankingDaTurma('t-b')).toBeNull();
  });

  it('coordenação: lista das turmas, histórico e publicações anteriores', async () => {
    const r = como('u-coord');
    const lista = await r.rankingDaEdicao('ed-demo');
    expect(lista.map((t) => [t.turma, t.ultima?.estado ?? null])).toEqual([
      ['3º ano A (fictícia)', 'definitivo'],
      ['3º ano B (fictícia)', null],
    ]);
    expect((await r.historicoPublicacoesTurma('t-a')).map((v) => v.versao)).toEqual([2, 1]);
    expect((await r.publicacoesAnteriores('ed-demo'))[0]?.categoria).toBe('Categoria A (exemplo)');
    expect((await r.rankingPublicado('ed-demo', 'Categoria A (exemplo)'))?.turmaId).toBeNull();
  });

  it('só a coordenação lê as publicações anteriores e a lista do ranking', async () => {
    await expect(como('e01').rankingPublicado('ed-demo', null)).rejects.toThrow(/permissão/);
    await expect(como('u-doc-a').rankingDaEdicao('ed-demo')).rejects.toThrow(/permissão/);
  });

  it('premiação: empate a decidir no 3º ano A; aluno vê só a própria turma', async () => {
    const coord = await como('u-coord').premiacaoDaEdicao('ed-demo');
    expect(coord.map((p) => [p.turmaId, p.situacao])).toEqual([
      ['t-a', 'empate_a_decidir'],
      ['t-b', 'a_definir'],
    ]);
    expect((await como('e01').premiacaoDaEdicao('ed-demo')).map((p) => p.turmaId)).toEqual(['t-a']);
  });

  it('publicar e decidir são recusados na demonstração', async () => {
    const r = como('u-coord');
    await expect(
      r.publicarRankingTurmas({
        edicaoId: 'ed-demo',
        turmas: [{ turmaId: 't-b', versaoBase: null }],
        estado: 'parcial',
      }),
    ).rejects.toThrow(/demonstração/);
    await expect(
      r.decidirPremiacaoEmpate({
        publicacaoId: 'pub-t-a-v2',
        posicao: 1,
        premiadas: ['d1'],
        decisao: 'Dividir.',
        justificativa: 'Decisão fictícia.',
      }),
    ).rejects.toThrow(/demonstração/);
  });
});
