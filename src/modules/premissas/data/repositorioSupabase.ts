import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar } from '@/shared/dados/erros';
import type { CatalogoDePremissas, RepositorioPremissas, Resposta } from '../domain/tipos';

/**
 * Repositório Supabase das premissas: uma RPC por operação (contracts/rpc.md). Permissão,
 * validação e concorrência ficam no servidor; nada é dado como registrado antes da resposta.
 */
export function criarRepositorioPremissasSupabase(sb: SupabaseClient): RepositorioPremissas {
  return {
    async premissas() {
      return verificar(await sb.rpc('premissas_em_validacao')) as CatalogoDePremissas;
    },
    async responder(e) {
      return verificar(
        await sb.rpc('responder_premissa', {
          p_codigo: e.codigo,
          p_decisao: e.decisao,
          p_justificativa: e.justificativa.trim(),
          p_resposta_base: e.respostaBase,
        }),
      ) as Resposta;
    },
  };
}
