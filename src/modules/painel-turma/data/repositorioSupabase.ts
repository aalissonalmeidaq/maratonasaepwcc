import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar } from '@/shared/dados/erros';
import type { PainelTurma, RepositorioPainelTurma } from '../domain/tipos';

/** Mensagens da spec 004 para os erros de acesso da RPC (research R3). */
const MENSAGENS: Record<string, string> = {
  '42501': 'Você não tem acesso a esta turma.',
  P0002: 'Turma não encontrada.',
  // Identificador inválido na rota.
  '22P02': 'Turma não encontrada.',
};

export function criarRepositorioPainelTurmaSupabase(sb: SupabaseClient): RepositorioPainelTurma {
  return {
    async painel(turmaId) {
      const resposta = await sb.rpc('painel_da_turma', { p_turma: turmaId });
      const codigo = (resposta.error as { code?: string } | null)?.code;
      const mensagem = codigo ? MENSAGENS[codigo] : undefined;
      if (mensagem) throw new Error(mensagem);
      const painel = verificar(resposta) as PainelTurma;
      return { ...painel, pontuacao: painel.pontuacao ?? null };
    },
  };
}
