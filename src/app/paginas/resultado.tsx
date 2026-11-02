import { useState } from 'react';
import {
  FormDecisao,
  FormExcecaoPrazo,
  FormManifestacao,
  FormOcorrencia,
  FormPedidoRevisao,
  FormRespostaRevisao,
  FormResultadosProva,
  HistoricoPublicacoes,
  PainelPublicacao,
  TabelaRanking,
  ListaAvisos,
  ListaOcorrencias,
  ListaRevisoes,
  PreviaPontos,
  podeManifestar,
  podePedirRevisao,
  type PedidoRevisao,
  type EstadoOcorrencia,
  type Ocorrencia,
} from '@/modules/resultado';
import type { Edicao, Turma } from '@/modules/organizacao';
import { Link } from 'react-router';
import { Alert, Card, EmptyState, PageHeader, SelectField } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useBloqueioDeEscrita,
  useCursos,
  useHistoricoPublicacoes,
  usePendenciasDaCategoria,
  useRankingPublicado,
  useDesafiosGestao,
  useEncontros,
  useEquipesGestao,
  useGravar,
  useMeusAvisos,
  useOcorrencias,
  usePedidosRevisao,
  usePontosDaMinhaEquipe,
  usePontosDaTurma,
  useResultadosProva,
  useTiposDeOcorrencia,
  useTurmas,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';
import { ComEdicao } from './ComEdicao';
import { usePedidoDaRota } from './usePedidoDaRota';

// ===========================================================================
// Coordenação — prova oficial (US1)
// ===========================================================================

function ResultadosDoEncontro({ encontroId }: { encontroId: string }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const pedidoId = usePedidoDaRota();
  return (
    <Consulta consulta={useResultadosProva(encontroId)}>
      {(resultados) =>
        resultados.length === 0 ? (
          <EmptyState
            titulo="Nenhum estudante em equipe nesta edição."
            descricao="A prova oficial é registrada para estudantes com equipe ativa."
          />
        ) : (
          <FormResultadosProva
            key={encontroId}
            resultados={resultados}
            bloqueio={bloqueio}
            pedidoId={pedidoId}
            onSalvar={(registros, justificativa) =>
              gravar(() =>
                r.resultado.registrarResultadosProva({
                  encontroId,
                  resultados: registros,
                  justificativa,
                  pedidoId,
                }),
              )()
            }
          />
        )
      }
    </Consulta>
  );
}

function ProvaOficial({ edicao }: { edicao: Edicao }) {
  const [encontroId, setEncontroId] = useState('');
  return (
    <>
      <PageHeader
        icone="prova"
        titulo="Prova oficial"
        descricao="Registre a realização e a nota oficial de cada estudante. A nota individual só é vista pela coordenação."
      />
      <Consulta consulta={useEncontros(edicao.id)}>
        {(encontros) => {
          const daProva = encontros.filter((e) => e.avaliacaoObjetiva === 'prova_oficial');
          if (daProva.length === 0) {
            return (
              <EmptyState
                titulo="Nenhum encontro com prova oficial."
                descricao="Configure o componente objetivo de um encontro como prova oficial."
              />
            );
          }
          const atual = encontroId || daProva[0]!.id;
          return (
            <div className="flex flex-col gap-4">
              <SelectField
                rotulo="Encontro da prova"
                opcoes={daProva.map((e) => ({ valor: e.id, rotulo: `${e.numero}. ${e.titulo}` }))}
                value={atual}
                onChange={(e) => setEncontroId(e.target.value)}
              />
              <ResultadosDoEncontro encontroId={atual} />
            </div>
          );
        }}
      </Consulta>
    </>
  );
}

export function CoordenacaoProvaOficialPage() {
  return <ComEdicao>{(edicao) => <ProvaOficial edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Ocorrências (US2): registro pela equipe docente/coordenação, manifestação da equipe e decisão
// ===========================================================================

function useAbrirEvidencia() {
  const r = useRepositorios();
  return (caminho: string) => {
    // Janela aberta no clique (bloqueadores de pop-up); o endereço assinado vem depois.
    const janela = window.open('', '_blank');
    void r.resultado
      .urlEvidencia(caminho)
      .then((url) => {
        if (janela) janela.location.href = url;
        else window.open(url, '_blank', 'noopener');
      })
      .catch(() => janela?.close());
  };
}

function RegistrarOcorrencia({ edicao, turmaId }: { edicao: Edicao; turmaId: string }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const equipes = useEquipesGestao(turmaId);
  const encontros = useEncontros(edicao.id);
  const desafios = useDesafiosGestao(edicao.id);
  const tipos = useTiposDeOcorrencia(edicao.id);
  return (
    <Consulta consulta={equipes}>
      {(listaEquipes) => (
        <Consulta consulta={encontros}>
          {(listaEncontros) => (
            <Consulta consulta={tipos}>
              {(listaTipos) =>
                listaEquipes.length === 0 ? (
                  <EmptyState titulo="Nenhuma equipe ativa nesta turma." />
                ) : (
                  <FormOcorrencia
                    key={turmaId}
                    equipes={listaEquipes.map((e) => ({
                      id: e.id,
                      nome: e.nome ?? e.integrantes.map((i) => i.nome).join(' e '),
                    }))}
                    encontros={listaEncontros.map((e) => ({
                      id: e.id,
                      rotulo: `${e.numero}. ${e.titulo}`,
                    }))}
                    desafios={(desafios.data ?? [])
                      .filter((d) => d.turmas.includes(turmaId) && d.estado !== 'rascunho')
                      .map((d) => ({ id: d.id, titulo: d.titulo }))}
                    tipos={listaTipos}
                    bloqueio={bloqueio}
                    onRegistrar={(dados) =>
                      gravar(() =>
                        r.resultado.registrarOcorrencia({ ...dados, edicaoId: edicao.id }),
                      )()
                    }
                  />
                )
              }
            </Consulta>
          )}
        </Consulta>
      )}
    </Consulta>
  );
}

function SeletorTurma({
  turmas,
  turmaId,
  onTurma,
  todas,
  rotulo = 'Turma',
}: {
  turmas: Turma[];
  turmaId: string;
  onTurma: (id: string) => void;
  todas?: boolean;
  rotulo?: string;
}) {
  return (
    <div className="max-w-sm">
      <SelectField
        rotulo={rotulo}
        placeholder={todas ? 'Todas as turmas' : undefined}
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        value={turmaId}
        onChange={(e) => onTurma(e.target.value)}
      />
    </div>
  );
}

function OcorrenciasDaTurma({ edicaoId, turmaId }: { edicaoId: string; turmaId: string }) {
  const abrir = useAbrirEvidencia();
  return (
    <Consulta consulta={useOcorrencias(edicaoId, turmaId)}>
      {(ocorrencias) => <ListaOcorrencias ocorrencias={ocorrencias} onAbrirEvidencia={abrir} />}
    </Consulta>
  );
}

function OcorrenciasDaGestao({ edicao }: { edicao: Edicao }) {
  const [turmaId, setTurmaId] = useState('');
  return (
    <>
      <PageHeader
        icone="ocorrencia"
        titulo="Ocorrências"
        descricao="Registre o fato, o tipo previsto nas regras e a evidência. A equipe é avisada e pode se manifestar; a coordenação decide."
      />
      <Consulta consulta={useTurmas(edicao.id)}>
        {(turmas) => {
          const atual = turmaId || turmas[0]?.id || '';
          if (!atual) return <EmptyState titulo="Nenhuma turma vinculada." />;
          return (
            <div className="flex flex-col gap-6">
              <SeletorTurma turmas={turmas} turmaId={atual} onTurma={setTurmaId} />
              <Card icone="ocorrencia" titulo="Registrar ocorrência">
                <RegistrarOcorrencia edicao={edicao} turmaId={atual} />
              </Card>
              <Card icone="checklist" titulo="Ocorrências da turma">
                <OcorrenciasDaTurma edicaoId={edicao.id} turmaId={atual} />
              </Card>
            </div>
          );
        }}
      </Consulta>
    </>
  );
}

export function DocenteOcorrenciasPage() {
  return <ComEdicao>{(edicao) => <OcorrenciasDaGestao edicao={edicao} />}</ComEdicao>;
}

function AcoesDaEquipe({ o, onConcluido }: { o: Ocorrencia; onConcluido: (m: string) => void }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const agora = new Date();
  if (podeManifestar(o, agora)) {
    return (
      <FormManifestacao
        bloqueio={bloqueio}
        onEnviar={async (texto) => {
          await gravar(() => r.resultado.enviarManifestacao(o.id, texto))();
          // A ocorrência muda de estado e o formulário sai: o retorno fica na página.
          onConcluido(`Manifestação enviada sobre a ocorrência de ${o.tipoRotulo.toLowerCase()}.`);
        }}
      />
    );
  }
  if (
    podePedirRevisao(
      { objeto: 'ocorrencia', estadoOcorrencia: o.estado, prazo: o.prazoRevisao },
      agora,
    )
  ) {
    return (
      <details className="border-t border-border pt-3">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          Pedir revisão da decisão
        </summary>
        <FormPedidoRevisao
          objeto="ocorrencia"
          prazo={o.prazoRevisao}
          bloqueio={bloqueio}
          onPedir={(d) =>
            gravar(() =>
              r.resultado.pedirRevisao({
                chave: d.chave,
                objeto: 'ocorrencia',
                ocorrenciaId: o.id,
                justificativa: d.justificativa,
              }),
            )()
          }
        />
      </details>
    );
  }
  return null;
}

function OcorrenciasDaEquipe({ edicao }: { edicao: Edicao }) {
  const abrir = useAbrirEvidencia();
  const [retorno, setRetorno] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        icone="ocorrencia"
        titulo="Ocorrências da equipe"
        descricao="Visíveis só à sua equipe, à equipe docente da turma e à coordenação. Nunca aparecem no ranking."
      />
      {retorno && <Alert tom="sucesso" titulo={retorno} anunciar />}
      <Consulta consulta={useOcorrencias(edicao.id)}>
        {(ocorrencias) => (
          <ListaOcorrencias
            ocorrencias={ocorrencias}
            onAbrirEvidencia={abrir}
            acoes={(o) => <AcoesDaEquipe o={o} onConcluido={setRetorno} />}
          />
        )}
      </Consulta>
    </>
  );
}

export function AlunoOcorrenciasPage() {
  return <ComEdicao>{(edicao) => <OcorrenciasDaEquipe edicao={edicao} />}</ComEdicao>;
}

function AcoesDaCoordenacao({ o, edicao }: { o: Ocorrencia; edicao: Edicao }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const tipos = useTiposDeOcorrencia(edicao.id);
  const pedidoId = usePedidoDaRota();
  if (o.decisao && !pedidoId) return null;
  const plagio = (tipos.data ?? []).some((t) => t.id === o.tipo && 'zeraEntrega' in t);
  return (
    <div className="grid gap-4 border-t border-border pt-3 md:grid-cols-2">
      <section aria-label={`Decidir ocorrência de ${o.duplaNome}`}>
        <FormDecisao
          plagio={plagio}
          bloqueio={bloqueio}
          rotulo={o.decisao ? 'Registrar nova decisão (revisão)' : undefined}
          onDecidir={(d) =>
            gravar(() =>
              r.resultado.decidirOcorrencia({
                ocorrenciaId: o.id,
                ...d,
                pedidoId: o.decisao ? pedidoId : null,
              }),
            )()
          }
        />
      </section>
      {o.estado === 'registrada' && (
        <section aria-label={`Exceção de prazo de manifestação de ${o.duplaNome}`}>
          <FormExcecaoPrazo
            bloqueio={bloqueio}
            onRegistrar={(d) =>
              gravar(() =>
                r.resultado.registrarExcecaoPrazo({
                  duplaId: o.duplaId,
                  objeto: 'manifestacao',
                  ocorrenciaId: o.id,
                  ...d,
                }),
              )()
            }
          />
        </section>
      )}
    </div>
  );
}

const ESTADOS_FILTRO: { valor: EstadoOcorrencia; rotulo: string }[] = [
  { valor: 'registrada', rotulo: 'Registradas' },
  { valor: 'manifestada', rotulo: 'Com manifestação' },
  { valor: 'confirmada', rotulo: 'Confirmadas' },
  { valor: 'arquivada', rotulo: 'Arquivadas' },
];

function DecisoesDaCoordenacao({
  edicao,
  turmaId,
  estado,
}: {
  edicao: Edicao;
  turmaId: string;
  estado: string;
}) {
  const abrir = useAbrirEvidencia();
  return (
    <Consulta consulta={useOcorrencias(edicao.id, turmaId || null)}>
      {(ocorrencias) => (
        <ListaOcorrencias
          ocorrencias={ocorrencias.filter((o) => !estado || o.estado === estado)}
          onAbrirEvidencia={abrir}
          acoes={(o) => <AcoesDaCoordenacao o={o} edicao={edicao} />}
        />
      )}
    </Consulta>
  );
}

function OcorrenciasDaCoordenacao({ edicao }: { edicao: Edicao }) {
  const [turmaId, setTurmaId] = useState('');
  const [estado, setEstado] = useState('');
  const [registrarEm, setRegistrarEm] = useState('');
  return (
    <>
      <PageHeader
        icone="ocorrencia"
        titulo="Ocorrências e revisões"
        descricao="A decisão só é aceita depois da manifestação da equipe ou do fim do prazo. Toda decisão exige justificativa."
      />
      <Consulta consulta={useTurmas(edicao.id)}>
        {(turmas) => {
          const turmaDoRegistro = registrarEm || turmas[0]?.id || '';
          return (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-4">
                <SeletorTurma turmas={turmas} turmaId={turmaId} onTurma={setTurmaId} todas />
                <div className="max-w-sm">
                  <SelectField
                    rotulo="Situação"
                    placeholder="Todas"
                    opcoes={ESTADOS_FILTRO}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                  />
                </div>
              </div>
              <DecisoesDaCoordenacao edicao={edicao} turmaId={turmaId} estado={estado} />
              {turmaDoRegistro && (
                <Card icone="ocorrencia" titulo="Registrar ocorrência">
                  <div className="flex flex-col gap-4">
                    <SeletorTurma
                      rotulo="Turma da equipe"
                      turmas={turmas}
                      turmaId={turmaDoRegistro}
                      onTurma={setRegistrarEm}
                    />
                    <RegistrarOcorrencia edicao={edicao} turmaId={turmaDoRegistro} />
                  </div>
                </Card>
              )}
            </div>
          );
        }}
      </Consulta>
    </>
  );
}

export function CoordenacaoOcorrenciasPage() {
  return <ComEdicao>{(edicao) => <OcorrenciasDaCoordenacao edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Avisos no aplicativo (FR-026), todos os perfis
// ===========================================================================

export function AvisosPage() {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  return (
    <>
      <PageHeader
        icone="notificacoes"
        titulo="Avisos"
        descricao="Ocorrências, decisões, publicações do ranking e respostas de revisão. Os prazos contam do horário do servidor."
      />
      <Consulta consulta={useMeusAvisos()}>
        {(avisos) => (
          <ListaAvisos
            avisos={avisos.itens}
            bloqueio={bloqueio}
            onMarcar={(ids) => gravar(() => r.resultado.marcarAvisosLidos(ids))()}
          />
        )}
      </Consulta>
    </>
  );
}

// ===========================================================================
// Prévia dos pontos oficiais (US3): aluno (própria equipe) e equipe docente (turma)
// ===========================================================================

function PontuacaoDaEquipe({ edicao }: { edicao: Edicao }) {
  return (
    <>
      <PageHeader
        icone="pontuacao"
        titulo="Pontuação da equipe"
        descricao="Pontos calculados no servidor com as regras da edição."
      />
      <Alert tom="info" titulo="Prévia — não oficial">
        Os pontos podem mudar até a publicação do ranking; só a versão publicada é oficial.
        Componentes ainda não registrados aparecem como “Aguardando registro”.
      </Alert>
      <div className="mt-4">
        <Consulta consulta={usePontosDaMinhaEquipe(edicao.id)}>
          {(equipe) =>
            equipe ? (
              <PreviaPontos equipes={[equipe]} modo="equipe" />
            ) : (
              <EmptyState
                icone="dupla"
                titulo="Você ainda não faz parte de uma equipe."
                descricao="A pontuação aparece quando você estiver numa equipe."
              />
            )
          }
        </Consulta>
      </div>
      <p className="mt-6 text-sm text-text-secondary">
        Discorda de algum ponto? Quando o ranking for publicado como provisório, a equipe pode pedir
        revisão em até 24 horas pela página <Link to="/aluno/ranking">Ranking</Link>.
      </p>
    </>
  );
}

export function AlunoPontuacaoPage() {
  return <ComEdicao>{(edicao) => <PontuacaoDaEquipe edicao={edicao} />}</ComEdicao>;
}

function PontosDaTurma({ turmaId }: { turmaId: string }) {
  return (
    <Consulta consulta={usePontosDaTurma(turmaId)}>
      {(equipes) => <PreviaPontos equipes={equipes} modo="turma" />}
    </Consulta>
  );
}

function PontosDaGestao({ edicao }: { edicao: Edicao }) {
  const [turmaId, setTurmaId] = useState('');
  return (
    <>
      <PageHeader
        icone="pontuacao"
        titulo="Pontos da turma"
        descricao="Prévia dos pontos oficiais de cada equipe, por encontro e componente. Notas individuais da prova não aparecem."
      />
      <Consulta consulta={useTurmas(edicao.id)}>
        {(turmas) => {
          const atual = turmaId || turmas[0]?.id || '';
          if (!atual) return <EmptyState titulo="Nenhuma turma vinculada." />;
          return (
            <div className="flex flex-col gap-4">
              <SeletorTurma turmas={turmas} turmaId={atual} onTurma={setTurmaId} />
              <Alert tom="info" titulo="Prévia — não oficial">
                Só a versão publicada do ranking é oficial.
              </Alert>
              <PontosDaTurma turmaId={atual} />
              <Card icone="ranking" titulo="Ranking publicado da categoria">
                <RankingPublicado edicaoId={edicao.id} />
              </Card>
            </div>
          );
        }}
      </Consulta>
    </>
  );
}

export function DocentePontosPage() {
  return <ComEdicao>{(edicao) => <PontosDaGestao edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Ranking publicado (US4): aluno, equipe docente e coordenação
// ===========================================================================

function RankingPublicado({ edicaoId, categoria }: { edicaoId: string; categoria?: string }) {
  return (
    <Consulta consulta={useRankingPublicado(edicaoId, categoria ?? null)}>
      {(publicacao) => <TabelaRanking publicacao={publicacao} />}
    </Consulta>
  );
}

const AVISO_DESEMPATE =
  'O ranking mostra apenas o total de cada equipe; notas individuais não são exibidas. Desempate: entrega prática, depois questões/prova oficial, depois presença.';

function PedirRevisaoDosPontos({ edicao }: { edicao: Edicao }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const publicacao = useRankingPublicado(edicao.id, null);
  const encontros = useEncontros(edicao.id);
  const p = publicacao.data;
  if (
    !p ||
    !p.posicoes.some((x) => x.minha) ||
    !podePedirRevisao(
      { objeto: 'publicacao', estadoPublicacao: p.estado, prazo: p.revisaoAte },
      new Date(),
    )
  ) {
    return null;
  }
  return (
    <Card icone="revisao" titulo="Pedir revisão dos pontos" className="mt-4">
      <FormPedidoRevisao
        objeto="publicacao"
        prazo={p.revisaoAte}
        encontros={(encontros.data ?? []).map((e) => ({
          id: e.id,
          rotulo: `${e.numero}. ${e.titulo}`,
        }))}
        bloqueio={bloqueio}
        onPedir={(d) =>
          gravar(() =>
            r.resultado.pedirRevisao({
              chave: d.chave,
              objeto: 'publicacao',
              publicacaoId: p.id,
              componente: d.componente,
              encontroId: d.encontroId,
              justificativa: d.justificativa,
            }),
          )()
        }
      />
    </Card>
  );
}

function RankingDaEquipe({ edicao }: { edicao: Edicao }) {
  return (
    <>
      <PageHeader icone="ranking" titulo="Ranking" descricao="Versão publicada pela coordenação." />
      <Alert tom="info" titulo="Classificação da sua categoria">
        {AVISO_DESEMPATE}
      </Alert>
      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        <RankingPublicado edicaoId={edicao.id} />
      </div>
      <PedirRevisaoDosPontos edicao={edicao} />
    </>
  );
}

export function AlunoRankingPage() {
  return <ComEdicao>{(edicao) => <RankingDaEquipe edicao={edicao} />}</ComEdicao>;
}

function PublicacaoDaCategoria({ edicao, categoria }: { edicao: Edicao; categoria: string }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const historico = useHistoricoPublicacoes(edicao.id, categoria);
  return (
    <div className="flex flex-col gap-6">
      <Card icone="ranking" titulo="Publicar">
        <Consulta consulta={usePendenciasDaCategoria(edicao.id, categoria)}>
          {(pendencias) => (
            <Consulta consulta={historico}>
              {(versoes) => (
                <PainelPublicacao
                  key={categoria}
                  pendencias={pendencias}
                  versaoAtual={versoes[0]?.versao ?? null}
                  bloqueio={bloqueio}
                  onPublicar={(d) =>
                    gravar(() =>
                      r.resultado.publicarRanking({ edicaoId: edicao.id, categoria, ...d }),
                    )()
                  }
                />
              )}
            </Consulta>
          )}
        </Consulta>
      </Card>
      <Card icone="trofeu" titulo="Última versão publicada">
        <RankingPublicado edicaoId={edicao.id} categoria={categoria} />
      </Card>
      <Card icone="checklist" titulo="Histórico de versões">
        <Consulta consulta={historico}>
          {(versoes) => <HistoricoPublicacoes versoes={versoes} />}
        </Consulta>
      </Card>
    </div>
  );
}

function RankingDaCoordenacao({ edicao }: { edicao: Edicao }) {
  const [categoria, setCategoria] = useState('');
  return (
    <>
      <PageHeader
        icone="ranking"
        titulo="Ranking"
        descricao="Cálculo oficial no servidor com as regras da edição; desempate: entrega → questões/prova → presença."
      />
      <Consulta consulta={useCursos(edicao.id)}>
        {(cursos) => {
          const categorias = [...new Set(cursos.map((c) => c.categoria))].sort((a, b) =>
            a.localeCompare(b, 'pt-BR'),
          );
          const atual = categoria || categorias[0] || '';
          if (!atual) return <EmptyState titulo="Nenhuma categoria cadastrada nesta edição." />;
          return (
            <div className="flex flex-col gap-6">
              <div className="max-w-sm">
                <SelectField
                  rotulo="Categoria"
                  opcoes={categorias.map((c) => ({ valor: c, rotulo: c }))}
                  value={atual}
                  onChange={(e) => setCategoria(e.target.value)}
                />
              </div>
              <PublicacaoDaCategoria edicao={edicao} categoria={atual} />
            </div>
          );
        }}
      </Consulta>
    </>
  );
}

export function CoordenacaoRankingPage() {
  return <ComEdicao>{(edicao) => <RankingDaCoordenacao edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Pedidos de revisão (US5): equipe e coordenação
// ===========================================================================

function RevisoesDaEquipe({ edicao }: { edicao: Edicao }) {
  return (
    <>
      <PageHeader
        icone="revisao"
        titulo="Pedidos de revisão"
        descricao="Pedidos da sua equipe e as respostas da coordenação."
      />
      <Consulta consulta={usePedidosRevisao(edicao.id)}>
        {(pedidos) => <ListaRevisoes pedidos={pedidos} />}
      </Consulta>
    </>
  );
}

export function AlunoRevisoesPage() {
  return <ComEdicao>{(edicao) => <RevisoesDaEquipe edicao={edicao} />}</ComEdicao>;
}

/** Atalho da coordenação à correção de origem, já ligada ao pedido (R7). */
function linkCorrecao(p: PedidoRevisao): string | null {
  const q = `?pedido=${p.id}`;
  if (p.objeto === 'ocorrencia') return `/coordenacao/ocorrencias${q}`;
  switch (p.componente) {
    case 'presenca':
    case 'participacao':
      return `/coordenacao/presenca${q}`;
    case 'entrega':
    case 'apresentacao':
      return `/coordenacao/avaliacoes${q}`;
    case 'avaliacaoObjetiva':
      return `/coordenacao/prova-oficial${q}`;
    default:
      return null;
  }
}

function RespostaDoPedido({
  p,
  onConcluido,
}: {
  p: PedidoRevisao;
  onConcluido: (m: string) => void;
}) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  if (p.estado !== 'aberto') return null;
  return (
    <section
      aria-label={`Responder pedido de ${p.duplaNome}`}
      className="border-t border-border pt-3"
    >
      <FormRespostaRevisao
        bloqueio={bloqueio}
        onResponder={async (d) => {
          await gravar(() => r.resultado.responderRevisao({ pedidoId: p.id, ...d }))();
          // O pedido deixa de estar aberto e sai da lista filtrada: o retorno fica na página.
          onConcluido(
            `Resposta registrada: pedido de ${p.duplaNome} ${d.resposta === 'deferido' ? 'deferido' : 'indeferido'}.`,
          );
        }}
      />
    </section>
  );
}

function RevisoesDaCoordenacao({ edicao }: { edicao: Edicao }) {
  const [estado, setEstado] = useState('aberto');
  const [retorno, setRetorno] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        icone="revisao"
        titulo="Pedidos de revisão"
        descricao="Corrija o registro de origem pelo atalho (a correção fica ligada ao pedido) e responda com justificativa. O ranking publicado só muda numa nova publicação."
      />
      <div className="mb-4 max-w-sm">
        <SelectField
          rotulo="Situação"
          placeholder="Todos"
          opcoes={[
            { valor: 'aberto', rotulo: 'Abertos' },
            { valor: 'deferido', rotulo: 'Deferidos' },
            { valor: 'indeferido', rotulo: 'Indeferidos' },
          ]}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        />
      </div>
      {retorno && <Alert tom="sucesso" titulo={retorno} anunciar />}
      <Consulta consulta={usePedidosRevisao(edicao.id)}>
        {(pedidos) => (
          <ListaRevisoes
            pedidos={pedidos.filter((p) => !estado || p.estado === estado)}
            linkCorrecao={linkCorrecao}
            acoes={(p) => <RespostaDoPedido p={p} onConcluido={setRetorno} />}
          />
        )}
      </Consulta>
    </>
  );
}

export function CoordenacaoRevisoesPage() {
  return <ComEdicao>{(edicao) => <RevisoesDaCoordenacao edicao={edicao} />}</ComEdicao>;
}
