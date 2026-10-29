import { describe, expect, it } from 'vitest';
import { situacaoEncontro, validarEncontro } from './encontro';

const ctx = { quantidadeEncontros: 4, numerosExistentes: [1, 2] };
const valido = {
  numero: 3,
  titulo: 'Encontro 3',
  data: '2026-11-19',
  inicio: '13:30',
  fim: '17:00',
};

describe('validação de encontro (FR-007)', () => {
  it('aceita encontro válido', () => {
    expect(validarEncontro(valido, ctx)).toEqual({});
  });

  it('recusa término antes ou igual ao início', () => {
    expect(validarEncontro({ ...valido, inicio: '17:00', fim: '13:30' }, ctx).fim).toBe(
      'O término deve ser depois do início.',
    );
    expect(validarEncontro({ ...valido, inicio: '13:30', fim: '13:30' }, ctx).fim).toBeDefined();
  });

  it('permite horário a confirmar (sem início e término)', () => {
    expect(validarEncontro({ ...valido, inicio: '', fim: '' }, ctx)).toEqual({});
  });

  it('recusa número repetido, exceto o do próprio encontro em edição', () => {
    expect(validarEncontro({ ...valido, numero: 2 }, ctx).numero).toBe(
      'Já existe um encontro com esse número.',
    );
    expect(validarEncontro({ ...valido, numero: 2 }, { ...ctx, numeroAtual: 2 })).toEqual({});
  });

  it('recusa número acima da quantidade configurada na edição', () => {
    expect(validarEncontro({ ...valido, numero: 5 }, ctx).numero).toBe(
      'A edição está configurada com 4 encontros. Ajuste a configuração antes de criar o encontro 5.',
    );
  });

  it('exige título e data', () => {
    const erros = validarEncontro({ ...valido, titulo: ' ', data: '' }, ctx);
    expect(erros.titulo).toBe('Informe um título com pelo menos 3 caracteres.');
    expect(erros.data).toBe('Informe a data.');
  });
});

describe('situação do encontro', () => {
  const hoje = '2026-11-12';
  it.each([
    [{ data: '2026-11-05', estado: 'agendado' as const }, 'realizado'],
    [{ data: '2026-11-12', estado: 'agendado' as const }, 'hoje'],
    [{ data: '2026-11-19', estado: 'agendado' as const }, 'agendado'],
    [{ data: '2026-11-19', estado: 'cancelado' as const }, 'cancelado'],
    [{ data: '2026-11-19', estado: 'realizado' as const }, 'realizado'],
  ])('%o → %s', (e, esperado) => {
    expect(situacaoEncontro(e, hoje)).toBe(esperado);
  });
});
