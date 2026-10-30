import { describe, expect, it } from 'vitest';
import { filtrarPorBusca, normalizarBusca, paginar } from './listagem';

describe('normalizarBusca', () => {
  it('ignora maiúsculas, acentos e espaços extras', () => {
    expect(normalizarBusca('  Lúcia   EXEMPLO ')).toBe('lucia exemplo');
    expect(normalizarBusca('Ação Çedilha')).toBe('acao cedilha');
  });
});

describe('filtrarPorBusca', () => {
  const pessoas = [
    { nome: 'Ána Exemplo', turma: 'Turma A' },
    { nome: 'Bruno Exemplo', turma: 'Turma B' },
    { nome: 'Lúcia Docente', turma: 'Turma A' },
  ];
  const texto = (p: (typeof pessoas)[number]) => `${p.nome} ${p.turma}`;

  it('termo vazio devolve todos os itens', () => {
    expect(filtrarPorBusca(pessoas, '   ', texto)).toEqual(pessoas);
  });

  it('encontra parte do texto sem diferenciar acentos e maiúsculas', () => {
    expect(filtrarPorBusca(pessoas, 'ANA', texto).map((p) => p.nome)).toEqual(['Ána Exemplo']);
    expect(filtrarPorBusca(pessoas, 'lucia', texto).map((p) => p.nome)).toEqual(['Lúcia Docente']);
  });

  it('várias palavras precisam aparecer todas, em qualquer campo e ordem', () => {
    expect(filtrarPorBusca(pessoas, 'a exemplo', texto).map((p) => p.nome)).toEqual([
      'Ána Exemplo',
      'Bruno Exemplo',
    ]);
    expect(filtrarPorBusca(pessoas, 'b exemplo', texto).map((p) => p.nome)).toEqual([
      'Bruno Exemplo',
    ]);
    expect(filtrarPorBusca(pessoas, 'docente b', texto)).toEqual([]);
  });
});

describe('paginar', () => {
  const itens = Array.from({ length: 23 }, (_, i) => i + 1);

  it('recorta a página pedida e informa o intervalo exibido', () => {
    expect(paginar(itens, 2, 10)).toEqual({
      itens: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      pagina: 2,
      totalPaginas: 3,
      total: 23,
      inicio: 11,
      fim: 20,
    });
    expect(paginar(itens, 3, 10)).toMatchObject({ itens: [21, 22, 23], inicio: 21, fim: 23 });
  });

  it('ajusta páginas fora do intervalo (ex.: após remover registros)', () => {
    expect(paginar(itens, 9, 10).pagina).toBe(3);
    expect(paginar(itens, 0, 10).pagina).toBe(1);
    expect(paginar(itens, Number.NaN, 10).pagina).toBe(1);
  });

  it('lista vazia tem uma página e intervalo zerado', () => {
    expect(paginar([], 1, 10)).toEqual({
      itens: [],
      pagina: 1,
      totalPaginas: 1,
      total: 0,
      inicio: 0,
      fim: 0,
    });
  });

  it('recusa tamanho de página inválido', () => {
    expect(() => paginar(itens, 1, 0)).toThrow();
    expect(() => paginar(itens, 1, 2.5)).toThrow();
  });
});
