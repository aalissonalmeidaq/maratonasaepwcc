import { describe, expect, it } from 'vitest';
import { criarRepositoriosDemo } from './repositorios';

const como = (usuarioId: string) => criarRepositoriosDemo(() => usuarioId).comunicados;

describe('comunicados da demonstração (spec 009, R9)', () => {
  it('estudante e docente leem os comunicados fictícios, do mais recente ao mais antigo', async () => {
    const lista = await como('e01').comunicadosParaMim('ed-demo');
    expect(lista.map((c) => c.titulo)).toEqual([
      'Regulamento em validação',
      'Boas-vindas à demonstração',
    ]);
    expect(lista[0]).toMatchObject({ publico: 'todos', turmas: [], novo: false });
    expect(lista[0]?.autor.papel).toBe('coordenacao');
    expect(await como('u-doc-b').comunicadosParaMim('ed-demo')).toHaveLength(2);
  });

  it('a coordenação gerencia todos; docente vê só os próprios (nenhum)', async () => {
    const geridos = await como('u-coord').comunicadosQueGerencio('ed-demo');
    expect(geridos.every((c) => c.estado === 'publicado' && !c.podeEditar)).toBe(true);
    expect(geridos).toHaveLength(2);
    expect(await como('u-doc-b').comunicadosQueGerencio('ed-demo')).toEqual([]);
    await expect(como('e01').comunicadosQueGerencio('ed-demo')).rejects.toThrow(/permissão/);
  });

  it('as escritas são recusadas (FR-016)', async () => {
    const r = como('u-coord');
    await expect(
      r.salvarComunicado('k', null, 'ed-demo', {
        titulo: 'T',
        texto: 'X',
        publico: 'todos',
        turmaIds: [],
      }),
    ).rejects.toThrow(/demonstração/);
    await expect(r.publicarComunicado('cm1')).rejects.toThrow(/demonstração/);
    await expect(r.corrigirComunicado('cm1', 'T', 'X', 'Justificativa longa.')).rejects.toThrow(
      /demonstração/,
    );
    await expect(r.retirarComunicado('cm1', 'Justificativa longa.')).rejects.toThrow(
      /demonstração/,
    );
    await expect(r.marcarComunicadoLido('cm1')).rejects.toThrow(/demonstração/);
  });
});
