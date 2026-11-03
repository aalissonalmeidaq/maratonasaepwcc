import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type {
  ComunicadoGerido,
  ComunicadoRecebido,
  RepositorioComunicados,
  ResultadoCorrecao,
  ResultadoPublicacao,
} from '../domain/tipos';

/**
 * Repositório Supabase dos comunicados: uma RPC por operação (contracts/rpc.md). Autoria,
 * público e avisos ficam no servidor; nada é dado como gravado antes da resposta.
 */
export function criarRepositorioComunicadosSupabase(sb: SupabaseClient): RepositorioComunicados {
  return {
    async comunicadosParaMim(edicaoId) {
      return verificar(
        await sb.rpc('comunicados_para_mim', { p_edicao: edicaoId }),
      ) as ComunicadoRecebido[];
    },
    async comunicadosQueGerencio(edicaoId) {
      return verificar(
        await sb.rpc('comunicados_que_gerencio', { p_edicao: edicaoId }),
      ) as ComunicadoGerido[];
    },
    async salvarComunicado(chave, id, edicaoId, e) {
      return verificar(
        await sb.rpc('salvar_comunicado', {
          p_chave: chave,
          p_id: id,
          p_edicao: edicaoId,
          p_titulo: e.titulo.trim(),
          p_texto: e.texto.trim(),
          p_publico: e.publico,
          p_turmas: e.turmaIds,
        }),
      ) as string;
    },
    async apagarRascunho(id) {
      verificarGravacao(await sb.rpc('apagar_rascunho', { p_id: id }));
    },
    async publicarComunicado(id) {
      return verificar(await sb.rpc('publicar_comunicado', { p_id: id })) as ResultadoPublicacao;
    },
    async corrigirComunicado(id, titulo, texto, justificativa) {
      return verificar(
        await sb.rpc('corrigir_comunicado', {
          p_id: id,
          p_titulo: titulo,
          p_texto: texto,
          p_justificativa: justificativa,
        }),
      ) as ResultadoCorrecao;
    },
    async retirarComunicado(id, justificativa) {
      verificarGravacao(
        await sb.rpc('retirar_comunicado', { p_id: id, p_justificativa: justificativa }),
      );
    },
    async marcarComunicadoLido(id) {
      return verificar(await sb.rpc('marcar_comunicado_lido', { p_id: id })) as number;
    },
  };
}
