import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ambiente } from './env';

let cliente: SupabaseClient | null = null;

/**
 * Cliente com a chave pública. Toda autorização efetiva é feita por RLS no banco;
 * este cliente não tem privilégios além dos da pessoa autenticada.
 */
export function obterSupabase(): SupabaseClient {
  if (ambiente.modo !== 'supabase' || !ambiente.supabaseUrl || !ambiente.supabaseAnonKey) {
    throw new Error('Supabase não configurado. Veja .env.example e o README.');
  }
  cliente ??= createClient(ambiente.supabaseUrl, ambiente.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cliente;
}
