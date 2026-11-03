import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarRepositorioEncontrosSupabase } from '@/modules/encontros';

describe('edição de registro removido', () => {
  it('não confirma atualização de ambiente sem registro retornado', async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: '0 rows' } });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const sb = { from: vi.fn().mockReturnValue({ update }) } as unknown as SupabaseClient;
    const encontros = criarRepositorioEncontrosSupabase(sb);
    const salvar = () =>
      encontros.salvarAmbiente('e1', { id: 'removido', nome: 'Sala', observacoes: null });
    await expect(salvar()).rejects.toThrow();
    expect(single).toHaveBeenCalledOnce();
  });
});
