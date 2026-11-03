import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar } from '@/shared/dados/erros';
import type {
  PainelDaCoordenacao,
  PainelDaGestao,
  PainelDoAluno,
  Relatorio,
  RepositorioPaineis,
} from '../domain/tipos';

/**
 * Repositório Supabase dos painéis e relatórios: uma RPC por tela. A autorização e o registro
 * da exportação ficam no servidor; o CSV é gerado no navegador só depois da resposta.
 */
export function criarRepositorioPaineisSupabase(sb: SupabaseClient): RepositorioPaineis {
  return {
    async painelDoAluno(edicaoId) {
      return verificar(await sb.rpc('painel_do_aluno', { p_edicao: edicaoId })) as PainelDoAluno;
    },
    async painelDaGestao(edicaoId) {
      return verificar(await sb.rpc('painel_da_gestao', { p_edicao: edicaoId })) as PainelDaGestao;
    },
    async painelDaCoordenacao(edicaoId) {
      return verificar(
        await sb.rpc('painel_da_coordenacao', { p_edicao: edicaoId }),
      ) as PainelDaCoordenacao;
    },
    async relatorio(tipo, f) {
      return verificar(
        await sb.rpc('relatorio', {
          p_tipo: tipo,
          p_edicao: f.edicaoId,
          p_categoria: f.categoria,
          p_turma: f.turmaId,
          p_encontro: f.encontroId,
        }),
      ) as Relatorio;
    },
  };
}
