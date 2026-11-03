import { describe, expect, it } from 'vitest';
import type { Edicao } from './tipos';
import { edicaoPadrao, validarEdicao } from './edicoes';

const edicao = (id: string, estado: Edicao['estado'], inicio: string | null): Edicao => ({
  id,
  nome: id,
  estado,
  inicio,
  fim: null,
  quantidadeEncontros: 4,
  regrasVersao: 'v',
  regras: {},
});

describe('validarEdicao (spec 010, FR-001)', () => {
  it('aceita nome de 3 a 160 caracteres e período opcional', () => {
    expect(validarEdicao({ nome: 'Maratona 2027', inicio: null, fim: null })).toEqual({});
    expect(validarEdicao({ nome: 'abc', inicio: '2027-03-01', fim: '2027-03-01' })).toEqual({});
  });

  it('recusa nome curto, longo ou só com espaços', () => {
    expect(validarEdicao({ nome: 'ab', inicio: null, fim: null }).nome).toBeDefined();
    expect(validarEdicao({ nome: '   ', inicio: null, fim: null }).nome).toBeDefined();
    expect(validarEdicao({ nome: 'x'.repeat(161), inicio: null, fim: null }).nome).toBeDefined();
  });

  it('recusa fim antes do início', () => {
    const erros = validarEdicao({ nome: 'Maratona', inicio: '2027-05-02', fim: '2027-05-01' });
    expect(erros.fim).toBe('O fim não pode ser antes do início.');
  });
});

describe('edicaoPadrao (spec 010, FR-019)', () => {
  it('escolhe a ativa de maior início', () => {
    const lista = [
      edicao('a', 'ativa', '2026-03-01'),
      edicao('b', 'ativa', '2027-03-01'),
      edicao('c', 'rascunho', '2028-03-01'),
    ];
    expect(edicaoPadrao(lista)?.id).toBe('b');
  });

  it('sem ativa, escolhe a de maior início; início nulo fica por último', () => {
    const lista = [
      edicao('a', 'encerrada', null),
      edicao('b', 'encerrada', '2025-03-01'),
      edicao('c', 'rascunho', '2024-03-01'),
    ];
    expect(edicaoPadrao(lista)?.id).toBe('b');
  });

  it('lista vazia devolve nulo', () => {
    expect(edicaoPadrao([])).toBeNull();
  });
});
