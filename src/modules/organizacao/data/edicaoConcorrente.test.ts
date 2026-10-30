import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarRepositorioOrganizacaoSupabase } from './repositorioSupabase';
import { criarRepositorioEncontrosSupabase } from '@/modules/encontros';

describe('edição de registro removido', () => {
  it.each(['curso', 'turma', 'ambiente'])(
    'não confirma atualização de %s sem registro retornado',
    async (tipo) => {
      const single = vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: '0 rows' } });
      const select = vi.fn().mockReturnValue({ single });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      const sb = { from: vi.fn().mockReturnValue({ update }) } as unknown as SupabaseClient;
      const org = criarRepositorioOrganizacaoSupabase(sb);
      const encontros = criarRepositorioEncontrosSupabase(sb);
      const salvar =
        tipo === 'curso'
          ? () =>
              org.salvarCurso({
                id: 'removido',
                edicaoId: 'e1',
                nome: 'Curso',
                categoria: 'Técnico',
              })
          : tipo === 'turma'
            ? () =>
                org.salvarTurma({ id: 'removido', cursoId: 'c1', nome: 'Turma', anoLetivo: 2026 })
            : () =>
                encontros.salvarAmbiente('e1', { id: 'removido', nome: 'Sala', observacoes: null });
      await expect(salvar()).rejects.toThrow();
      expect(single).toHaveBeenCalledOnce();
    },
  );
});
