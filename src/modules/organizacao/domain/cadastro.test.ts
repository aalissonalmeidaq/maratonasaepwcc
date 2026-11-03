import { describe, expect, it } from 'vitest';
import { validarItemDoCadastro } from './cadastro';

describe('validarItemDoCadastro (spec 010, FR-004)', () => {
  it('curso: nome de 2 a 160 e categoria de 1 a 120 caracteres', () => {
    expect(validarItemDoCadastro('curso', { nome: 'Informática', categoria: 'A' })).toEqual({});
    expect(validarItemDoCadastro('curso', { nome: 'I', categoria: 'A' }).nome).toBeDefined();
    expect(
      validarItemDoCadastro('curso', { nome: 'x'.repeat(161), categoria: 'A' }).nome,
    ).toBeDefined();
    expect(
      validarItemDoCadastro('curso', { nome: 'Info', categoria: ' ' }).categoria,
    ).toBeDefined();
    expect(
      validarItemDoCadastro('curso', { nome: 'Info', categoria: 'x'.repeat(121) }).categoria,
    ).toBeDefined();
  });

  it('turma: nome de 1 a 120 caracteres e ano letivo de 2000 a 2100 ou vazio', () => {
    expect(validarItemDoCadastro('turma', { nome: 'A', anoLetivo: null })).toEqual({});
    expect(validarItemDoCadastro('turma', { nome: '', anoLetivo: null }).nome).toBeDefined();
    expect(
      validarItemDoCadastro('turma', { nome: 'x'.repeat(121), anoLetivo: null }).nome,
    ).toBeDefined();
    expect(validarItemDoCadastro('turma', { nome: 'A', anoLetivo: 1999 }).anoLetivo).toBeDefined();
    expect(validarItemDoCadastro('turma', { nome: 'A', anoLetivo: 2027 })).toEqual({});
  });
});
