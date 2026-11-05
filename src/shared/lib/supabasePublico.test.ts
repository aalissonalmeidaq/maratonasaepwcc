import { describe, expect, it, vi } from 'vitest';
vi.mock('./env', () => ({
  ambiente: {
    modo: 'supabase',
    supabaseUrl: 'http://localhost:54421',
    supabaseAnonKey: 'chave-publica-ficticia',
  },
}));
const { criar } = vi.hoisted(() => ({ criar: vi.fn(() => ({ rpc: vi.fn() })) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: criar }));
import { obterSupabasePublico } from './supabasePublico';
describe('transporte público sem sessão (FR-003/007)', () => {
  it('usa cliente independente sem persistência, renovação ou sessão da URL', () => {
    obterSupabasePublico();
    expect(criar).toHaveBeenCalledWith('http://localhost:54421', 'chave-publica-ficticia', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'maratona-publico-sem-sessao',
      },
    });
  });
});
