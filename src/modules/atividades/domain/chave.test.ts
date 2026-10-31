import { afterEach, describe, expect, it, vi } from 'vitest';
import { novaChaveDeEnvio } from './chave';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('novaChaveDeEnvio (idempotência do envio)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gera UUID v4', () => {
    expect(novaChaveDeEnvio()).toMatch(UUID);
  });

  it('funciona fora de contexto seguro (sem crypto.randomUUID, ex.: http na rede local)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });
    const a = novaChaveDeEnvio();
    expect(a).toMatch(UUID);
    expect(novaChaveDeEnvio()).not.toBe(a);
  });
});
