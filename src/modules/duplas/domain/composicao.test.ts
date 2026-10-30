import { describe, expect, it } from 'vitest';
import { validarJustificativa } from './composicao';

describe('justificativa', () => {
  it('exige pelo menos 10 caracteres úteis', () => {
    expect(validarJustificativa('   curta   ')).toBe(
      'Informe uma justificativa com pelo menos 10 caracteres.',
    );
    expect(validarJustificativa('Transferência de turno')).toBeNull();
  });
});
