import { describe, expect, it } from 'vitest';
import { validarComunicado } from './validacao';
import type { EntradaComunicado } from './tipos';

const valida: EntradaComunicado = {
  titulo: 'Mudança de sala',
  texto: 'O encontro 3 será no laboratório 2.',
  publico: 'estudantes',
  turmaIds: ['t-a'],
};

describe('validarComunicado', () => {
  it('não devolve mensagens para uma entrada válida', () => {
    expect(validarComunicado(valida, 'docente')).toEqual({});
  });

  it('a coordenação pode publicar sem turma (edição inteira)', () => {
    expect(validarComunicado({ ...valida, turmaIds: [] }, 'coordenacao')).toEqual({});
  });

  it('docente ou mentor precisam escolher ao menos uma turma', () => {
    expect(validarComunicado({ ...valida, turmaIds: [] }, 'docente').turmaIds).toBe(
      'Escolha pelo menos uma turma.',
    );
  });

  it('recusa título vazio ou só com espaços', () => {
    expect(validarComunicado({ ...valida, titulo: '   ' }, 'docente').titulo).toBe(
      'Informe o título.',
    );
  });

  it('recusa título com mais de 200 caracteres', () => {
    expect(validarComunicado({ ...valida, titulo: 'x'.repeat(201) }, 'docente').titulo).toBe(
      'O título pode ter até 200 caracteres.',
    );
    expect(
      validarComunicado({ ...valida, titulo: 'x'.repeat(200) }, 'docente').titulo,
    ).toBeUndefined();
  });

  it('recusa texto vazio ou com mais de 5.000 caracteres', () => {
    expect(validarComunicado({ ...valida, texto: '' }, 'docente').texto).toBe('Escreva o texto.');
    expect(validarComunicado({ ...valida, texto: 'y'.repeat(5001) }, 'docente').texto).toBe(
      'O texto pode ter até 5.000 caracteres.',
    );
  });

  it('exige o público', () => {
    expect(validarComunicado({ ...valida, publico: null }, 'docente').publico).toBe(
      'Escolha o público.',
    );
  });
});
