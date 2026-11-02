/**
 * Resultado oficial da DEMONSTRAÇÃO (spec 007): prévia, ranking parcial, uma ocorrência e um
 * aviso, todos fictícios. Toda escrita é recusada, pois não há servidor para confirmar
 * (Constituição VII). A visibilidade por perfil é só emulada: a segurança real está no servidor.
 */
import {
  acumularEncontros,
  calcularEncontro,
  classificar,
  type ComponentePendente,
} from '@/modules/pontuacao';
import type {
  Aviso,
  Ocorrencia,
  PontosDaEquipe,
  PublicacaoRanking,
  RepositorioResultado,
} from '@/modules/resultado';
import { cursos, duplas, edicao, encontros, lancamentos, pessoas, turmas } from './dados';

const recusar = async (): Promise<never> => {
  throw new Error('Indisponível no modo demonstração: nenhuma alteração é gravada.');
};

const PUBLICADO_EM = new Date(Date.now() - 2 * 86_400_000).toISOString();
const categoriaDaTurma = (turmaId: string) =>
  cursos.find((c) => c.id === turmas.find((t) => t.id === turmaId)?.cursoId)?.categoria ?? '';

function pontosDa(d: (typeof duplas)[number]): PontosDaEquipe {
  const porEncontro = encontros.map((en) => {
    const l = lancamentos[d.id]?.[en.id];
    const pontuacao = l
      ? calcularEncontro(l, edicao.regras)
      : {
          presenca: 0,
          participacao: 0,
          avaliacaoObjetiva: 0,
          entrega: 0,
          apresentacao: 0,
          descontos: 0,
          total: 0,
          pendencias: [
            'participacao',
            'avaliacaoObjetiva',
            'entrega',
            'apresentacao',
          ] as ComponentePendente[],
        };
    return { encontroId: en.id, numero: en.numero, titulo: en.titulo, pontuacao };
  });
  return {
    duplaId: d.id,
    nome: d.nome,
    totais: acumularEncontros(porEncontro.map((p) => p.pontuacao)),
    encontros: porEncontro,
  };
}

const OCORRENCIA: Ocorrencia = {
  id: 'oc-demo-1',
  edicaoId: edicao.id,
  encontroId: 'en1',
  encontroNumero: 1,
  duplaId: 'd1',
  duplaNome: 'Dupla Órbita',
  turmaId: 't-a',
  desafioId: null,
  tipo: 'reincidencia',
  tipoRotulo: 'Reincidência após orientação registrada',
  fato: 'Ocorrência fictícia da demonstração: uso de celular após orientação registrada.',
  evidencia: 'Relato fictício da docente.',
  evidenciaPath: null,
  evidenciaNome: null,
  estado: 'registrada',
  prazoManifestacao: new Date(Date.now() + 20 * 3_600_000).toISOString(),
  criadoEm: new Date(Date.now() - 4 * 3_600_000).toISOString(),
  autorNome: 'Profa. Lúcia Exemplo',
  manifestacao: null,
  decisao: null,
  prazoRevisao: null,
};

export function criarResultadoDemo(usuarioAtual: () => string | null): RepositorioResultado {
  const eu = () => pessoas.find((p) => p.id === usuarioAtual());
  const coordena = () => eu()?.papeis.includes('coordenacao') ?? false;
  const minhaDupla = () => duplas.find((d) => d.integrantes.includes(usuarioAtual() as never));
  const minhasTurmas = () => (coordena() ? turmas.map((t) => t.id) : (eu()?.turmas ?? []));

  function publicacao(categoria: string): PublicacaoRanking {
    const minha = minhaDupla();
    const daCategoria = duplas.filter((d) => categoriaDaTurma(d.turmaId) === categoria);
    const pontos = daCategoria.map(pontosDa);
    const gestao = !minha;
    return {
      id: `pub-${categoria}`,
      categoria,
      versao: 1,
      estado: edicao.estadoRanking,
      publicadoEm: PUBLICADO_EM,
      revisaoAte: null,
      posicoes: classificar(
        pontos.map((p) => ({ duplaId: p.duplaId, nome: p.nome, totais: p.totais })),
      ).map((pos) => {
        const p = pontos.find((x) => x.duplaId === pos.duplaId)!;
        const eMinha = minha?.id === pos.duplaId;
        return {
          duplaId: pos.duplaId,
          nome: pos.nome,
          posicao: pos.posicao,
          compartilhada: pos.compartilhada,
          total: pos.totais.total,
          pendente: pos.totais.pendente,
          minha: eMinha,
          ...(eMinha || gestao ? { detalhe: p.encontros } : {}),
        };
      }),
    };
  }

  return {
    async resultadosProva() {
      if (!coordena()) throw new Error('Você não tem permissão para esta operação.');
      return [];
    },
    registrarResultadosProva: recusar,

    async tiposDeOcorrencia() {
      return edicao.regras.penalidades.tipos;
    },
    async ocorrencias() {
      const visivel =
        coordena() ||
        minhasTurmas().includes(OCORRENCIA.turmaId) ||
        minhaDupla()?.id === OCORRENCIA.duplaId;
      const aluno = eu()?.papeis.includes('aluno');
      return visivel && (!aluno || minhaDupla()?.id === OCORRENCIA.duplaId) ? [OCORRENCIA] : [];
    },
    registrarOcorrencia: recusar,
    urlEvidencia: recusar,
    enviarManifestacao: recusar,
    decidirOcorrencia: recusar,
    registrarExcecaoPrazo: recusar,

    async pontosDaMinhaEquipe() {
      const d = minhaDupla();
      return d ? pontosDa(d) : null;
    },
    async pontosDaTurma(turmaId) {
      if (!minhasTurmas().includes(turmaId))
        throw new Error('Você não tem permissão para esta operação.');
      return duplas.filter((d) => d.turmaId === turmaId).map(pontosDa);
    },

    async pendenciasDaCategoria(_edicaoId, categoria) {
      const componentes = duplas
        .filter((d) => categoriaDaTurma(d.turmaId) === categoria)
        .flatMap((d) =>
          pontosDa(d).encontros.flatMap((e) =>
            e.pontuacao.pendencias.map((componente) => ({
              duplaId: d.id,
              duplaNome: d.nome,
              encontroNumero: e.numero,
              componente,
            })),
          ),
        );
      const ocorrencias =
        categoriaDaTurma(OCORRENCIA.turmaId) === categoria
          ? [{ id: OCORRENCIA.id, duplaNome: OCORRENCIA.duplaNome, estado: OCORRENCIA.estado }]
          : [];
      return { componentes, ocorrencias, revisoes: [] };
    },
    publicarRanking: recusar,
    async rankingPublicado(_edicaoId, categoria) {
      const minha = minhaDupla();
      const alvo = minha ? categoriaDaTurma(minha.turmaId) : categoria;
      return alvo ? publicacao(alvo) : null;
    },
    async historicoPublicacoes() {
      return [
        {
          id: 'pub-demo',
          versao: 1,
          estado: edicao.estadoRanking,
          publicadoEm: PUBLICADO_EM,
          publicadoPorNome: 'Coordenação (fictícia)',
          justificativa: null,
          revisaoAte: null,
        },
      ];
    },

    pedirRevisao: recusar,
    responderRevisao: recusar,
    async pedidosRevisao() {
      return [];
    },

    async meusAvisos() {
      const itens: Aviso[] = [
        {
          id: 'av-demo-ranking',
          tipo: 'ranking_publicado',
          titulo: 'Ranking parcial publicado (fictício)',
          referencia: {},
          criadoEm: PUBLICADO_EM,
          lidoEm: null,
        },
      ];
      if (minhaDupla()?.id === OCORRENCIA.duplaId) {
        itens.unshift({
          id: 'av-demo-ocorrencia',
          tipo: 'ocorrencia_registrada',
          titulo: 'Nova ocorrência registrada para a sua equipe (fictícia)',
          referencia: { ocorrenciaId: OCORRENCIA.id },
          criadoEm: OCORRENCIA.criadoEm,
          lidoEm: null,
        });
      }
      return { naoLidos: itens.length, itens };
    },
    marcarAvisosLidos: recusar,
  };
}
