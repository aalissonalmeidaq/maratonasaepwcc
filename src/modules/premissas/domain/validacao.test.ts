import { describe, expect, it } from 'vitest';
import { LIMITE_JUSTIFICATIVA, validarResposta } from './validacao';

describe('validação da resposta à premissa (spec 015, FR-006)', () => {
  it('decisão obrigatória', () => {
    expect(
      validarResposta({ decisao: null, justificativa: 'Conferido com o regulamento.' }),
    ).toEqual({
      decisao: 'Escolha "Confirmada" ou "Precisa mudar".',
    });
  });

  it('justificativa de 10 a 2.000 caracteres, sem contar espaços nas pontas', () => {
    expect(validarResposta({ decisao: 'confirmada', justificativa: '   curta   ' })).toEqual({
      justificativa: 'Justifique com 10 a 2.000 caracteres.',
    });
    expect(
      validarResposta({
        decisao: 'confirmada',
        justificativa: 'a'.repeat(LIMITE_JUSTIFICATIVA + 1),
      }),
    ).toEqual({
      justificativa: 'Justifique com 10 a 2.000 caracteres.',
    });
    expect(
      validarResposta({ decisao: 'precisa_mudar', justificativa: ' Usar uma casa. ' }),
    ).toEqual({});
    expect(LIMITE_JUSTIFICATIVA).toBe(2000);
  });
});
