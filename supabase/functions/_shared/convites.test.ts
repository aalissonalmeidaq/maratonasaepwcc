import { describe, expect, it } from 'vitest';
import { gerarToken, hashDoToken, linkDePrimeiroAcesso } from './convites.ts';

describe('convites', () => {
  it('gera tokens de 32 bytes em base64url, sem repetir', () => {
    const tokens = new Set(Array.from({ length: 50 }, gerarToken));
    expect(tokens.size).toBe(50);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('guarda só o SHA-256 em hexadecimal', async () => {
    expect(await hashDoToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('monta o link com o token no fragmento (não vai para os logs do servidor)', () => {
    expect(linkDePrimeiroAcesso('http://localhost:5173/', 'abc_-1')).toBe(
      'http://localhost:5173/primeiro-acesso#t=abc_-1',
    );
  });
});
