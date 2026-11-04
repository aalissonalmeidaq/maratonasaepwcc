import type { SupabaseClient } from '@supabase/supabase-js';
import type { TipoOcorrencia } from '@/modules/pontuacao';
import { ErroDeDados, verificar, verificarGravacao } from '@/shared/dados/erros';
import type {
  Avisos,
  Ocorrencia,
  PedidoRevisao,
  PendenciasDoRanking,
  PontosDaEquipe,
  PremiacaoDaTurma,
  PublicacaoAnterior,
  PublicacaoRanking,
  RepositorioResultado,
  ResultadoLote,
  ResultadoProva,
  TurmaNoRanking,
  VersaoPublicada,
} from '../domain/tipos';

const BUCKET = 'evidencias';

const extensao = (nome: string) => {
  const m = /\.([a-z0-9]+)$/i.exec(nome);
  return m ? `.${m[1]!.toLowerCase()}` : '';
};

/** RPC que pode devolver `null` como resposta válida (ex.: sem publicação). */
function talvez<T>(resposta: { data: unknown; error: unknown }): T | null {
  if (resposta.error) throw new ErroDeDados(resposta.error);
  return (resposta.data ?? null) as T | null;
}

/**
 * Repositório Supabase do resultado oficial. Toda escrita passa por RPC transacional,
 * idempotente e auditada; a evidência em arquivo vai antes ao bucket privado `evidencias`.
 */
export function criarRepositorioResultadoSupabase(sb: SupabaseClient): RepositorioResultado {
  return {
    async resultadosProva(encontroId) {
      return verificar(
        await sb.rpc('resultados_prova', { p_encontro: encontroId }),
      ) as ResultadoProva[];
    },
    async registrarResultadosProva(d) {
      return verificar(
        await sb.rpc('registrar_resultados_prova', {
          p_encontro: d.encontroId,
          p_resultados: d.resultados,
          p_justificativa: d.justificativa ?? null,
          p_pedido: d.pedidoId ?? null,
        }),
      ) as number;
    },

    async tiposDeOcorrencia(edicaoId) {
      const dados = verificar(
        await sb.from('edicoes').select('regras').eq('id', edicaoId).single(),
      ) as { regras: { penalidades?: { tipos?: TipoOcorrencia[] } } };
      return dados.regras.penalidades?.tipos ?? [];
    },
    async ocorrencias(edicaoId, turmaId) {
      return verificar(
        await sb.rpc('ocorrencias_visiveis', { p_edicao: edicaoId, p_turma: turmaId ?? null }),
      ) as Ocorrencia[];
    },
    async registrarOcorrencia(d) {
      let caminho: string | null = null;
      if (d.arquivo) {
        // Caminho estável por tentativa: repetir o envio reaproveita o mesmo objeto.
        caminho = `${d.edicaoId}/${d.duplaId}/${d.chave}${extensao(d.arquivo.name)}`;
        const { error } = await sb.storage.from(BUCKET).upload(caminho, d.arquivo, {
          contentType: d.arquivo.type,
          upsert: false,
        });
        if (error && !/exist/i.test(error.message)) throw new ErroDeDados(error);
      }
      return verificar(
        await sb.rpc('registrar_ocorrencia', {
          p_chave: d.chave,
          p_encontro: d.encontroId,
          p_dupla: d.duplaId,
          p_tipo: d.tipo,
          p_fato: d.fato,
          p_evidencia: d.evidencia,
          p_desafio: d.desafioId ?? null,
          p_fato_chave: d.fatoChave?.trim() || null,
          p_evidencia_path: caminho,
          p_evidencia_nome: d.arquivo?.name ?? null,
        }),
      ) as { id: string; prazoManifestacao: string };
    },
    async urlEvidencia(caminho) {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(caminho, 300);
      if (error || !data) throw new ErroDeDados(error ?? { code: 'sem_dados', message: '' });
      return data.signedUrl;
    },
    async enviarManifestacao(ocorrenciaId, texto) {
      return verificar(
        await sb.rpc('enviar_manifestacao', { p_ocorrencia: ocorrenciaId, p_texto: texto }),
      ) as { enviadaEm: string };
    },
    async decidirOcorrencia(d) {
      verificarGravacao(
        await sb.rpc('decidir_ocorrencia', {
          p_ocorrencia: d.ocorrenciaId,
          p_resultado: d.resultado,
          p_justificativa: d.justificativa,
          p_apresentacao_dependente: d.apresentacaoDependente,
          p_pedido: d.pedidoId ?? null,
        }),
      );
    },
    async registrarExcecaoPrazo(d) {
      return verificar(
        await sb.rpc('registrar_excecao_prazo', {
          p_dupla: d.duplaId,
          p_objeto: d.objeto,
          p_ocorrencia: d.ocorrenciaId ?? null,
          p_publicacao: d.publicacaoId ?? null,
          p_novo_prazo: d.novoPrazo,
          p_justificativa: d.justificativa,
        }),
      ) as string;
    },

    async pontosDaMinhaEquipe(edicaoId) {
      return talvez<PontosDaEquipe>(await sb.rpc('pontos_da_minha_equipe', { p_edicao: edicaoId }));
    },
    async pontosDaTurma(turmaId) {
      return verificar(await sb.rpc('pontos_da_turma', { p_turma: turmaId })) as PontosDaEquipe[];
    },

    async rankingPublicado(edicaoId, categoria) {
      return talvez<PublicacaoRanking>(
        await sb.rpc('ranking_publicado', { p_edicao: edicaoId, p_categoria: categoria ?? null }),
      );
    },
    async historicoPublicacoes(edicaoId, categoria) {
      return verificar(
        await sb.rpc('historico_publicacoes', { p_edicao: edicaoId, p_categoria: categoria }),
      ) as VersaoPublicada[];
    },
    async publicacoesAnteriores(edicaoId) {
      return verificar(
        await sb.rpc('publicacoes_anteriores', { p_edicao: edicaoId }),
      ) as PublicacaoAnterior[];
    },

    async rankingDaEdicao(edicaoId) {
      return verificar(
        await sb.rpc('ranking_da_edicao', { p_edicao: edicaoId }),
      ) as TurmaNoRanking[];
    },
    async pendenciasRankingTurma(turmaId) {
      return verificar(
        await sb.rpc('pendencias_ranking_turma', { p_turma: turmaId }),
      ) as PendenciasDoRanking;
    },
    async publicarRankingTurmas(d) {
      // A resposta lista o resultado de cada turma: só o servidor diz o que foi publicado.
      return verificar(
        await sb.rpc('publicar_ranking_turmas', {
          p_edicao: d.edicaoId,
          p_turmas: d.turmas.map((t) => ({ turmaId: t.turmaId, versaoBase: t.versaoBase })),
          p_estado: d.estado,
          p_justificativa: d.justificativa?.trim() || null,
        }),
      ) as ResultadoLote;
    },
    async rankingDaTurma(turmaId) {
      return talvez<PublicacaoRanking>(await sb.rpc('ranking_da_turma', { p_turma: turmaId }));
    },
    async historicoPublicacoesTurma(turmaId) {
      return verificar(
        await sb.rpc('historico_publicacoes_turma', { p_turma: turmaId }),
      ) as VersaoPublicada[];
    },
    async premiacaoDaEdicao(edicaoId) {
      return verificar(
        await sb.rpc('premiacao_da_edicao', { p_edicao: edicaoId }),
      ) as PremiacaoDaTurma[];
    },
    async decidirPremiacaoEmpate(d) {
      return verificar(
        await sb.rpc('decidir_premiacao_empate', {
          p_publicacao: d.publicacaoId,
          p_posicao: d.posicao,
          p_premiadas: d.premiadas,
          p_decisao: d.decisao,
          p_justificativa: d.justificativa,
        }),
      ) as { id: string; decididoEm: string };
    },

    async pedirRevisao(d) {
      return verificar(
        await sb.rpc('pedir_revisao', {
          p_chave: d.chave,
          p_objeto: d.objeto,
          p_ocorrencia: d.ocorrenciaId ?? null,
          p_publicacao: d.publicacaoId ?? null,
          p_componente: d.componente ?? null,
          p_encontro: d.encontroId ?? null,
          p_justificativa: d.justificativa,
        }),
      ) as { id: string; criadoEm: string };
    },
    async responderRevisao(d) {
      verificarGravacao(
        await sb.rpc('responder_revisao', {
          p_pedido: d.pedidoId,
          p_resposta: d.resposta,
          p_justificativa: d.justificativa,
        }),
      );
    },
    async pedidosRevisao(edicaoId) {
      return verificar(await sb.rpc('pedidos_revisao', { p_edicao: edicaoId })) as PedidoRevisao[];
    },

    async meusAvisos() {
      return verificar(await sb.rpc('meus_avisos', { p_limite: 50 })) as Avisos;
    },
    async marcarAvisosLidos(ids) {
      return verificar(await sb.rpc('marcar_avisos_lidos', { p_ids: ids })) as number;
    },
  };
}
