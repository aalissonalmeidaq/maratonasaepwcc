import { useState, type ReactNode } from 'react';
import {
  AvaliacaoDaEquipe,
  EnvioEntrega,
  FormAvaliacao,
  FormDesafio,
  FormLista,
  FormProrrogacao,
  PontuacaoDoEncontro,
  calcularParcial,
  FormParticipacao,
  RegistroPresenca,
  ResponderLista,
  ResultadoLista,
  situacaoDesafio,
  type DesafioDaEquipe,
  type Desafio,
  type EquipeParaAvaliar,
  type ListaQuestoes,
  type ListaResumo,
} from '@/modules/atividades';
import type { Encontro } from '@/modules/encontros';
import type { Edicao, Turma } from '@/modules/organizacao';
import { maximoDaEdicao, type CriterioRubrica, type RegrasDaEdicao } from '@/modules/pontuacao';
import { formatarDataHora } from '@/shared/lib/formatacao';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ListaPaginada,
  PageHeader,
  ResponsiveTable,
  RetornoEnvio,
  SelectField,
  StatusBadge,
  useEnvio,
  type EstadoVisual,
} from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useAtividadesDaTurma,
  useBloqueioDeEscrita,
  useDesafiosGestao,
  useEncontros,
  useGravar,
  useLancamentosDaEquipe,
  useListaParaEquipe,
  useListasGestao,
  usePainelAvaliacao,
  usePresencasDaTurma,
  useTurmas,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';
import { ComEdicao } from './ComEdicao';

const BADGE_ESTADO: Record<Desafio['estado'], { estado: EstadoVisual; rotulo: string }> = {
  rascunho: { estado: 'parcial', rotulo: 'Rascunho' },
  publicado: { estado: 'em_andamento', rotulo: 'Publicado' },
  encerrado: { estado: 'concluido', rotulo: 'Encerrado' },
};

const nomeEncontro = (encontros: Encontro[], id: string) => {
  const e = encontros.find((x) => x.id === id);
  return e ? `${e.numero}. ${e.titulo}` : 'Encontro';
};

/** Ação de um clique; o retorno fica fora do item, que muda de estado ao ser atualizado. */
function BotaoServidor({
  rotulo,
  onClick,
  desabilitado,
  variante = 'secundario',
}: {
  rotulo: string;
  onClick: () => void;
  desabilitado: boolean;
  variante?: 'primario' | 'secundario';
}) {
  return (
    <Button variante={variante} disabled={desabilitado} onClick={onClick}>
      {rotulo}
    </Button>
  );
}

// ===========================================================================
// Docente e mentor — "Atividades" (US1: desafios; US4: listas de questões)
// ===========================================================================

function DesafiosDaGestao({
  edicao,
  turmas,
  encontros,
}: {
  edicao: Edicao;
  turmas: Turma[];
  encontros: Encontro[];
}) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const desafios = useDesafiosGestao(edicao.id);
  const [encontroFiltro, setEncontroFiltro] = useState('');
  const [emEdicao, setEmEdicao] = useState<Desafio | null>(null);
  const acao = useEnvio();
  const nomeTurma = (id: string) => turmas.find((t) => t.id === id)?.nome ?? '—';

  return (
    <div className="flex flex-col gap-6">
      <Card icone="desafio" titulo="Desafios">
        <div className="mb-4 max-w-sm">
          <SelectField
            rotulo="Filtrar por encontro"
            value={encontroFiltro}
            onChange={(e) => setEncontroFiltro(e.target.value)}
            placeholder="Todos os encontros"
            opcoes={encontros.map((e) => ({ valor: e.id, rotulo: `${e.numero}. ${e.titulo}` }))}
          />
        </div>
        <div className="mb-4">
          <RetornoEnvio estado={acao.estado} />
        </div>
        <Consulta consulta={desafios}>
          {(lista) => {
            const filtrados = lista.filter(
              (d) => !encontroFiltro || d.encontroId === encontroFiltro,
            );
            return filtrados.length === 0 ? (
              <EmptyState icone="desafio" titulo="Nenhum desafio cadastrado." />
            ) : (
              <ul aria-label="Desafios cadastrados" className="flex flex-col gap-3">
                {filtrados.map((d) => (
                  <li key={d.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{d.titulo}</h3>
                      <StatusBadge {...BADGE_ESTADO[d.estado]} />
                    </div>
                    <p className="text-sm text-text-secondary">
                      {nomeEncontro(encontros, d.encontroId)} · prazo {formatarDataHora(d.prazo)} ·{' '}
                      {d.turmas.map(nomeTurma).join(', ')}
                    </p>
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      {d.estado === 'rascunho' && (
                        <>
                          <Button
                            variante="terciario"
                            icone="editar"
                            onClick={() => setEmEdicao(d)}
                          >
                            Editar <span className="sr-only">{d.titulo}</span>
                          </Button>
                          <BotaoServidor
                            rotulo={`Publicar ${d.titulo}`}
                            variante="primario"
                            desabilitado={Boolean(bloqueio) || acao.enviando}
                            onClick={() =>
                              void acao.enviar(
                                gravar(() => r.atividades.publicarDesafio(d.id)),
                                `Desafio “${d.titulo}” publicado.`,
                              )
                            }
                          />
                        </>
                      )}
                      {d.estado === 'publicado' && (
                        <BotaoServidor
                          rotulo={`Encerrar ${d.titulo}`}
                          desabilitado={Boolean(bloqueio) || acao.enviando}
                          onClick={() =>
                            void acao.enviar(
                              gravar(() => r.atividades.encerrarDesafio(d.id)),
                              `Desafio “${d.titulo}” encerrado.`,
                            )
                          }
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            );
          }}
        </Consulta>
      </Card>

      <Card icone="adicionar" titulo={emEdicao ? `Editar “${emEdicao.titulo}”` : 'Novo desafio'}>
        <FormDesafio
          key={emEdicao?.id ?? 'novo'}
          encontros={encontros}
          turmas={turmas}
          inicial={emEdicao ?? undefined}
          bloqueio={bloqueio}
          onSalvar={(dados) => gravar(() => r.atividades.salvarDesafio(dados))()}
        />
        {emEdicao && (
          <Button variante="secundario" className="mt-3" onClick={() => setEmEdicao(null)}>
            Cancelar edição
          </Button>
        )}
      </Card>
    </div>
  );
}

const ESTADO_LISTA: Record<ListaQuestoes['estado'], { estado: EstadoVisual; rotulo: string }> = {
  rascunho: { estado: 'parcial', rotulo: 'Rascunho' },
  publicado: { estado: 'em_andamento', rotulo: 'Publicada' },
  encerrado: { estado: 'concluido', rotulo: 'Encerrada' },
};

/** Listas de questões das turmas do docente/mentor (US4, FR-016/019). */
function ListasDaGestao({
  edicao,
  turmas,
  encontros,
}: {
  edicao: Edicao;
  turmas: Turma[];
  encontros: Encontro[];
}) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const listas = useListasGestao(edicao.id);
  const [emEdicao, setEmEdicao] = useState<ListaQuestoes | null>(null);
  const acao = useEnvio();
  if (encontros.length === 0) {
    return (
      <Card icone="questoes" titulo="Listas de questões">
        <EmptyState titulo="Nenhum encontro com questões preparatórias nesta edição." />
      </Card>
    );
  }
  return (
    <>
      <Card icone="questoes" titulo="Listas de questões">
        <div className="mb-4">
          <RetornoEnvio estado={acao.estado} />
        </div>
        <Consulta consulta={listas}>
          {(lista) =>
            lista.length === 0 ? (
              <EmptyState icone="questoes" titulo="Nenhuma lista cadastrada." />
            ) : (
              <ul aria-label="Listas cadastradas" className="flex flex-col gap-3">
                {lista.map((l) => (
                  <li key={l.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{l.titulo}</h3>
                      <StatusBadge {...ESTADO_LISTA[l.estado]} />
                    </div>
                    <p className="text-sm text-text-secondary">
                      {nomeEncontro(encontros, l.encontroId)} · prazo {formatarDataHora(l.prazo)} ·{' '}
                      {l.questoes.length} questões · versão {l.versao}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {l.estado === 'rascunho' && (
                        <>
                          <Button
                            variante="terciario"
                            icone="editar"
                            onClick={() => setEmEdicao(l)}
                          >
                            Editar lista {l.titulo}
                          </Button>
                          <BotaoServidor
                            rotulo={`Publicar ${l.titulo}`}
                            variante="primario"
                            desabilitado={Boolean(bloqueio) || acao.enviando}
                            onClick={() =>
                              void acao.enviar(
                                gravar(() => r.atividades.publicarLista(l.id)),
                                `Lista “${l.titulo}” publicada.`,
                              )
                            }
                          />
                        </>
                      )}
                      {l.estado === 'publicado' && (
                        <BotaoServidor
                          rotulo={`Encerrar ${l.titulo}`}
                          desabilitado={Boolean(bloqueio) || acao.enviando}
                          onClick={() =>
                            void acao.enviar(
                              gravar(() => r.atividades.encerrarLista(l.id)),
                              `Lista “${l.titulo}” encerrada.`,
                            )
                          }
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </Consulta>
      </Card>
      <Card
        icone="adicionar"
        titulo={emEdicao ? `Editar “${emEdicao.titulo}”` : 'Nova lista de questões'}
      >
        <FormLista
          key={emEdicao?.id ?? 'nova'}
          encontros={encontros}
          turmas={turmas}
          inicial={emEdicao ?? undefined}
          bloqueio={bloqueio}
          onSalvar={(dados) => gravar(() => r.atividades.salvarLista(dados))()}
        />
        {emEdicao && (
          <Button variante="secundario" className="mt-3" onClick={() => setEmEdicao(null)}>
            Cancelar edição
          </Button>
        )}
      </Card>
    </>
  );
}

function AtividadesDocente({ edicao }: { edicao: Edicao }) {
  const turmas = useTurmas(edicao.id);
  const encontros = useEncontros(edicao.id);
  return (
    <>
      <PageHeader
        icone="desafio"
        titulo="Atividades"
        descricao="Desafios e listas de questões das suas turmas."
      />
      <Consulta consulta={turmas}>
        {(listaTurmas) =>
          listaTurmas.length === 0 ? (
            <EmptyState
              titulo="Nenhuma turma vinculada ao seu perfil."
              descricao="Procure a coordenação."
            />
          ) : (
            <Consulta consulta={encontros}>
              {(listaEncontros) => (
                <div className="grid gap-6">
                  <DesafiosDaGestao
                    edicao={edicao}
                    turmas={listaTurmas}
                    encontros={listaEncontros}
                  />
                  <ListasDaGestao
                    edicao={edicao}
                    turmas={listaTurmas}
                    encontros={listaEncontros.filter((e) => e.avaliacaoObjetiva === 'questoes')}
                  />
                </div>
              )}
            </Consulta>
          )
        }
      </Consulta>
    </>
  );
}

export function DocenteAtividadesPage() {
  return <ComEdicao>{(edicao) => <AtividadesDocente edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Aluno — "Desafios e entregas" (US1, US3, US4)
// ===========================================================================

const BADGE_SITUACAO = {
  aberto: { estado: 'em_andamento', rotulo: 'Aberto' },
  prazo_encerrado: { estado: 'pendente', rotulo: 'Prazo encerrado' },
  encerrado: { estado: 'concluido', rotulo: 'Encerrado' },
} as const;

function CartaoDesafio({ desafio, regras }: { desafio: DesafioDaEquipe; regras: RegrasDaEdicao }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const situacao = situacaoDesafio(desafio, new Date(), regras);
  return (
    <Card
      icone="desafio"
      titulo={desafio.titulo}
      acao={<StatusBadge {...BADGE_SITUACAO[situacao]} />}
    >
      <p className="whitespace-pre-line text-sm">{desafio.enunciado}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-semibold">Prazo</dt>
        <dd>
          {formatarDataHora(desafio.prazoEfetivo)}
          {desafio.prazoEfetivo !== desafio.prazo && ' (prorrogado)'}
        </dd>
        {desafio.recursosPermitidos && (
          <>
            <dt className="font-semibold">Recursos</dt>
            <dd>{desafio.recursosPermitidos}</dd>
          </>
        )}
        {desafio.politicaIa && (
          <>
            <dt className="font-semibold">Uso de IA</dt>
            <dd>{desafio.politicaIa}</dd>
          </>
        )}
      </dl>
      {desafio.avaliacao && (
        <div className="mt-4">
          <AvaliacaoDaEquipe
            avaliacao={desafio.avaliacao}
            regras={regras}
            descontoAtraso={desafio.entregas[0]?.descontoPrevisto ?? 0}
          />
        </div>
      )}
      <div className="mt-4 border-t border-border pt-4">
        <EnvioEntrega
          desafio={desafio}
          regras={regras}
          bloqueio={bloqueio}
          enviar={
            r.somenteLeitura || !desafio.duplaId
              ? null
              : (e) =>
                  gravar(() =>
                    r.atividades.enviarEntrega({
                      ...e,
                      desafioId: desafio.id,
                      duplaId: desafio.duplaId as string,
                    }),
                  )()
          }
          onBaixar={(caminho) =>
            void r.atividades
              .urlArquivo(caminho)
              .then((url) => window.open(url, '_blank', 'noopener'))
          }
        />
      </div>
    </Card>
  );
}

function CartaoLista({
  resumo,
  regras,
  semEquipe,
}: {
  resumo: ListaResumo;
  regras: RegrasDaEdicao;
  semEquipe: boolean;
}) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const lista = useListaParaEquipe(resumo.id);
  return (
    <Card
      icone="questoes"
      titulo={resumo.titulo}
      acao={
        <StatusBadge
          estado={resumo.encerrada ? 'concluido' : 'em_andamento'}
          rotulo={resumo.encerrada ? 'Encerrada' : `Até ${formatarDataHora(resumo.prazo)}`}
        />
      }
    >
      <Consulta consulta={lista}>
        {(l) =>
          l.encerrada ? (
            <ResultadoLista lista={l} maximo={regras.questoes.maximo} />
          ) : (
            <ResponderLista
              lista={l}
              semEquipe={semEquipe}
              bloqueio={bloqueio}
              enviar={
                r.somenteLeitura
                  ? null
                  : (respostas, chave) =>
                      gravar(() =>
                        r.atividades.enviarRespostas({ listaId: l.id, chave, respostas }),
                      )()
              }
            />
          )
        }
      </Consulta>
    </Card>
  );
}

function DesafiosDoAluno({ edicao }: { edicao: Edicao }) {
  const turmas = useTurmas(edicao.id);
  const turma = turmas.data?.[0];
  const atividades = useAtividadesDaTurma(turma?.id);
  return (
    <>
      <PageHeader icone="desafio" titulo="Desafios e entregas" />
      <Consulta consulta={turmas}>
        {(lista) =>
          lista.length === 0 ? (
            <EmptyState
              titulo="Você ainda não está vinculado a uma turma nesta edição."
              descricao="Procure a coordenação."
            />
          ) : (
            <Consulta consulta={atividades}>
              {(a) => (
                <div className="flex flex-col gap-6">
                  {a.listas.length > 0 && (
                    <section aria-labelledby="questoes-do-encontro" className="flex flex-col gap-4">
                      <h2 id="questoes-do-encontro" className="font-display text-xl font-semibold">
                        Questões do encontro
                      </h2>
                      {a.listas.map((l) => (
                        <CartaoLista
                          key={l.id}
                          resumo={l}
                          regras={a.regras}
                          semEquipe={!a.desafios.some((d) => d.duplaId) && a.desafios.length > 0}
                        />
                      ))}
                    </section>
                  )}
                  {a.desafios.length === 0 ? (
                    <Alert tom="info" titulo="Nenhum desafio publicado para a sua turma ainda." />
                  ) : (
                    <ListaPaginada
                      rotulo="Desafios e entregas"
                      itens={a.desafios}
                      chave={(d) => d.id}
                      vazio="Nenhum desafio publicado."
                      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                      texto={(d) => [d.titulo, d.enunciado, d.politicaIa].join(' ')}
                    >
                      {(d) => <CartaoDesafio desafio={d} regras={a.regras} />}
                    </ListaPaginada>
                  )}
                </div>
              )}
            </Consulta>
          )
        }
      </Consulta>
    </>
  );
}

export function AlunoDesafiosPage() {
  return <ComEdicao>{(edicao) => <DesafiosDoAluno edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Presença e participação (US2) — docente/mentor registram; coordenação corrige
// ===========================================================================

/** Escolha de turma e encontro compartilhada por Presença e Avaliações. */
function SeletorTurmaEncontro({
  turmas,
  encontros,
  turmaId,
  encontroId,
  onTurma,
  onEncontro,
}: {
  turmas: Turma[];
  encontros: Encontro[];
  turmaId: string;
  encontroId: string;
  onTurma: (id: string) => void;
  onEncontro: (id: string) => void;
}) {
  return (
    <div className="mb-6 grid max-w-2xl gap-4 sm:grid-cols-2">
      <SelectField
        rotulo="Turma"
        value={turmaId}
        onChange={(e) => onTurma(e.target.value)}
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
      />
      <SelectField
        rotulo="Encontro"
        value={encontroId}
        onChange={(e) => onEncontro(e.target.value)}
        opcoes={encontros.map((e) => ({ valor: e.id, rotulo: `${e.numero}. ${e.titulo}` }))}
      />
    </div>
  );
}

function PresencaDoEncontro({ turmaId, encontroId }: { turmaId: string; encontroId: string }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const presencas = usePresencasDaTurma(encontroId, turmaId);
  return (
    <Consulta consulta={presencas}>
      {(dados) => (
        <div className="grid gap-6">
          <Card icone="presenca" titulo="Presença individual">
            <RegistroPresenca
              key={`${encontroId}-${turmaId}`}
              dados={dados}
              bloqueio={bloqueio}
              onSalvar={(registros, justificativa) =>
                gravar(() =>
                  r.atividades.registrarPresencas({
                    encontroId,
                    turmaId,
                    registros,
                    justificativa,
                  }),
                )()
              }
            />
          </Card>
          <Card icone="equipe" titulo="Participação das equipes">
            {dados.equipes.length === 0 ? (
              <EmptyState titulo="Nenhuma equipe formada nesta turma." />
            ) : (
              <div className="grid gap-6">
                {dados.equipes.map((e) => (
                  <section key={e.id} aria-labelledby={`part-${e.id}`}>
                    <h3 id={`part-${e.id}`} className="mb-2 font-semibold">
                      {e.nome ?? e.integrantes.map((i) => i.nome).join(' e ')}
                    </h3>
                    <FormParticipacao
                      key={`${encontroId}-${e.id}`}
                      equipe={e}
                      criterios={dados.regras.participacao.criterios}
                      inicial={dados.participacoes.find((p) => p.duplaId === e.id)?.notas ?? null}
                      bloqueio={bloqueio}
                      onSalvar={(notas, justificativa) =>
                        gravar(() =>
                          r.atividades.registrarParticipacao({
                            encontroId,
                            duplaId: e.id,
                            notas,
                            justificativa,
                          }),
                        )()
                      }
                    />
                  </section>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </Consulta>
  );
}

/** Turma e encontro escolhidos (padrão: os primeiros da lista). */
function ComTurmaEEncontro({
  edicao,
  children,
}: {
  edicao: Edicao;
  children: (turmaId: string, encontroId: string) => ReactNode;
}) {
  const turmas = useTurmas(edicao.id);
  const encontros = useEncontros(edicao.id);
  const [turmaId, setTurmaId] = useState('');
  const [encontroId, setEncontroId] = useState('');
  return (
    <Consulta consulta={turmas}>
      {(listaTurmas) => (
        <Consulta consulta={encontros}>
          {(listaEncontros) => {
            const turma = turmaId || listaTurmas[0]?.id || '';
            const encontro = encontroId || listaEncontros[0]?.id || '';
            return listaTurmas.length === 0 || listaEncontros.length === 0 ? (
              <EmptyState titulo="Nenhuma turma ou encontro disponível." />
            ) : (
              <>
                <SeletorTurmaEncontro
                  turmas={listaTurmas}
                  encontros={listaEncontros}
                  turmaId={turma}
                  encontroId={encontro}
                  onTurma={setTurmaId}
                  onEncontro={setEncontroId}
                />
                {children(turma, encontro)}
              </>
            );
          }}
        </Consulta>
      )}
    </Consulta>
  );
}

function Presenca({ edicao, coordenacao }: { edicao: Edicao; coordenacao: boolean }) {
  return (
    <>
      <PageHeader
        icone="presenca"
        titulo="Presença e participação"
        descricao={
          coordenacao
            ? 'A coordenação corrige registros existentes, com justificativa.'
            : 'Registre a presença individual e a participação de cada equipe.'
        }
      />
      <ComTurmaEEncontro edicao={edicao}>
        {(turmaId, encontroId) => <PresencaDoEncontro turmaId={turmaId} encontroId={encontroId} />}
      </ComTurmaEEncontro>
    </>
  );
}

export function DocentePresencaPage() {
  return <ComEdicao>{(edicao) => <Presenca edicao={edicao} coordenacao={false} />}</ComEdicao>;
}

export function CoordenacaoPresencaPage() {
  return <ComEdicao>{(edicao) => <Presenca edicao={edicao} coordenacao />}</ComEdicao>;
}

// ===========================================================================
// Avaliações (US3) — docente/mentor avaliam; coordenação corrige e prorroga
// ===========================================================================

function TabelaCriterios({ titulo, criterios }: { titulo: string; criterios: CriterioRubrica[] }) {
  const total = criterios.reduce((t, c) => t + c.maximo, 0);
  return (
    <Card icone="avaliacao" titulo={`${titulo} — até ${total} pontos`} nivel={3}>
      <ResponsiveTable
        legenda={titulo}
        chave={(c) => c.id}
        linhas={criterios}
        colunas={[
          { id: 'crit', titulo: 'Critério', valor: (c) => c.rotulo },
          { id: 'max', titulo: 'Máximo', numerica: true, valor: (c) => c.maximo },
        ]}
      />
    </Card>
  );
}

function EquipeAvaliada({
  desafioId,
  equipe,
  regras,
  coordenacao,
}: {
  desafioId: string;
  equipe: EquipeParaAvaliar;
  regras: RegrasDaEdicao;
  coordenacao: boolean;
}) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const ultima = equipe.ultimaEntrega;
  const nome = equipe.nome ?? equipe.integrantes.map((i) => i.nome).join(' e ');
  return (
    <Card icone="equipe" titulo={nome} nivel={3}>
      {ultima ? (
        <p className="mb-3 text-sm">
          Última entrega: versão {ultima.versao} · {ultima.protocolo} ·{' '}
          {formatarDataHora(ultima.recebidaEm)} · por {ultima.autorNome}
          {ultima.atrasoMinutos > 0 && ` · atraso de ${ultima.atrasoMinutos} min`}{' '}
          {ultima.arquivoPath ? (
            <Button
              variante="terciario"
              icone="download"
              onClick={() =>
                void r.atividades
                  .urlArquivo(ultima.arquivoPath!)
                  .then((url) => window.open(url, '_blank', 'noopener'))
              }
            >
              Baixar {ultima.arquivoNome ?? 'arquivo'}
            </Button>
          ) : ultima.link ? (
            <a
              href={ultima.link}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-link underline"
            >
              Abrir link <span className="sr-only">da entrega de {nome}</span>
            </a>
          ) : null}
        </p>
      ) : (
        <p className="mb-3 text-sm text-text-secondary">Nenhuma entrega recebida.</p>
      )}
      <FormAvaliacao
        key={`${desafioId}-${equipe.id}`}
        equipe={equipe}
        regras={regras}
        bloqueio={bloqueio}
        somenteCorrecao={coordenacao}
        onSalvar={(dados) =>
          gravar(() =>
            r.atividades.registrarAvaliacao({ ...dados, desafioId, duplaId: equipe.id }),
          )()
        }
      />
      <details className="mt-4 border-t border-border pt-3">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          Prorrogação ou impedimento
        </summary>
        <FormProrrogacao
          atual={equipe.prorrogacao}
          bloqueio={bloqueio}
          onSalvar={(p) =>
            gravar(() =>
              r.atividades.registrarProrrogacao({ ...p, desafioId, duplaId: equipe.id }),
            )()
          }
        />
      </details>
    </Card>
  );
}

function PainelDoDesafio({ desafioId, coordenacao }: { desafioId: string; coordenacao: boolean }) {
  const painel = usePainelAvaliacao(desafioId);
  return (
    <Consulta consulta={painel}>
      {(p) => (
        <div className="grid gap-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <TabelaCriterios titulo="Entrega prática" criterios={p.regras.entrega.criterios} />
            <TabelaCriterios titulo="Apresentação" criterios={p.regras.apresentacao.criterios} />
          </div>
          {p.equipes.length === 0 ? (
            <EmptyState titulo="Nenhuma equipe nesta turma." />
          ) : (
            p.equipes.map((e) => (
              <EquipeAvaliada
                key={e.id}
                desafioId={desafioId}
                equipe={e}
                regras={p.regras}
                coordenacao={coordenacao}
              />
            ))
          )}
        </div>
      )}
    </Consulta>
  );
}

function Avaliacoes({ edicao, coordenacao }: { edicao: Edicao; coordenacao: boolean }) {
  const desafios = useDesafiosGestao(edicao.id);
  const turmas = useTurmas(edicao.id);
  const [turmaId, setTurmaId] = useState('');
  const [desafioId, setDesafioId] = useState('');
  return (
    <>
      <PageHeader
        icone="avaliacao"
        titulo="Avaliações"
        descricao={
          coordenacao
            ? 'A coordenação corrige avaliações registradas e registra prorrogações.'
            : 'Rubricas de entrega e apresentação, com feedback para a equipe.'
        }
      />
      <Consulta consulta={turmas}>
        {(listaTurmas) => (
          <Consulta consulta={desafios}>
            {(lista) => {
              const turma = turmaId || listaTurmas[0]?.id || '';
              const daTurma = lista.filter(
                (d) => d.estado !== 'rascunho' && d.turmas.includes(turma),
              );
              const desafio = daTurma.some((d) => d.id === desafioId)
                ? desafioId
                : (daTurma[0]?.id ?? '');
              return (
                <>
                  <div className="mb-6 grid max-w-2xl gap-4 sm:grid-cols-2">
                    <SelectField
                      rotulo="Turma"
                      value={turma}
                      onChange={(e) => setTurmaId(e.target.value)}
                      opcoes={listaTurmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
                    />
                    <SelectField
                      rotulo="Desafio"
                      value={desafio}
                      onChange={(e) => setDesafioId(e.target.value)}
                      opcoes={daTurma.map((d) => ({ valor: d.id, rotulo: d.titulo }))}
                    />
                  </div>
                  {desafio ? (
                    <PainelDoDesafio desafioId={desafio} coordenacao={coordenacao} />
                  ) : (
                    <EmptyState
                      icone="desafio"
                      titulo="Nenhum desafio publicado para esta turma."
                    />
                  )}
                </>
              );
            }}
          </Consulta>
        )}
      </Consulta>
    </>
  );
}

export function DocenteAvaliacoesPage() {
  return <ComEdicao>{(edicao) => <Avaliacoes edicao={edicao} coordenacao={false} />}</ComEdicao>;
}

export function CoordenacaoAvaliacoesPage() {
  return <ComEdicao>{(edicao) => <Avaliacoes edicao={edicao} coordenacao />}</ComEdicao>;
}

// ===========================================================================
// Pontuação parcial da equipe (US5)
// ===========================================================================

function PontuacaoDaEquipe({ edicao }: { edicao: Edicao }) {
  const lancamentos = useLancamentosDaEquipe(edicao.id);
  return (
    <Consulta consulta={lancamentos}>
      {(l) => {
        if (!l.equipe) {
          return (
            <>
              <PageHeader icone="pontuacao" titulo="Pontuação da equipe" />
              <EmptyState
                icone="dupla"
                titulo="Você ainda não faz parte de uma equipe."
                descricao="A pontuação aparece quando você estiver numa equipe."
              />
            </>
          );
        }
        const total = l.encontros.reduce(
          (t, e) => t + calcularParcial(e, l.regras).pontuacao.total,
          0,
        );
        return (
          <>
            <PageHeader
              icone="pontuacao"
              titulo="Pontuação da equipe"
              descricao={`${total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} de ${maximoDaEdicao(l.regras)} pontos (parcial) · regras ${l.regras.versao}`}
            />
            <Alert tom="info" titulo="Pontuação parcial">
              Os pontos podem mudar até a publicação do ranking. Componentes ainda não registrados
              aparecem como “Aguardando registro”.
            </Alert>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {l.encontros.map((e) => (
                <PontuacaoDoEncontro key={e.encontroId} encontro={e} regras={l.regras} />
              ))}
            </div>
            <p className="mt-6 text-sm text-text-secondary">
              Discorda de algum lançamento? O pedido de revisão (até 24 horas após a publicação)
              será disponibilizado no Incremento 4. Até lá, procure a coordenação.
            </p>
          </>
        );
      }}
    </Consulta>
  );
}

export function AlunoPontuacaoPage() {
  return <ComEdicao>{(edicao) => <PontuacaoDaEquipe edicao={edicao} />}</ComEdicao>;
}
