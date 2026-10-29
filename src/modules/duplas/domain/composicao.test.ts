import { describe, expect, it } from 'vitest';
import { validarComposicao, validarJustificativa, type EstudanteElegivel } from './composicao';

const estudantes: EstudanteElegivel[] = [
  { id: 'a', nome: 'Ana', turmaId: 't1', duplaAtivaId: null },
  { id: 'b', nome: 'Bruno', turmaId: 't1', duplaAtivaId: null },
  { id: 'c', nome: 'Carla', turmaId: 't1', duplaAtivaId: 'd9' },
  { id: 'x', nome: 'Xavier', turmaId: 't2', duplaAtivaId: null },
];

describe('composição da dupla (HU01)', () => {
  it('aceita dois alunos distintos da turma sem dupla ativa', () => {
    expect(
      validarComposicao({ turmaId: 't1', nome: 'Dupla Alfa', integrantes: ['a', 'b'] }, estudantes),
    ).toEqual([]);
  });

  it('exige exatamente dois integrantes', () => {
    expect(
      validarComposicao({ turmaId: 't1', nome: 'Dupla', integrantes: ['a'] }, estudantes),
    ).toContain('Selecione exatamente dois estudantes.');
  });

  it('recusa o mesmo estudante duas vezes', () => {
    expect(
      validarComposicao({ turmaId: 't1', nome: 'Dupla', integrantes: ['a', 'a'] }, estudantes),
    ).toContain('Escolha dois estudantes diferentes.');
  });

  it('recusa estudante de outra turma', () => {
    expect(
      validarComposicao({ turmaId: 't1', nome: 'Dupla', integrantes: ['a', 'x'] }, estudantes),
    ).toContain('Xavier não é aluno ativo desta turma.');
  });

  it('recusa estudante que já está em dupla ativa', () => {
    expect(
      validarComposicao({ turmaId: 't1', nome: 'Dupla', integrantes: ['a', 'c'] }, estudantes),
    ).toContain('Carla já participa de outra dupla ativa.');
  });

  it('exige nome entre 2 e 80 caracteres', () => {
    expect(
      validarComposicao({ turmaId: 't1', nome: ' ', integrantes: ['a', 'b'] }, estudantes),
    ).toContain('Informe um nome para a dupla (2 a 80 caracteres).');
  });
});

describe('justificativa', () => {
  it('exige pelo menos 10 caracteres úteis', () => {
    expect(validarJustificativa('   curta   ')).toBe(
      'Informe uma justificativa com pelo menos 10 caracteres.',
    );
    expect(validarJustificativa('Transferência de turno')).toBeNull();
  });
});
