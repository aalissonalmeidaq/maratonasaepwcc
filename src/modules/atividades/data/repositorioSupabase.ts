import type { SupabaseClient } from '@supabase/supabase-js';
import { verificar, verificarGravacao } from '@/shared/dados/erros';
import type {
  AtividadesDaTurma,
  Comprovante,
  Desafio,
  LancamentosDaEquipe,
  ListaParaEquipe,
  ListaQuestoes,
  PainelAvaliacao,
  PresencaDaTurma,
  RepositorioAtividades,
} from '../domain/tipos';

const BUCKET = 'entregas';

interface LinhaDesafio {
  id: string;
  edicao_id: string;
  encontro_id: string;
  titulo: string;
  enunciado: string;
  recursos_permitidos: string;
  politica_ia: string;
  prazo: string;
  aceita_arquivo: boolean;
  aceita_link: boolean;
  estado: Desafio['estado'];
  desafio_turmas: { turma_id: string }[];
}

const paraDesafio = (l: LinhaDesafio): Desafio => ({
  id: l.id,
  edicaoId: l.edicao_id,
  encontroId: l.encontro_id,
  titulo: l.titulo,
  enunciado: l.enunciado,
  recursosPermitidos: l.recursos_permitidos,
  politicaIa: l.politica_ia,
  prazo: l.prazo,
  aceitaArquivo: l.aceita_arquivo,
  aceitaLink: l.aceita_link,
  estado: l.estado,
  turmas: l.desafio_turmas.map((t) => t.turma_id),
});

interface LinhaLista {
  id: string;
  edicao_id: string;
  encontro_id: string;
  titulo: string;
  prazo: string;
  estado: ListaQuestoes['estado'];
  versao: number;
  lista_turmas: { turma_id: string }[];
  questoes: {
    ordem: number;
    enunciado: string;
    justificativa: string;
    capacidade: string;
    alternativas: { ordem: number; texto: string; correta: boolean }[];
  }[];
}

const porOrdem = <T extends { ordem: number }>(a: T, b: T) => a.ordem - b.ordem;

const paraLista = (l: LinhaLista): ListaQuestoes => ({
  id: l.id,
  edicaoId: l.edicao_id,
  encontroId: l.encontro_id,
  titulo: l.titulo,
  prazo: l.prazo,
  estado: l.estado,
  versao: l.versao,
  turmas: l.lista_turmas.map((t) => t.turma_id),
  questoes: [...l.questoes].sort(porOrdem).map((q) => ({
    enunciado: q.enunciado,
    justificativa: q.justificativa,
    capacidade: q.capacidade,
    alternativas: [...q.alternativas]
      .sort(porOrdem)
      .map((a) => ({ texto: a.texto, correta: a.correta })),
  })),
});

const extensao = (nome: string) => {
  const m = /\.([a-z0-9]+)$/i.exec(nome);
  return m ? `.${m[1]!.toLowerCase()}` : '';
};

/** Repositório Supabase das atividades (spec 006). Toda escrita passa por RPC. */
export function criarRepositorioAtividadesSupabase(sb: SupabaseClient): RepositorioAtividades {
  return {
    async desafiosDaGestao(edicaoId) {
      const linhas = verificar(
        await sb
          .from('desafios')
          .select(
            'id, edicao_id, encontro_id, titulo, enunciado, recursos_permitidos, politica_ia, prazo, aceita_arquivo, aceita_link, estado, desafio_turmas(turma_id)',
          )
          .eq('edicao_id', edicaoId)
          .order('prazo'),
      ) as unknown as LinhaDesafio[];
      return linhas.map(paraDesafio);
    },
    async salvarDesafio(d) {
      return verificar(
        await sb.rpc('salvar_desafio', {
          p_id: d.id ?? null,
          p_encontro: d.encontroId,
          p_turmas: d.turmas,
          p_titulo: d.titulo.trim(),
          p_enunciado: d.enunciado.trim(),
          p_recursos: d.recursosPermitidos.trim(),
          p_politica_ia: d.politicaIa.trim(),
          p_prazo: d.prazo,
          p_aceita_arquivo: d.aceitaArquivo,
          p_aceita_link: d.aceitaLink,
        }),
      ) as string;
    },
    async publicarDesafio(id) {
      verificarGravacao(await sb.rpc('publicar_desafio', { p_id: id }));
    },
    async encerrarDesafio(id) {
      verificarGravacao(await sb.rpc('encerrar_desafio', { p_id: id }));
    },
    async registrarProrrogacao(p) {
      verificarGravacao(
        await sb.rpc('registrar_prorrogacao', {
          p_desafio: p.desafioId,
          p_dupla: p.duplaId,
          p_novo_prazo: p.novoPrazo,
          p_justificativa: p.justificativa,
        }),
      );
    },

    async atividadesDaTurma(turmaId) {
      return verificar(
        await sb.rpc('atividades_da_turma', { p_turma: turmaId }),
      ) as AtividadesDaTurma;
    },
    async enviarEntrega(envio) {
      let arquivo: string | null = null;
      if (envio.arquivo) {
        // Caminho estável por tentativa: repetir o envio reaproveita o mesmo objeto (idempotência).
        arquivo = `${envio.desafioId}/${envio.duplaId}/${envio.chave}${extensao(envio.arquivo.name)}`;
        const { error } = await sb.storage.from(BUCKET).upload(arquivo, envio.arquivo, {
          contentType: envio.arquivo.type,
          upsert: false,
        });
        // Objeto já existente desta mesma tentativa: segue para o registro (repetição segura).
        if (error && !/exist/i.test(error.message)) throw error;
      }
      return verificar(
        await sb.rpc('registrar_entrega', {
          p_desafio: envio.desafioId,
          p_chave: envio.chave,
          p_arquivo: arquivo,
          p_arquivo_nome: envio.arquivo?.name ?? null,
          p_link: envio.link?.trim() || null,
        }),
      ) as Comprovante;
    },
    async urlArquivo(caminho) {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(caminho, 300);
      if (error || !data) throw error ?? new Error('Arquivo indisponível.');
      return data.signedUrl;
    },

    async presencasDaTurma(encontroId, turmaId) {
      return verificar(
        await sb.rpc('presencas_da_turma', { p_encontro: encontroId, p_turma: turmaId }),
      ) as PresencaDaTurma;
    },
    async registrarPresencas(p) {
      verificarGravacao(
        await sb.rpc('registrar_presencas', {
          p_encontro: p.encontroId,
          p_turma: p.turmaId,
          p_registros: p.registros,
          p_justificativa: p.justificativa ?? null,
        }),
      );
    },
    async registrarParticipacao(p) {
      verificarGravacao(
        await sb.rpc('registrar_participacao', {
          p_encontro: p.encontroId,
          p_dupla: p.duplaId,
          p_notas: p.notas,
          p_justificativa: p.justificativa ?? null,
        }),
      );
    },

    async painelAvaliacao(desafioId) {
      return verificar(
        await sb.rpc('painel_avaliacao', { p_desafio: desafioId }),
      ) as PainelAvaliacao;
    },
    async registrarAvaliacao(a) {
      verificarGravacao(
        await sb.rpc('registrar_avaliacao', {
          p_desafio: a.desafioId,
          p_dupla: a.duplaId,
          p_notas_entrega: a.notasEntrega,
          p_notas_apresentacao: a.notasApresentacao,
          p_apresentacao_nao_avaliavel: a.apresentacaoNaoAvaliavel,
          p_feedback: a.feedback.trim() || null,
          p_justificativa: a.justificativa ?? null,
        }),
      );
    },

    async listasDaGestao(edicaoId) {
      const linhas = verificar(
        await sb
          .from('listas_questoes')
          .select(
            'id, edicao_id, encontro_id, titulo, prazo, estado, versao, lista_turmas(turma_id), questoes(ordem, enunciado, justificativa, capacidade, alternativas(ordem, texto, correta))',
          )
          .eq('edicao_id', edicaoId)
          .order('prazo'),
      ) as unknown as LinhaLista[];
      return linhas.map(paraLista);
    },
    async salvarLista(l) {
      return verificar(
        await sb.rpc('salvar_lista', {
          p_id: l.id ?? null,
          p_encontro: l.encontroId,
          p_turmas: l.turmas,
          p_titulo: l.titulo.trim(),
          p_prazo: l.prazo,
          p_questoes: l.questoes,
        }),
      ) as string;
    },
    async publicarLista(id) {
      verificarGravacao(await sb.rpc('publicar_lista', { p_id: id }));
    },
    async encerrarLista(id) {
      verificarGravacao(await sb.rpc('encerrar_lista', { p_id: id }));
    },
    async listaParaEquipe(listaId) {
      return verificar(await sb.rpc('lista_para_equipe', { p_lista: listaId })) as ListaParaEquipe;
    },
    async enviarRespostas(r) {
      return verificar(
        await sb.rpc('enviar_respostas', {
          p_lista: r.listaId,
          p_chave: r.chave,
          p_respostas: r.respostas,
        }),
      ) as { enviadaEm: string; autorNome: string };
    },

    async lancamentosDaMinhaEquipe(edicaoId) {
      return verificar(
        await sb.rpc('lancamentos_da_minha_equipe', { p_edicao: edicaoId }),
      ) as LancamentosDaEquipe;
    },
  };
}
