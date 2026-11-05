import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ambiente } from './env';
let cliente: SupabaseClient | undefined;
export function obterSupabasePublico(): SupabaseClient {
  if (!ambiente.supabaseUrl || !ambiente.supabaseAnonKey)
    throw new Error('Supabase não configurado.');
  cliente ??= createClient(ambiente.supabaseUrl, ambiente.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'maratona-publico-sem-sessao',
    },
  });
  return cliente;
}
