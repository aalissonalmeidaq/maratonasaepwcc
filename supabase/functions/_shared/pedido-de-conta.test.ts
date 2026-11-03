import { describe, expect, it } from 'vitest';
import { linhaDeAtribuicao, validarPedidoDeConta } from './pedido-de-conta';

const base = {
  edicaoId: '10000000-0000-0000-0000-000000000001',
  nome: 'Ana Exemplo',
  email: 'ANA@exemplo.invalid',
};
const TURMA = '30000000-0000-0000-0000-000000000001';
const CURSO = '20000000-0000-0000-0000-000000000001';

describe('pedido de criação de conta (spec 002; mentor por curso na spec 010)', () => {
  it('aluno e docente exigem turma; e-mail fica em minúsculas', () => {
    expect(validarPedidoDeConta({ ...base, papel: 'aluno' })).toBe('Selecione a turma.');
    const ok = validarPedidoDeConta({ ...base, papel: 'docente', turmaId: TURMA });
    expect(ok).toMatchObject({ email: 'ana@exemplo.invalid', turmaId: TURMA, cursoId: null });
  });

  it('mentor exige curso e recusa turma (spec 010, FR-008)', () => {
    expect(validarPedidoDeConta({ ...base, papel: 'mentor' })).toBe('Selecione o curso do mentor.');
    expect(validarPedidoDeConta({ ...base, papel: 'mentor', turmaId: TURMA, cursoId: CURSO })).toBe(
      'Mentor é vinculado ao curso, não à turma.',
    );
    expect(validarPedidoDeConta({ ...base, papel: 'mentor', cursoId: CURSO })).toMatchObject({
      cursoId: CURSO,
      turmaId: null,
    });
  });

  it('a atribuição usa a turma ou o curso conforme o papel', () => {
    const mentor = validarPedidoDeConta({ ...base, papel: 'mentor', cursoId: CURSO });
    const aluno = validarPedidoDeConta({ ...base, papel: 'aluno', turmaId: TURMA });
    if (typeof mentor === 'string' || typeof aluno === 'string') throw new Error('inválido');
    expect(linhaDeAtribuicao(mentor, 'u1')).toEqual({
      usuario_id: 'u1',
      edicao_id: base.edicaoId,
      papel: 'mentor',
      turma_id: null,
      curso_id: CURSO,
    });
    expect(linhaDeAtribuicao(aluno, 'u2')).toMatchObject({ turma_id: TURMA, curso_id: null });
  });

  it('recusa senha provisória e papel inválido', () => {
    expect(validarPedidoDeConta({ ...base, papel: 'aluno', senhaProvisoria: 'x' })).toBe(
      'Campo não aceito: senhaProvisoria.',
    );
    expect(validarPedidoDeConta({ ...base, papel: 'coordenacao' })).toBe('Papel inválido.');
  });
});
