import { describe, expect, it } from 'vitest';
import { criarRepositoriosDemo } from './repositorios';

const como = (usuarioId: string) => criarRepositoriosDemo(() => usuarioId).regras;

describe('regras na demonstração (spec 011)', () => {
  it('a turma A tem a apresentação própria; a B usa a da edição', async () => {
    const a = await como('e01').regrasDaTurma('t-a');
    const b = await como('e01').regrasDaTurma('t-b');
    expect(a.gruposAjustados).toEqual(['apresentacao']);
    expect(a.regras.apresentacao.criterios.map((c) => c.id)).toContain('demonstracao');
    expect(b.gruposAjustados).toEqual([]);
    expect(a.podeAjustar).toEqual([]);
    expect(a.maximo).toBeGreaterThan(0);
  });

  it('a coordenação pode ajustar, mas nenhuma escrita é aceita', async () => {
    const r = como('u-coord');
    expect((await r.regrasDaTurma('t-a')).podeAjustar).toContain('penalidades');
    expect(await r.historico('ed-demo', 't-a')).toHaveLength(2);
    await expect(r.definirEncontrosDaTurma('t-a', [])).rejects.toThrow(/demonstração/);
  });
});
