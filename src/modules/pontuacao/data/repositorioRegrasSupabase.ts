import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type {
  ItemHistorico,
  RegrasDaEdicaoVigentes,
  RegrasDaTurma,
  RepositorioRegras,
} from '../domain/regrasTipos';

/** Repositório Supabase das regras (spec 011): uma RPC por operação (contracts/rpc.md). */
export function criarRepositorioRegrasSupabase(sb: SupabaseClient): RepositorioRegras {
  return {
    async regrasDaEdicaoVigentes(edicaoId) {
      return verificar(
        await sb.rpc('regras_da_edicao_vigentes', { p_edicao: edicaoId }),
      ) as RegrasDaEdicaoVigentes;
    },
    async regrasDaTurma(turmaId) {
      return verificar(await sb.rpc('regras_da_turma', { p_turma: turmaId })) as RegrasDaTurma;
    },
    async historico(edicaoId, turmaId) {
      return verificar(
        await sb.rpc('historico_regras', { p_edicao: edicaoId, p_turma: turmaId }),
      ) as ItemHistorico[];
    },
    async gravarRegras(edicaoId, versaoBase, rotulo, regras, justificativa) {
      return verificar(
        await sb.rpc('gravar_regras', {
          p_edicao: edicaoId,
          p_versao_base: versaoBase,
          p_rotulo: rotulo.trim(),
          p_regras: regras,
          p_justificativa: justificativa.trim(),
        }),
      ) as { rotulo: string; valeDesde: string; nova: boolean };
    },
    async gravarAjustesTurma(turmaId, ajusteBase, grupos, justificativa) {
      return verificar(
        await sb.rpc('gravar_ajustes_turma', {
          p_turma: turmaId,
          p_ajuste_base: ajusteBase,
          p_grupos: grupos,
          p_justificativa: justificativa.trim(),
        }),
      ) as { ajusteId: string; valeDesde: string; novo: boolean };
    },
    async definirEncontrosDaTurma(turmaId, excluidos) {
      verificarGravacao(
        await sb.rpc('definir_encontros_da_turma', { p_turma: turmaId, p_excluidos: excluidos }),
      );
    },
  };
}
