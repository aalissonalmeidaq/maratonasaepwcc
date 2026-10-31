import { Link } from 'react-router';
import { painelAluno, type RankingDaCategoria } from '@/modules/demo';
import { maximoPorEncontro, REGRAS_PILOTO } from '@/modules/pontuacao';
import { formatarData, formatarDataHora, formatarPontos } from '@/shared/lib/formatacao';
import {
  Alert,
  Card,
  PageHeader,
  ProgressoCircular,
  ResponsiveTable,
  StatCard,
  StatusBadge,
  BannerDestaque,
} from '@/shared/ui';
import { useConvitesPendentes } from '../dados/consultas';
import { Atalhos } from '../layout/Atalhos';
import { ComDadosDemo } from './comum';

type Painel = NonNullable<ReturnType<typeof painelAluno>>;

const carregar = (s: { usuarioId: string }) => painelAluno(s.usuarioId);

export function TabelaRanking({
  ranking,
  destaque,
}: {
  ranking: RankingDaCategoria;
  destaque?: string;
}) {
  return (
    <ResponsiveTable
      legenda={`Classificação — ${ranking.categoria}`}
      chave={(p) => p.duplaId}
      linhas={ranking.posicoes}
      colunas={[
        {
          id: 'pos',
          titulo: 'Posição',
          valor: (p) => (
            <span className="font-semibold">
              {p.posicao}º
              {p.compartilhada && (
                <span className="ml-1 text-xs font-medium text-text-secondary">
                  (compartilhada)
                </span>
              )}
            </span>
          ),
        },
        {
          id: 'dupla',
          titulo: 'Dupla',
          valor: (p) => (
            <span className={p.duplaId === destaque ? 'font-bold text-blue-700' : undefined}>
              {p.nome}
              {p.duplaId === destaque && ' (sua dupla)'}
            </span>
          ),
        },
        {
          id: 'total',
          titulo: 'Pontos',
          numerica: true,
          valor: (p) => formatarPontos(p.totais.total),
        },
        {
          id: 'sit',
          titulo: 'Situação',
          valor: (p) =>
            p.totais.pendente ? (
              <StatusBadge estado="pendente" rotulo="Com pendências" />
            ) : (
              <StatusBadge estado="concluido" rotulo="Lançamentos completos" />
            ),
        },
      ]}
    />
  );
}

/** Convites de equipe recebidos que esperam resposta (FR-016). */
function CardConvitesEquipe() {
  const pendentes = useConvitesPendentes(true);
  return (
    <Card icone="dupla" titulo="Convites de equipe" className="mb-6">
      <p>
        {pendentes === 0
          ? 'Nenhum convite pendente.'
          : `Você tem ${pendentes} ${pendentes === 1 ? 'convite pendente' : 'convites pendentes'}.`}
      </p>
      <Link
        to="/aluno/dupla"
        className="mt-3 inline-flex min-h-11 items-center rounded-md font-semibold text-link underline-offset-4 hover:underline"
      >
        Ver convites de equipe
      </Link>
    </Card>
  );
}

export function AlunoInicioPage() {
  return (
    <ComDadosDemo
      carregar={carregar}
      foraDaDemo={
        <>
          <PageHeader titulo="Início" descricao="Acompanhe as atividades da sua equipe." />
          <CardConvitesEquipe />
          <Atalhos area="aluno" />
        </>
      }
    >
      {(p: Painel) => (
        <>
          <BannerDestaque
            titulo={`Olá, ${p.estudante.nome.split(' ')[0]}!`}
            descricao="Cada desafio é uma oportunidade de evoluir."
            lateral={
              <section aria-label="Pontuação acumulada" className="min-w-0 wrap-anywhere">
                <div className="flex flex-wrap items-center gap-3">
                  <ProgressoCircular
                    valor={p.totais.total}
                    maximo={p.maximo}
                    rotulo="Pontuação acumulada da dupla"
                    inverso
                  />
                  <div className="min-w-0 flex-1 basis-36">
                    <h2 className="text-sm font-semibold text-white">Pontuação acumulada</h2>
                    <p className="mt-1 text-3xl font-bold tabular-nums">
                      {formatarPontos(p.totais.total)}
                    </p>
                    <p className="text-sm text-white/85">
                      de {p.maximo} pontos possíveis na edição
                    </p>
                  </div>
                </div>
                {p.totais.pendente && (
                  <p className="mt-2 text-sm text-white/85">
                    Há lançamentos pendentes: a pontuação pode mudar.
                  </p>
                )}
                <Link
                  to="/aluno/pontuacao"
                  className="mt-2 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-white underline underline-offset-4 hover:text-cyan-500"
                >
                  Ver detalhes por encontro
                </Link>
              </section>
            }
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card icone="calendario" titulo="Próximo encontro">
              {p.proximoEncontro ? (
                <>
                  <p className="text-lg font-semibold">{p.proximoEncontro.titulo}</p>
                  <p className="mt-2 text-text-secondary">
                    {formatarData(p.proximoEncontro.data)} · {p.proximoEncontro.horario}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{p.proximoEncontro.ambiente}</p>
                </>
              ) : (
                <p>Nenhum encontro futuro cadastrado.</p>
              )}
              <Link
                to="/aluno/encontros"
                className="mt-3 inline-flex min-h-11 items-center rounded-md font-semibold text-link underline-offset-4 hover:underline"
              >
                Ver encontros
              </Link>
            </Card>
            <Card icone="tarefa" titulo="Próxima tarefa">
              {p.proximoDesafio ? (
                <>
                  <p className="text-lg font-semibold">{p.proximoDesafio.titulo}</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Prazo: {formatarDataHora(p.proximoDesafio.prazo)}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {
                      p.porEncontro.find((e) => e.encontro.id === p.proximoDesafio?.encontroId)
                        ?.encontro.titulo
                    }
                  </p>
                </>
              ) : (
                <p>Nenhuma tarefa com prazo futuro cadastrada.</p>
              )}
              <Link
                to="/aluno/desafios"
                className="mt-3 inline-flex min-h-11 items-center rounded-md font-semibold text-link underline-offset-4 hover:underline"
              >
                {p.proximoDesafio ? 'Ver desafio' : 'Ver desafios'}
              </Link>
            </Card>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <>
              <StatCard
                icone="ranking"
                acento="amarelo"
                rotulo="Posição na categoria"
                valor={p.minhaPosicao ? `${p.minhaPosicao.posicao}º` : '—'}
                complemento={p.ranking && <StatusBadge estado={p.ranking.estado} />}
              />
              <StatCard
                icone="dupla"
                rotulo="Minha equipe"
                valor={p.dupla.nome}
                complemento={p.colega ? `com ${p.colega.nome}` : undefined}
              />
            </>
          </div>
          <section aria-label="Acessos do aluno" className="mt-6">
            <Atalhos area="aluno" compacto />
          </section>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card icone="calendario" titulo="Encontros">
              <ul className="flex flex-col divide-y divide-border">
                {p.porEncontro.map(({ encontro, pontuacao }) => (
                  <li
                    key={encontro.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span>
                      <span className="font-semibold">{encontro.titulo}</span>
                      <span className="block text-sm text-text-secondary">
                        {formatarData(encontro.data, { weekday: 'short' })} · {encontro.ambiente}
                      </span>
                    </span>
                    {pontuacao ? (
                      <StatusBadge estado={pontuacao.pendencias.length ? 'pendente' : 'avaliado'} />
                    ) : (
                      <StatusBadge estado="agendado" />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
            <Card icone="noticia" titulo="Comunicados">
              <ul className="flex flex-col gap-3">
                {p.comunicados.map((c) => (
                  <li key={c.id}>
                    <p className="font-semibold">{c.titulo}</p>
                    <p className="text-sm text-text-secondary">
                      {formatarData(c.data)} — {c.texto}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function AlunoRankingPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            icone="ranking"
            titulo="Ranking"
            descricao={p.curso?.categoria}
            acoes={p.ranking && <StatusBadge estado={p.ranking.estado} />}
          />
          <Alert tom="info" titulo="Classificação parcial">
            O ranking mostra apenas o total de cada dupla. Notas individuais não são exibidas.
            Desempate: entrega prática, depois questões/prova oficial, depois presença.
          </Alert>
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
            {p.ranking && <TabelaRanking ranking={p.ranking} destaque={p.dupla.id} />}
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function AlunoRegulamentoPage() {
  const r = REGRAS_PILOTO;
  return (
    <>
      <PageHeader
        icone="conhecimento"
        titulo="Regulamento e avisos"
        descricao={`Regras da edição — versão ${r.versao}`}
      />
      <Alert tom="alerta" titulo="Resumo em validação">
        Este é um resumo das regras do piloto. O regulamento oficial aprovado prevalece e será
        publicado aqui pela coordenação.
      </Alert>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card icone="pontuacao" titulo="Pontuação por encontro">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              Presença: {r.presenca.pontosPorIntegrante} por integrante, até{' '}
              {r.presenca.maximoPorDupla} por dupla.
            </li>
            <li>
              Participação: até {r.participacao.criterios.reduce((t, c) => t + c.maximo, 0)} (
              {r.participacao.criterios
                .map((c) => `${c.rotulo.toLowerCase()} ${c.maximo}`)
                .join(', ')}
              ).
            </li>
            <li>Questões: acertos ÷ total × {r.questoes.maximo}.</li>
            <li>
              Entrega prática: até {r.entrega.criterios.reduce((t, c) => t + c.maximo, 0)} (4
              critérios de até 10).
            </li>
            <li>Apresentação: até {r.apresentacao.criterios.reduce((t, c) => t + c.maximo, 0)}.</li>
            <li>Total: até {maximoPorEncontro(r)} por encontro.</li>
          </ul>
        </Card>
        <Card icone="prova" titulo="Prova oficial, atrasos e ocorrências">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              Prova oficial: {r.provaOficial.pontosRealizacao} pontos por estudante com realização
              confirmada e +{r.provaOficial.pontosBonus} com nota confirmada ≥{' '}
              {r.provaOficial.notaMinimaBonus}. Nota pendente não gera bônus.
            </li>
            <li>
              Atraso até 15 min: −2 no critério organização; até 30 min: −5; acima de 30 min:
              entrega não realizada, salvo exceção registrada.
            </li>
            <li>
              Descontos por ocorrências distintas: até {r.penalidades.tetoDescontosPorEncontro}{' '}
              pontos por encontro; nunca duas penalidades pelo mesmo fato.
            </li>
            <li>A pontuação do encontro nunca fica negativa.</li>
            <li>Pedido de revisão: até 24 horas após a publicação.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
