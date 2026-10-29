import { describe, expect, it } from 'vitest';
import { resolverAmbiente } from './env';

const supabase = {
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY: 'chave-publica-ficticia',
};

describe('resolverAmbiente', () => {
  it('usa o Supabase quando URL e chave pública estão configuradas', () => {
    expect(resolverAmbiente({ ...supabase, DEV: false }).modo).toBe('supabase');
  });

  it('modo demonstração só quando pedido explicitamente', () => {
    expect(resolverAmbiente({ ...supabase, VITE_DEMO_MODE: 'true', DEV: false }).modo).toBe('demo');
  });

  it('em desenvolvimento sem Supabase, cai no modo demonstração', () => {
    expect(resolverAmbiente({ DEV: true }).modo).toBe('demo');
  });

  it('em build de produção sem Supabase e sem pedido explícito, não ativa a demonstração', () => {
    expect(resolverAmbiente({ DEV: false }).modo).toBe('nao-configurado');
  });

  it('recusa chave service_role no frontend', () => {
    // JWT fictício cujo payload declara role=service_role.
    const payload = btoa(JSON.stringify({ role: 'service_role' }));
    expect(() =>
      resolverAmbiente({ ...supabase, VITE_SUPABASE_ANON_KEY: `x.${payload}.y`, DEV: false }),
    ).toThrow(/service_role/);
  });
});
