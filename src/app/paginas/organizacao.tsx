import { useState, type ReactNode } from 'react';
import { ROTULO_PAPEL } from '@/modules/acesso';
import { useAuth } from '@/modules/auth';
import { AcoesDupla, FormDupla, type Dupla, type RegistroHistorico } from '@/modules/duplas';
import { FormAmbiente, FormEncontro, situacaoEncontro, type Encontro } from '@/modules/encontros';
import {
  FormConta,
  FormCurso,
  FormTurma,
  FormVinculo,
  type Edicao,
  type Turma,
} from '@/modules/organizacao';
import { formatarData, formatarDataHora } from '@/shared/lib/formatacao';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ListaPaginada,
  NavegacaoSecoes,
  PageHeader,
  ResponsiveTable,
  RetornoEnvio,
  StatusBadge,
  useEnvio,
  type EstadoVisual,
} from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  estudantesElegiveis,
  useAmbientes,
  useBloqueioDeEscrita,
  useCursos,
  useDuplas,
  useEdicaoAtual,
  useEncontros,
  useGravar,
  usePessoas,
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
  const { estado, enviando, enviar } = useEnvio();
  return (
    <>
      <Button
        variante="terciario"
        icone="excluir"
        disabled={Boolean(bloqueio)}
        onClick={() => setAberto(true)}
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
        onCancelar={() => setAberto(false)}
        onConfirmar={async () => {
          if (await enviar(remover, 'Removido.')) setAberto(false);
        }}
      />
      {estado.tipo === 'erro' && <RetornoEnvio estado={estado} />}
    </>
  );
}

const nomeTurma = (turmas: Turma[], id: string | null) =>
  turmas.find((t) => t.id === id)?.nome ?? '—';

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
  const pessoas = usePessoas();

  return (
    <>
      <PageHeader icone="gestao" titulo="Organização da edição" descricao={edicao.nome} />
      <NavegacaoSecoes
        secoes={[
          { id: 'cursos', rotulo: 'Cursos', icone: 'educacao' },
          { id: 'turmas', rotulo: 'Turmas', icone: 'turma' },
          { id: 'vinculos', rotulo: 'Pessoas e vínculos', icone: 'usuarios' },
          { id: 'criar-conta', rotulo: 'Criar conta', icone: 'editarUsuario' },
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
                    valor: (c) => (
                      <BotaoRemover
                        rotulo={`o curso ${c.nome}`}
                        descricao="Turmas do curso também serão removidas. A operação fica registrada na auditoria."
                        bloqueio={bloqueio}
                        remover={gravar(() => r.organizacao.removerCurso(c.id))}
                      />
                    ),
                  },
                ]}
              />
            )}
          </Consulta>
          <div className="mt-4 border-t border-border pt-4">
            <FormCurso
              bloqueio={bloqueio}
              onSalvar={(d) =>
                gravar(() => r.organizacao.salvarCurso({ ...d, edicaoId: edicao.id }))()
              }
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
                    valor: (t) => (
                      <BotaoRemover
                        rotulo={`a turma ${t.nome}`}
                        descricao="Vínculos da turma também serão removidos. Turmas com duplas não podem ser removidas."
                        bloqueio={bloqueio}
                        remover={gravar(() => r.organizacao.removerTurma(t.id))}
                      />
                    ),
                  },
                ]}
              />
            )}
          </Consulta>
          <div className="mt-4 border-t border-border pt-4">
            <FormTurma
              cursos={cursos.data ?? []}
              bloqueio={bloqueio}
              onSalvar={(d) => gravar(() => r.organizacao.salvarTurma(d))()}
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
                    id: 'acoes',
                    titulo: 'Ações',
                    buscavel: false,
                    valor: (v) => (
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

function Duplas({ edicao }: { edicao: Edicao }) {
  const r = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const turmas = useTurmas(edicao.id);
  const vinculos = useVinculos(edicao.id);
  const duplas = useDuplas(edicao.id);
  const [aberta, setAberta] = useState<string | null>(null);
  const elegiveis = estudantesElegiveis(vinculos.data ?? [], duplas.data ?? []);

  return (
    <>
      <PageHeader
        icone="dupla"
        titulo="Duplas"
        descricao="Alterações exigem justificativa e ficam no histórico."
      />
      <Card icone="dupla" titulo="Formar dupla" className="mb-6">
        <FormDupla
          turmas={turmas.data ?? []}
          estudantes={elegiveis}
          bloqueio={bloqueio}
          onFormar={(d) => gravar(() => r.duplas.formar(d))()}
        />
      </Card>
      <Consulta consulta={duplas}>
        {(lista) => (
          <ListaPaginada
            rotulo="Duplas da edição"
            itens={[...lista].sort((a, b) => Number(b.ativa) - Number(a.ativa))}
            chave={(d) => d.id}
            texto={(d) =>
              [
                d.nome,
                d.ativa ? 'Ativa' : 'Desfeita',
                nomeTurma(turmas.data ?? [], d.turmaId),
                ...d.integrantes.map((i) => i.nome),
              ].join(' ')
            }
            vazio="Nenhuma dupla formada."
            vazioIcone="dupla"
            className="grid gap-4 lg:grid-cols-2"
          >
            {(d: Dupla) => (
              <Card
                icone="dupla"
                titulo={d.nome}
                nivel={3}
                acao={
                  <StatusBadge
                    estado={d.ativa ? 'em_andamento' : 'parcial'}
                    rotulo={d.ativa ? 'Ativa' : 'Desfeita'}
                  />
                }
              >
                <p className="text-sm text-text-secondary">
                  {nomeTurma(turmas.data ?? [], d.turmaId)}
                </p>
                <p className="mt-1 font-medium">
                  {d.integrantes.map((i) => i.nome).join(' e ') || 'Sem integrantes ativos'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-border pt-4">
                  {d.ativa && (
                    <Button
                      variante="secundario"
                      icone="editar"
                      aria-expanded={aberta === d.id}
                      onClick={() => setAberta(aberta === d.id ? null : d.id)}
                    >
                      Alterar dupla
                    </Button>
                  )}
                  <Historico duplaId={d.id} />
                </div>
                {d.ativa && aberta === d.id && (
                  <div className="mt-4">
                    <AcoesDupla
                      dupla={d}
                      disponiveis={elegiveis.filter(
                        (e) => e.turmaId === d.turmaId && !e.duplaAtivaId,
                      )}
                      bloqueio={bloqueio}
                      onSubstituir={(x) =>
                        gravar(() => r.duplas.substituir({ duplaId: d.id, ...x }))()
                      }
                      onDesfazer={(justificativa) =>
                        gravar(() => r.duplas.desfazer({ duplaId: d.id, justificativa }))()
                      }
                    />
                  </div>
                )}
              </Card>
            )}
          </ListaPaginada>
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
      <Card icone="notebook" titulo="Ambientes">
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
              ]}
            />
          )}
        </Consulta>
        <div className="mt-4 border-t border-border pt-4">
          <FormAmbiente
            bloqueio={bloqueio}
            onSalvar={(d) => gravar(() => r.encontros.salvarAmbiente(edicao.id, d))()}
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
  const duplas = useDuplas(edicao.id);
  return (
    <>
      <PageHeader
        icone="turma"
        titulo="Minhas turmas"
        descricao="Somente turmas vinculadas ao seu perfil."
      />
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
                  <Consulta consulta={duplas}>
                    {(ds) => (
                      <ResponsiveTable
                        legenda={`Duplas da turma ${t.nome}`}
                        chave={(d) => d.id}
                        linhas={ds.filter((d) => d.turmaId === t.id && d.ativa)}
                        vazio="Nenhuma dupla formada nesta turma."
                        colunas={[
                          { id: 'nome', titulo: 'Dupla', valor: (d) => d.nome },
                          {
                            id: 'int',
                            titulo: 'Integrantes',
                            valor: (d) => d.integrantes.map((i) => i.nome).join(' e '),
                          },
                        ]}
                      />
                    )}
                  </Consulta>
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

function DuplaDoAluno({ edicao }: { edicao: Edicao }) {
  const { sessao } = useAuth();
  const duplas = useDuplas(edicao.id);
  const turmas = useTurmas(edicao.id);
  return (
    <>
      <PageHeader icone="dupla" titulo="Minha dupla" descricao={edicao.nome} />
      <Consulta consulta={duplas}>
        {(lista) => {
          const minha = lista.find(
            (d) => d.ativa && d.integrantes.some((i) => i.estudanteId === sessao?.usuarioId),
          );
          if (!minha) {
            return (
              <EmptyState
                titulo="Você ainda não está em uma dupla ativa."
                descricao="A formação das duplas é feita pela coordenação."
                icone="dupla"
              />
            );
          }
          return (
            <Card icone="dupla" titulo={minha.nome}>
              <p className="text-sm text-text-secondary">
                {nomeTurma(turmas.data ?? [], minha.turmaId)}
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                {minha.integrantes.map((i) => (
                  <li key={i.estudanteId}>
                    {i.nome}
                    {i.estudanteId === sessao?.usuarioId && ' (você)'}
                  </li>
                ))}
              </ul>
            </Card>
          );
        }}
      </Consulta>
    </>
  );
}

export function AlunoDuplaPage() {
  return <ComEdicao>{(edicao) => <DuplaDoAluno edicao={edicao} />}</ComEdicao>;
}
