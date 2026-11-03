import { describe, expect, it } from 'vitest';
import { criarRepositoriosDemo } from './repositorios';

const como = (usuarioId: string) => criarRepositoriosDemo(() => usuarioId).paineis;

describe('painéis da demonstração (spec 008, R7)', () => {
  it('aluno: equipe, prévia, posição, próximo encontro e a manifestação pendente', async () => {
    const p = await como('e01').painelDoAluno('ed-demo');
    expect(p.equipe?.nome).toBe('Dupla Órbita');
    expect(p.previa?.total).toBeGreaterThan(0);
    expect(p.ranking?.posicao).toBeGreaterThanOrEqual(1);
    expect(p.proximoEncontro?.numero).toBe(3);
    expect(p.acoes.map((a) => a.tipo)).toEqual(['manifestacao']);
    expect(JSON.stringify(p)).not.toMatch(/"nota"/);
  });

  it('docente: só as próprias turmas, com pendências de encontros realizados', async () => {
    const p = await como('u-doc-b').painelDaGestao('ed-demo');
    expect(p.turmas.map((t) => t.id)).toEqual(['t-b']);
    expect(p.turmas[0]?.pendencias.every((x) => x.encontroNumero <= 2)).toBe(true);
    await expect(como('e01').painelDaGestao('ed-demo')).rejects.toThrow(/permissão/);
  });

  it('coordenação: indicadores e uma linha por categoria', async () => {
    const p = await como('u-coord').painelDaCoordenacao('ed-demo');
    expect(p.indicadores).toMatchObject({ cursos: 2, turmas: 2, equipes: 6, encontrosTotal: 4 });
    expect(p.categorias.map((c) => c.categoria)).toEqual([
      'Categoria A (exemplo)',
      'Categoria B (exemplo)',
    ]);
    expect(p.categorias[0]?.publicacao?.estado).toBe('parcial');
  });

  it('a exportação é recusada (FR-015)', async () => {
    await expect(
      como('u-coord').relatorio('pontos', {
        edicaoId: 'ed-demo',
        categoria: null,
        turmaId: null,
        encontroId: null,
      }),
    ).rejects.toThrow(/demonstração/);
  });
});
