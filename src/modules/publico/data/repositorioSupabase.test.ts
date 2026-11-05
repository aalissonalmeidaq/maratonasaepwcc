import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { regulamentoPublicoFixture as fixture } from '@/test/fixtures/regulamentoPublico';
import { criarRepositorioPublicoSupabase } from './repositorioSupabase';
describe('contrato público (FR-002/003)', () => {
  it('projeta somente os campos públicos também dentro das regras', async () => {
    const data = structuredClone(fixture);
    Object.assign(data.edicoes[0]!.regras.presenca, { privado: 'SEGREDO' });
    Object.assign(data.edicoes[0]!, { ambiente: 'SEGREDO' });
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    const r = criarRepositorioPublicoSupabase({ rpc } as unknown as SupabaseClient);
    expect(JSON.stringify(await r.regulamentoPublico())).not.toContain('SEGREDO');
    expect(rpc).toHaveBeenCalledWith('regulamento_publico');
  });
  it('recusa schema inválido e não converte HTTP em vazio', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'HTTP 500' } });
    const r = criarRepositorioPublicoSupabase({ rpc } as unknown as SupabaseClient);
    await expect(r.regulamentoPublico()).rejects.toThrow();
    await expect(r.regulamentoPublico()).rejects.toThrow('Não foi possível');
  });
});
