import { describe, expect, it } from 'vitest';
import { coordenaAEdicao, type ClienteComRls } from './autorizacao.ts';

function clienteFalso(resultado: { data: unknown; error: unknown }) {
  const filtros: [string, unknown][] = [];
  const consulta = {
    select: () => consulta,
    eq: (coluna: string, valor: unknown) => {
      filtros.push([coluna, valor]);
      return consulta;
    },
    maybeSingle: async () => resultado,
  };
  const cliente = { from: (tabela: string) => (filtros.push(['tabela', tabela]), consulta) };
  return { cliente: cliente as unknown as ClienteComRls, filtros };
}

describe('coordenaAEdicao', () => {
  it('consulta a atribuição ativa de coordenação da pessoa na edição (com a RLS de quem chama)', async () => {
    const { cliente, filtros } = clienteFalso({ data: { id: 'x' }, error: null });
    expect(await coordenaAEdicao(cliente, 'u1', 'e1')).toBe('sim');
    expect(filtros).toEqual([
      ['tabela', 'atribuicoes'],
      ['usuario_id', 'u1'],
      ['edicao_id', 'e1'],
      ['papel', 'coordenacao'],
      ['ativo', true],
    ]);
  });

  it('sem atribuição: não', async () => {
    const { cliente } = clienteFalso({ data: null, error: null });
    expect(await coordenaAEdicao(cliente, 'u1', 'e1')).toBe('nao');
  });

  it('erro na consulta é distinto de "não" (vira 500, não 403)', async () => {
    const { cliente } = clienteFalso({ data: null, error: { message: 'falhou' } });
    expect(await coordenaAEdicao(cliente, 'u1', 'e1')).toBe('erro');
  });
});
