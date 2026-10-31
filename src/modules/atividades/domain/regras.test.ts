import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from '@/modules/pontuacao';
import {
  LIMITE_ARQUIVO_BYTES,
  atrasoPrevisto,
  situacaoDesafio,
  validarArquivo,
  validarLink,
} from './regras';

const MB = 1024 * 1024;

describe('validarArquivo (FR-003)', () => {
  it('aceita PDF, ZIP, PNG e JPG até 50 MB', () => {
    expect(LIMITE_ARQUIVO_BYTES).toBe(50 * MB);
    for (const type of ['application/pdf', 'application/zip', 'image/png', 'image/jpeg']) {
      expect(validarArquivo({ name: 'a', size: MB, type })).toBeNull();
    }
    expect(
      validarArquivo({ name: 'a.zip', size: 10, type: 'application/x-zip-compressed' }),
    ).toBeNull();
  });

  it('recusa tipo não aceito e arquivo acima do limite', () => {
    expect(validarArquivo({ name: 'a.txt', size: 10, type: 'text/plain' })).toBe(
      'Tipo de arquivo não aceito: envie PDF, ZIP, PNG ou JPG.',
    );
    expect(validarArquivo({ name: 'a.pdf', size: 50 * MB + 1, type: 'application/pdf' })).toBe(
      'O arquivo passa do limite de 50 MB.',
    );
    expect(validarArquivo({ name: 'a.pdf', size: 0, type: 'application/pdf' })).toBe(
      'O arquivo está vazio.',
    );
  });
});

describe('validarLink', () => {
  it('só http ou https, sem espaços', () => {
    expect(validarLink('https://exemplo.invalid/x')).toBeNull();
    expect(validarLink(' http://a.b ')).toBeNull();
    expect(validarLink('ftp://a.b')).toBe('Informe um link válido (http ou https).');
    expect(validarLink('https://a b')).toBe('Informe um link válido (http ou https).');
  });
});

describe('atrasoPrevisto (FR-006, regras da edição)', () => {
  const prazo = '2026-11-05T16:30:00-03:00';
  const em = (minutos: number) => new Date(new Date(prazo).getTime() + minutos * 60_000);

  it('no prazo: sem atraso', () => {
    expect(atrasoPrevisto(prazo, em(-1), REGRAS_PILOTO)).toEqual({
      minutos: 0,
      desconto: 0,
      aceita: true,
    });
  });
  it('faixas de desconto e limite', () => {
    expect(atrasoPrevisto(prazo, em(10), REGRAS_PILOTO)).toEqual({
      minutos: 10,
      desconto: 2,
      aceita: true,
    });
    expect(atrasoPrevisto(prazo, em(30), REGRAS_PILOTO)).toEqual({
      minutos: 30,
      desconto: 5,
      aceita: true,
    });
    expect(atrasoPrevisto(prazo, em(31), REGRAS_PILOTO)).toEqual({
      minutos: 31,
      desconto: 0,
      aceita: false,
    });
  });
  it('fração de minuto conta como minuto (mesma regra do servidor)', () => {
    expect(
      atrasoPrevisto(prazo, new Date(new Date(prazo).getTime() + 1000), REGRAS_PILOTO).minutos,
    ).toBe(1);
  });
});

describe('situacaoDesafio (FR-027)', () => {
  const base = { prazoEfetivo: '2026-11-05T16:30:00-03:00', encerrado: false };
  const em = (minutos: number) =>
    new Date(new Date(base.prazoEfetivo).getTime() + minutos * 60_000);

  it('aberto antes do prazo, "prazo encerrado" na tolerância, encerrado depois', () => {
    expect(situacaoDesafio(base, em(-5), REGRAS_PILOTO)).toBe('aberto');
    expect(situacaoDesafio(base, em(5), REGRAS_PILOTO)).toBe('prazo_encerrado');
    expect(situacaoDesafio(base, em(31), REGRAS_PILOTO)).toBe('encerrado');
  });
  it('o servidor manda: encerrado é encerrado', () => {
    expect(situacaoDesafio({ ...base, encerrado: true }, em(-5), REGRAS_PILOTO)).toBe('encerrado');
  });
});
