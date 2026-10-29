import { describe, expect, it } from 'vitest';
import { criarRepositoriosDemo } from './repositorios';

const como = (usuarioId: string) => criarRepositoriosDemo(() => usuarioId);

describe('repositórios de demonstração', () => {
  it('coordenação vê todas as turmas e duplas', async () => {
    const r = como('u-coord');
    const [edicao] = await r.organizacao.edicoes();
    expect(edicao?.quantidadeEncontros).toBe(4);
    expect(await r.organizacao.turmas('ed-demo')).toHaveLength(2);
    expect(await r.duplas.duplas('ed-demo')).toHaveLength(6);
  });

  it('docente vê só turmas e duplas vinculadas', async () => {
    const r = como('u-doc-b');
    expect((await r.organizacao.turmas('ed-demo')).map((t) => t.id)).toEqual(['t-b']);
    expect((await r.duplas.duplas('ed-demo')).every((d) => d.turmaId === 't-b')).toBe(true);
  });

  it('aluno vê só a própria dupla, com o nome do colega', async () => {
    const duplas = await como('e01').duplas.duplas('ed-demo');
    expect(duplas).toHaveLength(1);
    expect(duplas[0]?.integrantes.map((i) => i.nome)).toEqual(['Ana Exemplo', 'Bruno Exemplo']);
  });

  it('encontros têm horário e ambiente', async () => {
    const [primeiro] = await como('e01').encontros.encontros('ed-demo');
    expect(primeiro).toMatchObject({
      numero: 1,
      inicio: '13:30',
      fim: '17:00',
      ambienteNome: 'Laboratório 1 (exemplo)',
    });
  });

  it('não grava nada: toda escrita é recusada com explicação', async () => {
    const r = como('u-coord');
    await expect(
      r.organizacao.salvarCurso({ edicaoId: 'ed-demo', nome: 'X', categoria: 'Y' }),
    ).rejects.toThrow(/modo demonstração/i);
    await expect(
      r.duplas.formar({ turmaId: 't-a', nome: 'X', integrantes: ['e01', 'e02'] }),
    ).rejects.toThrow(/modo demonstração/i);
    expect(r.somenteLeitura).toBe(true);
  });
});
