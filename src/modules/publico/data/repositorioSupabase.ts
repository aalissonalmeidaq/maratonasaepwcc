import type { SupabaseClient } from '@supabase/supabase-js';
import type { RepositorioPublico } from '../domain/tipos';
import { regulamentoPublicoSchema } from '../domain/validacao';
export function criarRepositorioPublicoSupabase(sb: SupabaseClient): RepositorioPublico {
  return {
    async regulamentoPublico() {
      const { data, error } = await sb.rpc('regulamento_publico');
      if (error) {
        // O SDK converte falhas de fetch em PostgrestError; não confundir HTTP com rede.
        if (error.details?.includes('TypeError') || error.message.startsWith('TypeError:'))
          throw new TypeError('Sem acesso à rede.');
        throw new Error('Não foi possível carregar o regulamento. Tente novamente.');
      }
      return regulamentoPublicoSchema.parse(data);
    },
  };
}
