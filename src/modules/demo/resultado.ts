/**
 * Resultado oficial da DEMONSTRAÇÃO (specs 007 e 012): prévia, ranking por turma (3º ano A com a
 * definitiva e empate no 1º lugar; 3º ano B sem publicação), uma publicação por categoria
 * anterior, uma ocorrência e um aviso, todos fictícios. Toda escrita é recusada, pois não há servidor para confirmar
 * (Constituição VII). A visibilidade por perfil é só emulada: a segurança real está no servidor.
 */
import {
  acumularEncontros,
  calcularEncontro,
  classificar,
  type ComponentePendente,
} from '@/modules/pontuacao';
import {
  premiacaoDaTurma,
  type Aviso,
  type EstadoRanking,
  type Ocorrencia,
  type PendenciasDoRanking,
  type PontosDaEquipe,
  type PublicacaoRanking,
  type RepositorioResultado,
  type VersaoPublicada,
} from '@/modules/resultado';
import { cursos, duplas, edicao, encontros, lancamentos, pessoas, turmas } from './dados';

const recusar = async (): Promise<never> => {
  throw new Error('Indisponível no modo demonstração: nenhuma alteração é gravada.');
};

const PUBLICADO_EM = new Date(Date.now() - 2 * 86_400_000).toISOString();
const DEFINITIVA_EM = new Date(Date.now() - 86_400_000).toISOString();
const hojeISO = () => new Date().toISOString().slice(0, 10);
const realizado = (numero: number) =>
  (encontros.find((e) => e.numero === numero)?.data ?? '9999') < hojeISO();

interface VersaoFicticia {
  versao: number;
  estado: EstadoRanking;
  em: string;
  justificativa: string | null;
}
/** Versões fictícias por turma (spec 012): só o 3º ano A foi publicado. */
const VERSOES_DA_TURMA: Record<string, VersaoFicticia[]> = {
  't-a': [
    {
      versao: 2,
      estado: 'definitivo',
      em: DEFINITIVA_EM,
      justificativa: 'Fechamento fictício da turma.',
    },
    { versao: 1, estado: 'parcial', em: PUBLICADO_EM, justificativa: null },
  ],
};
/** Estado da última publicação fictícia da turma (spec 013: pendências do encerramento). */
export const estadoDaUltimaPublicacaoDemo = (turmaId: string): EstadoRanking | null =>
  VERSOES_DA_TURMA[turmaId]?.[0]?.estado ?? null;

/** Publicação por categoria anterior à spec 012 (só a coordenação vê). */
const CATEGORIA_ANTERIOR = 'Categoria A (exemplo)';
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

  const naTurma = (turmaId: string) => duplas.filter((d) => d.turmaId === turmaId);
  const nomeDaTurma = (turmaId: string) => turmas.find((t) => t.id === turmaId)?.nome ?? '';
  const semPermissao = () => new Error('Você não tem permissão para esta operação.');
  /** Turma que quem consulta acompanha (aluno: a própria; gestão: as suas; coordenação: todas). */
  const podeVerTurma = (turmaId: string) => {
    if (coordena()) return true;
    const minha = minhaDupla();
    return minha ? minha.turmaId === turmaId : minhasTurmas().includes(turmaId);
  };

  function classificacao(equipes: typeof duplas): PublicacaoRanking['posicoes'] {
    const minha = minhaDupla();
    const pontos = equipes.map(pontosDa);
    const gestao = !minha;
    return classificar(
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
    });
  }

  function publicacaoDaTurma(turmaId: string): PublicacaoRanking | null {
    const ultima = VERSOES_DA_TURMA[turmaId]?.[0];
    if (!ultima) return null;
    return {
      id: `pub-${turmaId}-v${ultima.versao}`,
      turmaId,
      turma: nomeDaTurma(turmaId),
      categoria: categoriaDaTurma(turmaId),
      versao: ultima.versao,
      estado: ultima.estado,
      publicadoEm: ultima.em,
      revisaoAte: null,
      posicoes: classificacao(naTurma(turmaId)),
    };
  }

  function pendencias(turmaId: string, soRealizados: boolean): PendenciasDoRanking {
    const componentes = naTurma(turmaId).flatMap((d) =>
      pontosDa(d)
        .encontros.filter((e) => !soRealizados || realizado(e.numero))
        .flatMap((e) =>
          e.pontuacao.pendencias.map((componente) => ({
            duplaId: d.id,
            duplaNome: d.nome,
            encontroNumero: e.numero,
            componente,
          })),
        ),
    );
    const ocorrencias =
      OCORRENCIA.turmaId === turmaId
        ? [{ id: OCORRENCIA.id, duplaNome: OCORRENCIA.duplaNome, estado: OCORRENCIA.estado }]
        : [];
    return { componentes, ocorrencias, revisoes: [] };
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

    async rankingPublicado(_edicaoId, categoria) {
      if (!coordena()) throw semPermissao();
      if ((categoria ?? CATEGORIA_ANTERIOR) !== CATEGORIA_ANTERIOR) return null;
      return {
        id: 'pub-anterior',
        turmaId: null,
        turma: null,
        categoria: CATEGORIA_ANTERIOR,
        versao: 1,
        estado: 'parcial',
        publicadoEm: PUBLICADO_EM,
        revisaoAte: null,
        posicoes: classificacao(
          duplas.filter((d) => categoriaDaTurma(d.turmaId) === CATEGORIA_ANTERIOR),
        ),
      };
    },
    async historicoPublicacoes(_edicaoId, categoria) {
      if (!coordena()) throw semPermissao();
      if (categoria !== CATEGORIA_ANTERIOR) return [];
      return [
        {
          id: 'pub-anterior',
          versao: 1,
          estado: 'parcial',
          publicadoEm: PUBLICADO_EM,
          publicadoPorNome: 'Coordenação (fictícia)',
          justificativa: null,
          revisaoAte: null,
        },
      ];
    },
    async publicacoesAnteriores() {
      if (!coordena()) throw semPermissao();
      return [
        {
          categoria: CATEGORIA_ANTERIOR,
          versoes: 1,
          ultima: { versao: 1, estado: 'parcial', publicadoEm: PUBLICADO_EM },
        },
      ];
    },

    async rankingDaEdicao() {
      if (!coordena()) throw semPermissao();
      return turmas.map((t) => {
        const ultima = VERSOES_DA_TURMA[t.id]?.[0];
        const p = pendencias(t.id, true);
        return {
          turmaId: t.id,
          turma: t.nome,
          categoria: categoriaDaTurma(t.id),
          equipes: naTurma(t.id).length,
          ultima: ultima
            ? {
                id: `pub-${t.id}-v${ultima.versao}`,
                versao: ultima.versao,
                estado: ultima.estado,
                publicadoEm: ultima.em,
              }
            : null,
          pendencias: {
            componentes: p.componentes.length,
            ocorrencias: p.ocorrencias.length,
            revisoes: p.revisoes.length,
          },
        };
      });
    },
    async pendenciasRankingTurma(turmaId) {
      if (!coordena()) throw semPermissao();
      return pendencias(turmaId, false);
    },
    publicarRankingTurmas: recusar,
    async rankingDaTurma(turmaId) {
      if (!podeVerTurma(turmaId)) throw semPermissao();
      return publicacaoDaTurma(turmaId);
    },
    async historicoPublicacoesTurma(turmaId) {
      if (!coordena()) throw semPermissao();
      return (VERSOES_DA_TURMA[turmaId] ?? []).map((v): VersaoPublicada => ({
        id: `pub-${turmaId}-v${v.versao}`,
        versao: v.versao,
        estado: v.estado,
        publicadoEm: v.em,
        publicadoPorNome: 'Coordenação (fictícia)',
        justificativa: v.justificativa,
        revisaoAte: null,
      }));
    },
    async premiacaoDaEdicao() {
      const perfil = coordena() ? 'coordenacao' : minhaDupla() ? 'aluno' : 'gestao';
      return turmas
        .filter((t) => podeVerTurma(t.id))
        .map((t) =>
          premiacaoDaTurma({
            turmaId: t.id,
            turma: t.nome,
            publicacao: publicacaoDaTurma(t.id),
            itens: edicao.premiacao,
            decisoes: [],
            perfil,
          }),
        );
    },
    decidirPremiacaoEmpate: recusar,

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
