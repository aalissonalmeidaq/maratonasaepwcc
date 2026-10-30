import { useState, type ReactNode } from 'react';
import { ROTULO_PAPEL } from '@/modules/acesso';
import { useAuth } from '@/modules/auth';
import {
  AcoesDupla,
  ConvitesEquipe,
  FormEquipeDocente,
  NomeEquipe,
  nomeDeExibicao,
  type RegistroHistorico,
} from '@/modules/duplas';
import {
  FormAmbiente,
  FormEncontro,
  situacaoEncontro,
  type Ambiente,
  type Encontro,
} from '@/modules/encontros';
import {
  FormConta,
  FormCurso,
  FormTurma,
  FormVinculo,
  ImportarAlunos,
  AcoesDeAcesso,
  SituacaoDeAcessoBadge,
  textoDaSituacao,
  type Curso,
  type Edicao,
  type Turma,
} from '@/modules/organizacao';
import { formatarData, formatarDataHora } from '@/shared/lib/formatacao';
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  NavegacaoSecoes,
  PageHeader,
  ResponsiveTable,
  StatusBadge,
  useEnvio,
  type EstadoVisual,
} from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useAmbientes,
  useBloqueioDeEscrita,
  useColegas,
  useConvites,
  useCursos,
  useEquipesGestao,
  usePermiteTrio,
  useDuplas,
  useEdicaoAtual,
  useEncontros,
  useGravar,
  usePessoas,
  useReler,
  useSituacaoDeAcesso,
  useTurmas,
  useVinculos,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';

/** Carrega a edição em uso e entrega para a tela. */
function ComEdicao({ children }: { children: (edicao: Edicao) => ReactNode }) {
  return (
    <Consulta consulta={useEdicaoAtual()}>
      {(edicao) =>
        edicao ? (
          children(edicao)
        ) : (
          <EmptyState
            titulo="Nenhuma edição disponível para o seu perfil."
            descricao="Procure a coordenação."
          />
        )
      }
    </Consulta>
  );
}

function BotaoRemover({
  rotulo,
  descricao,
  remover,
  bloqueio,
}: {
  rotulo: string;
  descricao: string;
  remover: () => Promise<void>;
  bloqueio?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const { estado, enviando, enviar, limpar } = useEnvio();
  return (
    <>
      <Button
        variante="terciario"
        icone="excluir"
        disabled={Boolean(bloqueio)}
        onClick={() => {
          limpar();
          setAberto(true);
        }}
      >
        Remover<span className="sr-only"> {rotulo}</span>
      </Button>
      <ConfirmDialog
        aberto={aberto}
        destrutivo
        titulo={`Remover ${rotulo}?`}
        descricao={descricao}
        rotuloConfirmar="Remover"
        carregando={enviando}
        erro={estado.tipo === 'erro' ? estado.mensagem : undefined}
        onCancelar={() => setAberto(false)}
        onConfirmar={async () => {
          if (await enviar(remover, 'Removido.')) setAberto(false);
        }}
      />
    </>
  );
}

const nomeTurma = (turmas: Turma[], id: string | null) =>
  turmas.find((t) => t.id === id)?.nome ?? '—';

/** Ao sair da edição, o foco volta ao "Editar" da linha (o formulário de edição deixa de existir). */
function devolverFoco(id: string) {
  requestAnimationFrame(() => {
    const botoes = document.querySelectorAll<HTMLButtonElement>('[data-editar]');
    [...botoes]
      .find((botao) => botao.dataset.editar === id && botao.getClientRects().length > 0)
      ?.focus();
  });
}

function BotaoEditar({
  id,
  rotulo,
  onEditar,
}: {
  id: string;
  rotulo: string;
  onEditar: () => void;
}) {
  return (
    <Button data-editar={id} variante="terciario" icone="editar" onClick={onEditar}>
      Editar<span className="sr-only"> {rotulo}</span>
    </Button>
  );
}

function TituloDoFormulario({ children }: { children: string }) {
  return <h3 className="mb-3 font-display text-base font-semibold text-text">{children}</h3>;
}

// ===========================================================================
// Coordenação — organização (US1, US2)
// ===========================================================================

function Organizacao({ edicao }: { edicao: Edicao }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const cursos = useCursos(edicao.id);
  const turmas = useTurmas(edicao.id);
  const vinculos = useVinculos(edicao.id);
  const acessos = useSituacaoDeAcesso(edicao.id);
  const situacaoDe = (usuarioId: string) => acessos.data?.find((s) => s.usuarioId === usuarioId);
  const pessoas = usePessoas();
  const duplas = useDuplas(edicao.id);
  const [cursoEmEdicao, setCursoEmEdicao] = useState<Curso | null>(null);
  const [turmaEmEdicao, setTurmaEmEdicao] = useState<Turma | null>(null);

  return (
    <>
      <PageHeader icone="gestao" titulo="Organização da edição" descricao={edicao.nome} />
      <NavegacaoSecoes
        secoes={[
          { id: 'cursos', rotulo: 'Cursos', icone: 'educacao' },
          { id: 'turmas', rotulo: 'Turmas', icone: 'turma' },
          { id: 'vinculos', rotulo: 'Pessoas e vínculos', icone: 'usuarios' },
          { id: 'criar-conta', rotulo: 'Criar conta', icone: 'editarUsuario' },
          { id: 'importar-alunos', rotulo: 'Importar alunos', icone: 'importar' },
        ]}
      />
      <div className="grid gap-6">
        <Card id="cursos" icone="educacao" titulo="Cursos e categorias">
          <Consulta consulta={cursos}>
            {(lista) => (
              <ResponsiveTable
                legenda="Cursos da edição"
                chave={(c) => c.id}
                linhas={lista}
                vazio="Nenhum curso cadastrado."
                colunas={[
                  { id: 'nome', titulo: 'Curso', valor: (c) => c.nome },
                  { id: 'cat', titulo: 'Categoria', valor: (c) => c.categoria },
                  {
                    id: 'acoes',
                    titulo: 'Ações',
                    buscavel: false,
                    compacta: true,
                    valor: (c) => (
                      <div className="flex flex-wrap gap-1">
                        <BotaoEditar
                          id={c.id}
                          rotulo={`o curso ${c.nome}`}
                          onEditar={() => setCursoEmEdicao(c)}
                        />
                        <BotaoRemover
                          rotulo={`o curso ${c.nome}`}
                          descricao="Turmas do curso também serão removidas. A operação fica registrada na auditoria."
                          bloqueio={bloqueio}
                          remover={gravar(() => r.organizacao.removerCurso(c.id))}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </Consulta>
          <div className="mt-4 border-t border-border pt-4">
            <TituloDoFormulario>
              {cursoEmEdicao ? `Editar curso “${cursoEmEdicao.nome}”` : 'Novo curso'}
            </TituloDoFormulario>
            <FormCurso
              key={cursoEmEdicao?.id ?? 'novo'}
              inicial={cursoEmEdicao ?? undefined}
              bloqueio={bloqueio}
              onSalvar={(d) =>
                gravar(() => r.organizacao.salvarCurso({ ...d, edicaoId: edicao.id }))()
              }
              onCancelar={() => {
                if (cursoEmEdicao) devolverFoco(cursoEmEdicao.id);
                setCursoEmEdicao(null);
              }}
            />
          </div>
        </Card>

        <Card id="turmas" icone="turma" titulo="Turmas">
          <Consulta consulta={turmas}>
            {(lista) => (
              <ResponsiveTable
                legenda="Turmas da edição"
                chave={(t) => t.id}
                linhas={lista}
                vazio="Nenhuma turma cadastrada."
                colunas={[
                  { id: 'nome', titulo: 'Turma', valor: (t) => t.nome },
                  {
                    id: 'curso',
                    titulo: 'Curso',
                    valor: (t) => cursos.data?.find((c) => c.id === t.cursoId)?.nome ?? '—',
                  },
                  { id: 'ano', titulo: 'Ano letivo', valor: (t) => t.anoLetivo ?? '—' },
                  {
                    id: 'acoes',
                    titulo: 'Ações',
                    buscavel: false,
                    compacta: true,
                    valor: (t) => (
                      <div className="flex flex-wrap gap-1">
                        <BotaoEditar
                          id={t.id}
                          rotulo={`a turma ${t.nome}`}
                          onEditar={() => setTurmaEmEdicao(t)}
                        />
                        <BotaoRemover
                          rotulo={`a turma ${t.nome}`}
                          descricao="Vínculos da turma também serão removidos. Turmas com duplas não podem ser removidas."
                          bloqueio={bloqueio}
                          remover={gravar(() => r.organizacao.removerTurma(t.id))}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </Consulta>
          <div className="mt-4 border-t border-border pt-4">
            <TituloDoFormulario>
              {turmaEmEdicao ? `Editar turma “${turmaEmEdicao.nome}”` : 'Nova turma'}
            </TituloDoFormulario>
            <FormTurma
              key={turmaEmEdicao?.id ?? 'nova'}
              inicial={turmaEmEdicao ?? undefined}
              cursoBloqueado={
                turmaEmEdicao !== null &&
                (duplas.data ?? []).some((d) => d.turmaId === turmaEmEdicao.id && d.ativa)
              }
              cursos={cursos.data ?? []}
              bloqueio={bloqueio}
              onSalvar={(d) => gravar(() => r.organizacao.salvarTurma(d))()}
              onCancelar={() => {
                if (turmaEmEdicao) devolverFoco(turmaEmEdicao.id);
                setTurmaEmEdicao(null);
              }}
            />
          </div>
        </Card>

        <Card id="vinculos" icone="usuarios" titulo="Pessoas e vínculos">
          <Consulta consulta={vinculos}>
            {(lista) => (
              <ResponsiveTable
                legenda="Vínculos da edição"
                chave={(v) => v.id}
                linhas={lista}
                vazio="Nenhum vínculo registrado."
                colunas={[
                  { id: 'nome', titulo: 'Pessoa', valor: (v) => v.nome },
                  { id: 'papel', titulo: 'Papel', valor: (v) => ROTULO_PAPEL[v.papel] },
                  {
                    id: 'turma',
                    titulo: 'Turma',
                    valor: (v) => nomeTurma(turmas.data ?? [], v.turmaId),
                  },
                  {
                    id: 'sit',
                    titulo: 'Situação',
                    valor: (v) => (
                      <StatusBadge
                        estado={v.ativo ? 'concluido' : 'parcial'}
                        rotulo={v.ativo ? 'Ativo' : 'Inativo'}
                      />
                    ),
                  },
                  {
                    id: 'acesso',
                    titulo: 'Acesso',
                    texto: (v) => textoDaSituacao(situacaoDe(v.usuarioId)),
                    valor: (v) => <SituacaoDeAcessoBadge situacao={situacaoDe(v.usuarioId)} />,
                  },
                  {
                    id: 'acoes',
                    titulo: 'Ações',
                    buscavel: false,
                    valor: (v) => (
                      <div className="flex flex-col items-start gap-1">
                        <Button
                          variante="terciario"
                          disabled={Boolean(bloqueio)}
                          onClick={() =>
                            void gravar(() => r.organizacao.definirVinculoAtivo(v.id, !v.ativo))()
                          }
                        >
                          {v.ativo ? 'Desativar' : 'Reativar'}
                          <span className="sr-only"> vínculo de {v.nome}</span>
                        </Button>
                        <AcoesDeAcesso
                          situacao={situacaoDe(v.usuarioId)}
                          nome={v.nome}
                          bloqueio={bloqueio}
                          onReenviar={(novoEmail) =>
                            gravar(() =>
                              r.organizacao.reenviarConvite({
                                edicaoId: edicao.id,
                                usuarioId: v.usuarioId,
                                novoEmail,
                              }),
                            )()
                          }
                        />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </Consulta>
          <div className="mt-4 border-t border-border pt-4">
            <FormVinculo
              pessoas={pessoas.data ?? []}
              turmas={turmas.data ?? []}
              bloqueio={bloqueio}
              onVincular={(d) =>
                gravar(() => r.organizacao.vincular({ ...d, edicaoId: edicao.id }))()
              }
            />
          </div>
        </Card>

        <Card id="criar-conta" icone="editarUsuario" titulo="Criar conta">
          <FormConta
            turmas={turmas.data ?? []}
            bloqueio={bloqueio}
            onCriar={(d) => gravar(() => r.organizacao.criarConta({ ...d, edicaoId: edicao.id }))()}
          />
        </Card>

        <Card id="importar-alunos" icone="importar" titulo="Importar alunos (CSV)">
          <ImportarAlunos
            turmas={turmas.data ?? []}
            bloqueio={bloqueio}
            onImportar={(turmaId, linhas) =>
              gravar(() => r.organizacao.importarAlunos({ edicaoId: edicao.id, turmaId, linhas }))()
            }
          />
        </Card>
      </div>
    </>
  );
}

export function CoordenacaoOrganizacaoPage() {
  return <ComEdicao>{(edicao) => <Organizacao edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Coordenação — duplas (US3)
// ===========================================================================

function Historico({ duplaId }: { duplaId: string }) {
  const r = useRepositorios();
  const [registros, setRegistros] = useState<RegistroHistorico[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  if (!registros) {
    return (
      <div>
        <Button
          variante="terciario"
          icone="cronograma"
          onClick={() =>
            r.duplas.historico(duplaId).then(setRegistros, (e: Error) => setErro(e.message))
          }
        >
          Ver histórico
        </Button>
        {erro && <p className="text-sm text-error">{erro}</p>}
      </div>
    );
  }
  return (
    <ol aria-label="Histórico de integrantes" className="flex basis-full flex-col gap-2 text-sm">
      {registros.map((h) => (
        <li key={`${h.estudanteId}-${h.entradaEm}`}>
          <strong>{h.nome}</strong> — entrou em {formatarDataHora(h.entradaEm)}
          {h.saidaEm && (
            <>
              ; saiu em {formatarDataHora(h.saidaEm)}. Motivo: {h.motivo}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

const MENSAGEM_EDICAO_ENCERRADA = 'Edição encerrada: somente consulta.';

/** Bloqueio de escrita na gestão de equipes: offline/demonstração ou edição encerrada (FR-017). */
function useBloqueioDeEquipes(edicao: Edicao) {
  const bloqueio = useBloqueioDeEscrita();
  return edicao.estado === 'encerrada' ? MENSAGEM_EDICAO_ENCERRADA : bloqueio;
}

/** Equipes ativas de uma turma para coordenação, docente e mentor (US4). */
function GestaoEquipesDaTurma({
  turma,
  bloqueio,
  podeFormar,
}: {
  turma: Turma;
  bloqueio?: string;
  /** Docente/mentor formam equipe com quem sobrou (FR-010); a coordenação não. */
  podeFormar: boolean;
}) {
  const r = useRepositorios();
  const gravar = useGravar();
  const equipes = useEquipesGestao(turma.id);
  const colegas = useColegas(turma.id);
  const permiteTrio = usePermiteTrio(turma.id);
  const [aberta, setAberta] = useState<string | null>(null);
  const semEquipe = (colegas.data ?? []).filter((c) => !c.temEquipe);
  const trio = permiteTrio.data ?? false;

  return (
    <div className="flex flex-col gap-4">
      <Consulta consulta={equipes}>
        {(lista) =>
          lista.length === 0 ? (
            <p className="text-sm text-text-secondary">Nenhuma equipe formada nesta turma.</p>
          ) : (
            <ul aria-label={`Equipes da turma ${turma.nome}`} className="grid gap-4 lg:grid-cols-2">
              {lista.map((d) => (
                <li key={d.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{nomeDeExibicao(d)}</h3>
                    <StatusBadge
                      estado="em_andamento"
                      rotulo={d.integrantes.length === 3 ? 'Trio' : 'Dupla'}
                    />
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {d.integrantes.map((i) => (
                      <li key={i.estudanteId}>
                        {i.nome}
                        {i.integranteInativo && (
                          <strong className="text-amber-800"> (integrante inativo)</strong>
                        )}
                      </li>
                    ))}
                  </ul>
                  {d.trioEmTurmaPar && (
                    <div className="mt-3">
                      <Alert
                        tom="alerta"
                        titulo="Trio em turma com número par de alunos ativos: avalie o ajuste."
                      />
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-border pt-4">
                    <Button
                      variante="secundario"
                      icone="editar"
                      aria-expanded={aberta === d.id}
                      onClick={() => setAberta(aberta === d.id ? null : d.id)}
                    >
                      Alterar equipe
                    </Button>
                    <Historico duplaId={d.id} />
                  </div>
                  {aberta === d.id && (
                    <div className="mt-4">
                      <AcoesDupla
                        dupla={d}
                        disponiveis={semEquipe}
                        permiteTrio={trio}
                        bloqueio={bloqueio}
                        onSubstituir={(x) =>
                          gravar(() => r.duplas.substituir({ duplaId: d.id, ...x }))()
                        }
                        onIncluir={(x) => gravar(() => r.duplas.incluir({ duplaId: d.id, ...x }))()}
                        onRemover={(x) => gravar(() => r.duplas.remover({ duplaId: d.id, ...x }))()}
                        onDesfazer={(justificativa) =>
                          gravar(() => r.duplas.desfazer({ duplaId: d.id, justificativa }))()
                        }
                        onRenomear={
                          podeFormar
                            ? (x) => gravar(() => r.duplas.renomear({ duplaId: d.id, ...x }))()
                            : undefined
                        }
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </Consulta>
      {podeFormar && (
        <section aria-labelledby={`formar-${turma.id}`} className="border-t border-border pt-4">
          <h3 id={`formar-${turma.id}`} className="mb-3 font-semibold">
            Formar equipe com quem sobrou
          </h3>
          <Consulta consulta={colegas}>
            {() => (
              <FormEquipeDocente
                disponiveis={semEquipe}
                permiteTrio={trio}
                bloqueio={bloqueio}
                onFormar={(x) =>
                  gravar(() => r.duplas.formarPorDocente({ turmaId: turma.id, ...x }))()
                }
              />
            )}
          </Consulta>
        </section>
      )}
    </div>
  );
}

function Duplas({ edicao }: { edicao: Edicao }) {
  const bloqueio = useBloqueioDeEquipes(edicao);
  const turmas = useTurmas(edicao.id);
  const duplas = useDuplas(edicao.id);
  const desfeitas = (duplas.data ?? []).filter((d) => !d.ativa);

  return (
    <>
      <PageHeader
        icone="dupla"
        titulo="Equipes"
        descricao="As equipes são formadas pelos alunos por convite. Alterações exigem justificativa e ficam no histórico."
      />
      {edicao.estado === 'encerrada' && (
        <div className="mb-6">
          <Alert tom="info" titulo={MENSAGEM_EDICAO_ENCERRADA} />
        </div>
      )}
      <Consulta consulta={turmas}>
        {(lista) => (
          <div className="flex flex-col gap-6">
            {lista.map((t) => (
              <Card key={t.id} icone="turma" titulo={t.nome}>
                <GestaoEquipesDaTurma turma={t} bloqueio={bloqueio} podeFormar={false} />
              </Card>
            ))}
            {desfeitas.length > 0 && (
              <Card icone="cronograma" titulo="Equipes desfeitas">
                <ul className="flex flex-col gap-4">
                  {desfeitas.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">
                        {d.nome ?? 'Equipe sem nome'} — {nomeTurma(lista, d.turmaId)}
                      </span>
                      <Historico duplaId={d.id} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </Consulta>
    </>
  );
}

export function CoordenacaoDuplasPage() {
  return <ComEdicao>{(edicao) => <Duplas edicao={edicao} />}</ComEdicao>;
}

// ===========================================================================
// Encontros (US4) — coordenação edita; todos leem
// ===========================================================================

const BADGE_SITUACAO: Record<
  ReturnType<typeof situacaoEncontro>,
  { estado: EstadoVisual; rotulo: string }
> = {
  agendado: { estado: 'agendado', rotulo: 'Agendado' },
  hoje: { estado: 'em_andamento', rotulo: 'Hoje' },
  realizado: { estado: 'concluido', rotulo: 'Realizado' },
  cancelado: { estado: 'nao_enviado', rotulo: 'Cancelado' },
};

const hoje = () => new Date().toLocaleDateString('sv-SE');
const horario = (e: Encontro) => (e.inicio && e.fim ? `${e.inicio}–${e.fim}` : 'A confirmar');

function TabelaEncontros({
  encontros,
  acoes,
}: {
  encontros: Encontro[];
  acoes?: (e: Encontro) => ReactNode;
}) {
  return (
    <ResponsiveTable
      legenda="Encontros da edição"
      chave={(e) => e.id}
      linhas={encontros}
      vazio="Nenhum encontro cadastrado."
      colunas={[
        { id: 'n', titulo: 'Nº', valor: (e) => e.numero, compacta: true },
        { id: 't', titulo: 'Encontro', valor: (e) => e.titulo },
        {
          id: 'd',
          titulo: 'Data',
          valor: (e) => formatarData(e.data, { weekday: 'short' }),
          compacta: true,
        },
        { id: 'h', titulo: 'Horário', valor: horario, compacta: true },
        { id: 'a', titulo: 'Ambiente', valor: (e) => e.ambienteNome ?? 'A confirmar' },
        {
          id: 'o',
          titulo: 'Avaliação objetiva',
          valor: (e) =>
            e.avaliacaoObjetiva === 'questoes' ? 'Questões' : 'Prova oficial (registro)',
        },
        {
          id: 's',
          titulo: 'Situação',
          compacta: true,
          valor: (e) => {
            const b = BADGE_SITUACAO[situacaoEncontro(e, hoje())];
            return <StatusBadge estado={b.estado} rotulo={b.rotulo} />;
          },
        },
        ...(acoes
          ? [{ id: 'acoes', titulo: 'Ações', valor: acoes, buscavel: false, compacta: true }]
          : []),
      ]}
    />
  );
}

function Encontros({ edicao }: { edicao: Edicao }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const encontros = useEncontros(edicao.id);
  const ambientes = useAmbientes(edicao.id);
  const [editando, setEditando] = useState<Encontro | null>(null);
  const [ambienteEmEdicao, setAmbienteEmEdicao] = useState<Ambiente | null>(null);
  const salvar = (d: Parameters<typeof r.encontros.salvarEncontro>[1]) =>
    gravar(() => r.encontros.salvarEncontro(edicao.id, d))();

  return (
    <>
      <PageHeader
        icone="calendario"
        titulo="Encontros"
        descricao={`A edição está configurada com ${edicao.quantidadeEncontros} encontros (regras ${edicao.regrasVersao}).`}
      />
      <Card className="mb-6">
        <Consulta consulta={encontros}>
          {(lista) => (
            <TabelaEncontros
              encontros={lista}
              acoes={(e) => (
                <Button variante="terciario" icone="editar" onClick={() => setEditando(e)}>
                  Editar<span className="sr-only"> {e.titulo}</span>
                </Button>
              )}
            />
          )}
        </Consulta>
      </Card>
      <Card
        icone="calendario"
        titulo={editando ? `Editar ${editando.titulo}` : 'Novo encontro'}
        className="mb-6"
      >
        {editando && (
          <Button
            variante="terciario"
            icone="fechar"
            onClick={() => setEditando(null)}
            className="mb-2"
          >
            Cancelar edição
          </Button>
        )}
        {!encontros.data ? null : !editando &&
          encontros.data.length >= edicao.quantidadeEncontros ? (
          <EmptyState
            titulo="Todos os encontros configurados já foram cadastrados."
            descricao="Para incluir outro, ajuste a quantidade de encontros na configuração da edição. Use “Editar” para alterar um encontro existente."
            icone="calendario"
          />
        ) : (
          <FormEncontro
            // A chave remonta o formulário quando a lista muda, recalculando o próximo número.
            key={editando?.id ?? `novo-${encontros.data.length}`}
            inicial={editando ?? undefined}
            quantidadeEncontros={edicao.quantidadeEncontros}
            numerosExistentes={encontros.data.map((e) => e.numero)}
            ambientes={ambientes.data ?? []}
            bloqueio={bloqueio}
            onSalvar={salvar}
          />
        )}
      </Card>
      <Card id="ambientes" icone="notebook" titulo="Ambientes">
        <Consulta consulta={ambientes}>
          {(lista) => (
            <ResponsiveTable
              legenda="Ambientes"
              chave={(a) => a.id}
              linhas={lista}
              vazio="Nenhum ambiente cadastrado."
              colunas={[
                { id: 'n', titulo: 'Ambiente', valor: (a) => a.nome },
                { id: 'o', titulo: 'Observações', valor: (a) => a.observacoes ?? '—' },
                {
                  id: 'acoes',
                  titulo: 'Ações',
                  buscavel: false,
                  compacta: true,
                  valor: (a) => (
                    <div className="flex flex-wrap gap-1">
                      <BotaoEditar
                        id={a.id}
                        rotulo={`o ambiente ${a.nome}`}
                        onEditar={() => setAmbienteEmEdicao(a)}
                      />
                      <BotaoRemover
                        rotulo={`o ambiente ${a.nome}`}
                        descricao="Ambientes usados em encontros não podem ser removidos: troque o ambiente desses encontros antes. A operação fica registrada na auditoria."
                        bloqueio={bloqueio}
                        remover={gravar(() => r.encontros.removerAmbiente(a.id))}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Consulta>
        <div className="mt-4 border-t border-border pt-4">
          <TituloDoFormulario>
            {ambienteEmEdicao ? `Editar ambiente “${ambienteEmEdicao.nome}”` : 'Novo ambiente'}
          </TituloDoFormulario>
          <FormAmbiente
            key={ambienteEmEdicao?.id ?? 'novo'}
            inicial={ambienteEmEdicao ?? undefined}
            bloqueio={bloqueio}
            onSalvar={(d) => gravar(() => r.encontros.salvarAmbiente(edicao.id, d))()}
            onCancelar={() => {
              if (ambienteEmEdicao) devolverFoco(ambienteEmEdicao.id);
              setAmbienteEmEdicao(null);
            }}
          />
        </div>
      </Card>
    </>
  );
}

export function CoordenacaoEncontrosPage() {
  return <ComEdicao>{(edicao) => <Encontros edicao={edicao} />}</ComEdicao>;
}

export function EncontrosLeituraPage() {
  return <ComEdicao>{(edicao) => <EncontrosLeitura edicao={edicao} />}</ComEdicao>;
}

function EncontrosLeitura({ edicao }: { edicao: Edicao }) {
  const encontros = useEncontros(edicao.id);
  return (
    <>
      <PageHeader icone="calendario" titulo="Encontros" descricao={edicao.nome} />
      <Consulta consulta={encontros}>
        {(lista) => (
          <>
            <Card className="mb-4">
              <TabelaEncontros encontros={lista} />
            </Card>
            {lista
              .filter((e) => e.orientacoes)
              .map((e) => (
                <Card
                  icone="documento"
                  key={e.id}
                  titulo={`Orientações — ${e.titulo}`}
                  nivel={3}
                  className="mb-3"
                >
                  <p className="whitespace-pre-line text-sm">{e.orientacoes}</p>
                </Card>
              ))}
          </>
        )}
      </Consulta>
    </>
  );
}

// ===========================================================================
// Docente e aluno — leitura (US5)
// ===========================================================================

function TurmasDocente({ edicao }: { edicao: Edicao }) {
  const turmas = useTurmas(edicao.id);
  const bloqueio = useBloqueioDeEquipes(edicao);
  return (
    <>
      <PageHeader
        icone="turma"
        titulo="Minhas turmas"
        descricao="Somente turmas vinculadas ao seu perfil."
      />
      {edicao.estado === 'encerrada' && (
        <div className="mb-6">
          <Alert tom="info" titulo={MENSAGEM_EDICAO_ENCERRADA} />
        </div>
      )}
      <Consulta consulta={turmas}>
        {(lista) =>
          lista.length === 0 ? (
            <EmptyState
              titulo="Nenhuma turma vinculada ao seu perfil."
              descricao="Procure a coordenação."
            />
          ) : (
            <div className="grid gap-4">
              {lista.map((t) => (
                <Card icone="turma" key={t.id} titulo={t.nome}>
                  <GestaoEquipesDaTurma turma={t} bloqueio={bloqueio} podeFormar />
                </Card>
              ))}
            </div>
          )
        }
      </Consulta>
    </>
  );
}

export function DocenteTurmasPage() {
  return <ComEdicao>{(edicao) => <TurmasDocente edicao={edicao} />}</ComEdicao>;
}

function EquipeDoAluno({ edicao }: { edicao: Edicao }) {
  const { sessao } = useAuth();
  const eu = sessao?.usuarioId ?? '';
  const r = useRepositorios();
  const gravar = useGravar();
  const reler = useReler();
  const bloqueioDeEscrita = useBloqueioDeEscrita();
  const encerrada = edicao.estado === 'encerrada';
  const bloqueio = encerrada ? MENSAGEM_EDICAO_ENCERRADA : bloqueioDeEscrita;
  const duplas = useDuplas(edicao.id);
  const turmas = useTurmas(edicao.id);
  const turma = turmas.data?.[0];
  const colegas = useColegas(turma?.id);
  const convites = useConvites(edicao.id);
  const permiteTrio = usePermiteTrio(turma?.id);

  return (
    <>
      <PageHeader icone="dupla" titulo="Minha equipe" descricao={edicao.nome} />
      {encerrada && (
        <div className="mb-6">
          <Alert tom="info" titulo={MENSAGEM_EDICAO_ENCERRADA} />
        </div>
      )}
      <Consulta consulta={duplas}>
        {(lista) => {
          const minha = lista.find(
            (d) => d.ativa && d.integrantes.some((i) => i.estudanteId === eu),
          );
          if (minha) {
            return (
              <Card
                icone="dupla"
                titulo={nomeDeExibicao(minha)}
                acao={
                  <StatusBadge
                    estado="concluido"
                    rotulo={minha.integrantes.length === 3 ? 'Trio' : 'Dupla'}
                  />
                }
              >
                <p className="text-sm text-text-secondary">
                  {turma ? turma.nome : nomeTurma(turmas.data ?? [], minha.turmaId)}
                </p>
                <ul className="mt-3 flex flex-col gap-1">
                  {minha.integrantes.map((i) => (
                    <li key={i.estudanteId}>
                      {i.nome}
                      {i.estudanteId === eu && ' (você)'}
                    </li>
                  ))}
                </ul>
                {minha.nome === null && (
                  <div className="mt-6 border-t border-border pt-4">
                    <NomeEquipe
                      bloqueio={bloqueio}
                      onDefinir={(nome) =>
                        gravar(() => r.duplas.definirNome({ duplaId: minha.id, nome }))()
                      }
                    />
                  </div>
                )}
              </Card>
            );
          }
          if (!turma) {
            return (
              <EmptyState
                titulo="Você ainda não está vinculado a uma turma nesta edição."
                descricao="Procure a coordenação."
                icone="dupla"
              />
            );
          }
          return (
            <Card icone="dupla" titulo="Formar equipe">
              <p className="mb-4 text-sm text-text-secondary">
                Convide colegas da sua turma. A equipe é formada quando o convite é aceito; depois
                disso, só a equipe docente ou a coordenação podem alterá-la.
              </p>
              <Consulta consulta={colegas}>
                {(listaColegas) => (
                  <Consulta consulta={convites}>
                    {(listaConvites) => (
                      <ConvitesEquipe
                        eu={eu}
                        colegas={listaColegas}
                        convites={listaConvites}
                        permiteTrio={permiteTrio.data ?? false}
                        bloqueio={bloqueio}
                        onErro={reler}
                        onEnviar={(convidados) =>
                          gravar(() => r.duplas.enviarConvite({ turmaId: turma.id, convidados }))()
                        }
                        onResponder={(conviteId, aceitar) =>
                          gravar(() => r.duplas.responderConvite({ conviteId, aceitar }))()
                        }
                        onCancelar={(conviteId) =>
                          gravar(() => r.duplas.cancelarConvite(conviteId))()
                        }
                        onRetirar={(conviteId) => gravar(() => r.duplas.retirarAceite(conviteId))()}
                      />
                    )}
                  </Consulta>
                )}
              </Consulta>
            </Card>
          );
        }}
      </Consulta>
    </>
  );
}

export function AlunoDuplaPage() {
  return <ComEdicao>{(edicao) => <EquipeDoAluno edicao={edicao} />}</ComEdicao>;
}
