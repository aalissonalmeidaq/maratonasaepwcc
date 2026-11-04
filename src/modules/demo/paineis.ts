/**
 * Painéis da DEMONSTRAÇÃO (spec 008, R7): os mesmos formatos do servidor montados com os dados
 * fictícios. A exportação de relatórios é recusada, pois não há servidor para gerar nem para
 * registrar a exportação (FR-015). A visibilidade por perfil é só emulada.
 */
import type {
  AcaoDoAluno,
  EncontroDoPainel,
  PendenciaDaGestao,
  RepositorioPaineis,
} from '@/modules/relatorios';
import type { RepositorioResultado } from '@/modules/resultado';
import { cursos, desafios, duplas, encontros, lancamentos, pessoas, turmas } from './dados';

const hojeISO = () => new Date().toISOString().slice(0, 10);
const realizado = (e: (typeof encontros)[number]) => e.data < hojeISO();
const semPermissao = () => new Error('Você não tem permissão para esta operação.');
const categoriaDaTurma = (turmaId: string) =>
  cursos.find((c) => c.id === turmas.find((t) => t.id === turmaId)?.cursoId)?.categoria ?? '';

function paraEncontro(e: (typeof encontros)[number] | undefined): EncontroDoPainel | null {
  if (!e) return null;
  const inicio = /(\d{2})h(\d{2})/.exec(e.horario);
  return {
    id: e.id,
    numero: e.numero,
    titulo: e.titulo,
    data: e.data,
    inicio: inicio ? `${inicio[1]}:${inicio[2]}` : null,
  };
}

const proximoEncontro = () => paraEncontro(encontros.find((e) => e.data >= hojeISO()));

export function criarPaineisDemo(
  usuarioAtual: () => string | null,
  resultado: RepositorioResultado,
): RepositorioPaineis {
  const eu = () => pessoas.find((p) => p.id === usuarioAtual());
  const tem = (papel: 'aluno' | 'coordenacao' | 'docente' | 'mentor') =>
    eu()?.papeis.includes(papel) ?? false;

  return {
    async painelDoAluno(edicaoId) {
      if (!tem('aluno')) throw semPermissao();
      const dupla = duplas.find((d) => d.integrantes.includes(usuarioAtual() as never));
      const [pontos, publicacao, avisos, ocorrencias] = await Promise.all([
        resultado.pontosDaMinhaEquipe(edicaoId),
        dupla ? resultado.rankingDaTurma(dupla.turmaId) : Promise.resolve(null),
        resultado.meusAvisos(),
        resultado.ocorrencias(edicaoId, null),
      ]);
      const minha = publicacao?.posicoes.find((p) => p.minha);
      const prazo = [...desafios]
        .filter((d) => new Date(d.prazo).getTime() > Date.now())
        .sort((a, b) => a.prazo.localeCompare(b.prazo))[0];
      const acoes: AcaoDoAluno[] = ocorrencias
        .filter((o) => o.estado === 'registrada' && o.duplaId === dupla?.id)
        .map((o) => ({
          tipo: 'manifestacao',
          titulo: `Manifestação sobre a ocorrência do encontro ${o.encontroNumero}`,
          prazo: o.prazoManifestacao,
          caminho: '/aluno/ocorrencias',
        }));
      return {
        equipe: dupla ? { id: dupla.id, nome: dupla.nome } : null,
        previa: pontos ? { total: pontos.totais.total, pendente: pontos.totais.pendente } : null,
        ranking: publicacao
          ? {
              estado: publicacao.estado,
              versao: publicacao.versao,
              posicao: minha?.posicao ?? null,
              compartilhada: minha?.compartilhada ?? false,
              publicadoEm: publicacao.publicadoEm,
            }
          : null,
        proximoEncontro: proximoEncontro(),
        proximoPrazo: prazo
          ? {
              tipo: 'desafio',
              id: prazo.id,
              titulo: prazo.titulo,
              prazo: new Date(prazo.prazo).toISOString(),
            }
          : null,
        acoes: dupla ? acoes : [],
        avisosNaoLidos: avisos.naoLidos,
      };
    },

    async painelDaGestao(edicaoId) {
      if (!tem('docente') && !tem('mentor')) throw semPermissao();
      const ocorrencias = await resultado.ocorrencias(edicaoId, null);
      const daPessoa = turmas.filter((t) => eu()?.turmas.includes(t.id));
      return {
        proximoEncontro: proximoEncontro(),
        turmas: await Promise.all(
          daPessoa.map(async (t) => {
            const equipes = duplas.filter((d) => d.turmaId === t.id);
            const pontos = await resultado.pontosDaTurma(t.id);
            const alunos = pessoas.filter(
              (p) => p.papeis.includes('aluno') && p.turmas.includes(t.id),
            );
            const pendencias: PendenciaDaGestao[] = encontros.filter(realizado).flatMap((en) => {
              const presentes = new Set(
                equipes
                  .flatMap((d) => lancamentos[d.id]?.[en.id]?.presencas ?? [])
                  .map((p) => p.estudanteId),
              );
              const semPresenca = alunos.filter((a) => !presentes.has(a.id)).length;
              return [
                ...(semPresenca
                  ? [
                      {
                        tipo: 'presenca' as const,
                        encontroNumero: en.numero,
                        descricao: `Presença não registrada: ${semPresenca} ${semPresenca === 1 ? 'estudante' : 'estudantes'}`,
                        caminho: '/docente/presenca',
                      },
                    ]
                  : []),
                ...equipes.flatMap((d) => {
                  const l = lancamentos[d.id]?.[en.id];
                  return [
                    ...(!l?.participacao
                      ? [
                          {
                            tipo: 'participacao' as const,
                            encontroNumero: en.numero,
                            descricao: `Participação não registrada — ${d.nome}`,
                            caminho: '/docente/presenca',
                          },
                        ]
                      : []),
                    ...(l?.entrega.situacao === 'pendente'
                      ? [
                          {
                            tipo: 'avaliacao' as const,
                            encontroNumero: en.numero,
                            descricao: `Entrega sem avaliação — ${d.nome}`,
                            caminho: '/docente/avaliacoes',
                          },
                        ]
                      : []),
                  ];
                }),
              ];
            });
            for (const o of ocorrencias) {
              if (o.turmaId === t.id && (o.estado === 'registrada' || o.estado === 'manifestada')) {
                pendencias.push({
                  tipo: 'ocorrencia',
                  encontroNumero: o.encontroNumero,
                  descricao: `Ocorrência sem decisão — ${o.duplaNome} (${o.tipoRotulo})`,
                  caminho: '/docente/ocorrencias',
                });
              }
            }
            return {
              id: t.id,
              nome: t.nome,
              categoria: categoriaDaTurma(t.id),
              equipes: equipes.length,
              equipesPendentes: pontos.filter((p) => p.totais.pendente).length,
              pendencias,
            };
          }),
        ),
      };
    },

    async painelDaCoordenacao(edicaoId) {
      if (!tem('coordenacao')) throw semPermissao();
      const numerosRealizados = new Set(encontros.filter(realizado).map((e) => e.numero));
      const lista = await resultado.rankingDaEdicao(edicaoId);
      const provasRealizadas = encontros.filter(
        (e) => realizado(e) && e.avaliacaoObjetiva === 'prova_oficial',
      ).length;
      return {
        indicadores: {
          cursos: cursos.length,
          turmas: turmas.length,
          equipes: duplas.length,
          estudantes: pessoas.filter((p) => p.papeis.includes('aluno')).length,
          encontrosRealizados: numerosRealizados.size,
          encontrosTotal: encontros.length,
        },
        // Mesmos números da tela de ranking (spec 012, SC-006).
        turmas: lista.map((t) => ({
          turmaId: t.turmaId,
          turma: t.turma,
          categoria: t.categoria,
          componentesPendentes: t.pendencias.componentes,
          provasPendentes:
            provasRealizadas *
            duplas
              .filter((d) => d.turmaId === t.turmaId)
              .reduce((n, d) => n + d.integrantes.length, 0),
          ocorrenciasSemDecisao: t.pendencias.ocorrencias,
          revisoesAbertas: t.pendencias.revisoes,
          publicacao: t.ultima
            ? {
                estado: t.ultima.estado,
                versao: t.ultima.versao,
                publicadoEm: t.ultima.publicadoEm,
              }
            : null,
        })),
      };
    },

    async relatorio() {
      throw new Error('Indisponível no modo demonstração: a exportação exige o servidor.');
    },
  };
}
