import { Link } from 'react-router';
import { EnvioEntrega } from '@/modules/desafios';
import { painelAluno, type RankingDaCategoria } from '@/modules/demo';
import { maximoPorEncontro, REGRAS_PILOTO, type PontuacaoDoEncontro } from '@/modules/pontuacao';
import { formatarData, formatarDataHora, formatarPontos } from '@/shared/lib/formatacao';
import {
  Alert,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  ResponsiveTable,
  StatCard,
  StatusBadge,
} from '@/shared/ui';
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

export function AlunoInicioPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            titulo={`Olá, ${p.estudante.nome.split(' ')[0]}!`}
            descricao="Cada desafio é uma oportunidade de evoluir."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icone="pontuacao"
              acento="roxo"
              rotulo="Pontuação da dupla"
              valor={formatarPontos(p.totais.total)}
              complemento={`até ${p.maximo} pontos`}
            />
            <StatCard
              icone="ranking"
              acento="amarelo"
              rotulo="Posição na categoria"
              valor={p.minhaPosicao ? `${p.minhaPosicao.posicao}º` : '—'}
              complemento={p.ranking && <StatusBadge estado={p.ranking.estado} />}
            />
            <StatCard
              icone="calendario"
              acento="ciano"
              rotulo="Próximo encontro"
              valor={p.proximoEncontro ? formatarData(p.proximoEncontro.data) : '—'}
              complemento={p.proximoEncontro?.horario}
            />
            <StatCard
              icone="dupla"
              rotulo="Minha dupla"
              valor={p.dupla.nome}
              complemento={p.colega ? `com ${p.colega.nome}` : undefined}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card titulo="Progresso da dupla" className="lg:col-span-2">
              <ProgressBar
                valor={p.totais.total}
                maximo={p.maximo}
                rotulo="Pontuação acumulada da dupla"
              />
              <p className="mt-2 text-sm text-text-secondary">
                {formatarPontos(p.totais.total)} de {p.maximo} pontos possíveis na edição.
                {p.totais.pendente && ' Há lançamentos pendentes: a pontuação pode mudar.'}
              </p>
              <Link
                to="/aluno/pontuacao"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-link underline-offset-4 hover:underline"
              >
                Ver detalhes por encontro
              </Link>
            </Card>
            <Card titulo="Próxima tarefa">
              {p.proximoDesafio ? (
                <>
                  <p className="font-semibold">{p.proximoDesafio.titulo}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
                    <Icon nome="horario" tamanho="sm" /> Prazo:{' '}
                    {formatarDataHora(p.proximoDesafio.prazo)}
                  </p>
                  <Link
                    to="/aluno/desafios"
                    className="mt-3 inline-block text-sm font-semibold text-link underline-offset-4 hover:underline"
                  >
                    Ver desafio
                  </Link>
                </>
              ) : (
                <EmptyState titulo="Nenhuma tarefa no próximo encontro." />
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card titulo="Encontros">
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
            <Card titulo="Comunicados">
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

export function AlunoDesafiosPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader titulo="Desafios e entregas" />
          <div className="grid gap-4 lg:grid-cols-2">
            {p.desafios.map((d) => {
              const encontro = p.porEncontro.find((e) => e.encontro.id === d.encontroId);
              const aberto = !encontro?.pontuacao;
              return (
                <Card
                  key={d.id}
                  titulo={d.titulo}
                  acao={
                    <StatusBadge
                      estado={aberto ? 'em_andamento' : 'avaliado'}
                      rotulo={aberto ? 'Aberto' : 'Encerrado'}
                    />
                  }
                >
                  <p className="text-sm text-text-secondary">{d.resumo}</p>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="font-semibold">Prazo</dt>
                    <dd>{formatarDataHora(d.prazo)}</dd>
                    <dt className="font-semibold">Uso de IA</dt>
                    <dd>{d.politicaIA}</dd>
                  </dl>
                  {aberto && (
                    <div className="mt-4 border-t border-border pt-4">
                      <EnvioEntrega enviar={null} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

function LinhaComponente({
  rotulo,
  valor,
  maximo,
}: {
  rotulo: string;
  valor: number;
  maximo: number;
}) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <dt>{rotulo}</dt>
      <dd className="tabular-nums">
        {formatarPontos(valor)} <span className="text-text-secondary">/ {maximo}</span>
      </dd>
    </div>
  );
}

function DetalheEncontro({ pontuacao }: { pontuacao: PontuacaoDoEncontro }) {
  const r = REGRAS_PILOTO;
  const soma = (c: { maximo: number }[]) => c.reduce((t, x) => t + x.maximo, 0);
  return (
    <dl className="flex flex-col gap-1">
      <LinhaComponente
        rotulo="Presença"
        valor={pontuacao.presenca}
        maximo={r.presenca.maximoPorDupla}
      />
      <LinhaComponente
        rotulo="Participação"
        valor={pontuacao.participacao}
        maximo={soma(r.participacao.criterios)}
      />
      <LinhaComponente
        rotulo="Questões / prova oficial"
        valor={pontuacao.avaliacaoObjetiva}
        maximo={r.questoes.maximo}
      />
      <LinhaComponente
        rotulo="Entrega prática"
        valor={pontuacao.entrega}
        maximo={soma(r.entrega.criterios)}
      />
      <LinhaComponente
        rotulo="Apresentação"
        valor={pontuacao.apresentacao}
        maximo={soma(r.apresentacao.criterios)}
      />
      {pontuacao.descontos > 0 && (
        <div className="flex justify-between gap-2 text-sm text-error">
          <dt>Descontos por ocorrências</dt>
          <dd className="tabular-nums">−{formatarPontos(pontuacao.descontos)}</dd>
        </div>
      )}
      <div className="mt-1 flex justify-between gap-2 border-t border-border pt-2 font-semibold">
        <dt>Total do encontro</dt>
        <dd className="tabular-nums">
          {formatarPontos(pontuacao.total)} / {maximoPorEncontro(r)}
        </dd>
      </div>
    </dl>
  );
}

export function AlunoPontuacaoPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            titulo="Pontuação da dupla"
            descricao={`${formatarPontos(p.totais.total)} de ${p.maximo} pontos · regras ${REGRAS_PILOTO.versao}`}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {p.porEncontro.map(({ encontro, pontuacao }) => (
              <Card key={encontro.id} titulo={encontro.titulo}>
                {pontuacao ? (
                  <>
                    <DetalheEncontro pontuacao={pontuacao} />
                    {pontuacao.pendencias.length > 0 && (
                      <div className="mt-3">
                        <Alert tom="alerta" titulo="Componentes ainda não lançados">
                          A pontuação deste encontro pode aumentar quando a avaliação for concluída.
                        </Alert>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState titulo="Encontro ainda não realizado." icone="calendario" />
                )}
              </Card>
            ))}
          </div>
          <p className="mt-6 text-sm text-text-secondary">
            Discorda de algum lançamento? O pedido de revisão (até 24 horas após a publicação) será
            disponibilizado no Incremento 4. Até lá, procure a coordenação.
          </p>
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
        titulo="Regulamento e avisos"
        descricao={`Regras da edição — versão ${r.versao}`}
      />
      <Alert tom="alerta" titulo="Resumo em validação">
        Este é um resumo das regras do piloto. O regulamento oficial aprovado prevalece e será
        publicado aqui pela coordenação.
      </Alert>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card titulo="Pontuação por encontro">
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
        <Card titulo="Prova oficial, atrasos e ocorrências">
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
