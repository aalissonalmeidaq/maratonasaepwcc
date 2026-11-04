import { describe, expect, it } from 'vitest';
import { criarRepositoriosDemo } from './repositorios';

const como = (usuarioId: string) => criarRepositoriosDemo(() => usuarioId).organizacao;

describe('gestão de edições na demonstração (spec 010)', () => {
  it('a coordenação vê a edição ativa e a em preparação; o estudante só a ativa', async () => {
    const daCoordenacao = await como('u-coord').edicoes();
    // Spec 013: a coordenação vê também uma edição encerrada fictícia, com o registro.
    expect(daCoordenacao.map((e) => e.estado)).toEqual(['ativa', 'rascunho', 'encerrada']);
    expect((await como('e01').edicoes()).map((e) => e.estado)).toEqual(['ativa']);
    const geridas = await como('u-coord').edicoesQueCoordeno();
    // Spec 013: a gestão mostra também uma edição encerrada fictícia, com o registro.
    expect(geridas.map((e) => e.estado)).toEqual(['ativa', 'rascunho', 'encerrada']);
  });

  it('cursos e turmas pertencem à edição ativa; a em preparação começa vazia', async () => {
    const [ativa, preparacao] = await como('u-coord').edicoes();
    expect((await como('u-coord').cursos(ativa!.id)).length).toBeGreaterThan(0);
    expect(await como('u-coord').cursos(preparacao!.id)).toEqual([]);
    expect(await como('u-coord').turmas(preparacao!.id)).toEqual([]);
  });

  it('o cadastro mostra cursos com turmas e as edições de cada turma', async () => {
    const cadastro = await como('u-coord').cadastro();
    expect(cadastro.length).toBeGreaterThan(0);
    expect(cadastro[0]?.turmas[0]?.edicoes[0]?.estado).toBe('ativa');
    await expect(como('e01').cadastro()).rejects.toThrow(/permissão/);
  });

  it('nenhuma escrita é aceita', async () => {
    const r = como('u-coord');
    await expect(
      r.criarEdicao('k', { nome: 'Nova', inicio: null, fim: null }, null),
    ).rejects.toThrow(/demonstração/);
    await expect(r.vincularTurmas('ed-demo', ['x'])).rejects.toThrow(/demonstração/);
    await expect(r.encerrarEdicao('ed-demo', 'Justificativa válida.')).rejects.toThrow(
      /demonstração/,
    );
  });

  it('pendências do encerramento por turma e o registro de uma edição encerrada (spec 013)', async () => {
    const r = como('u-coord');
    const p = await r.pendenciasDaEdicao('ed-demo');
    expect(p.turmasSemDefinitiva.map((t) => [t.turma, t.estado])).toEqual([
      ['3º ano B (fictícia)', 'sem_publicacao'],
    ]);
    const encerrada = (await r.edicoesQueCoordeno()).find((e) => e.estado === 'encerrada');
    expect(encerrada?.pendenciasNoEncerramento?.turmasSemDefinitiva?.[0]?.estado).toBe(
      'sem_publicacao',
    );
  });
});
