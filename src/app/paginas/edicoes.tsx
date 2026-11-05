import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/modules/auth';
import {
  CadastroCursosTurmas,
  CoordenacaoDaEdicao,
  EstadoDaEdicao,
  FormDadosDaEdicao,
  FormEdicao,
  ListaEdicoes,
  SeloDaEdicao,
  type EdicaoGerida,
} from '@/modules/organizacao';
import { FormRegras, HistoricoRegras } from '@/modules/pontuacao';
import { Button, Card, ConfirmDialog, EmptyState, Icon, PageHeader } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import { useEdicaoEmUso } from '../dados/edicaoEmUsoContexto';
import {
  useBloqueioDeEscrita,
  useCadastro,
  useEdicaoAtual,
  useEdicoesQueCoordeno,
  useGravar,
  useHistoricoRegras,
  useRegrasDaEdicaoVigentes,
  useTurmas,
  useVinculos,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';

/** Passos do fluxo da edição (contracts/telas.md), com a situação de cada um. */
function PassosDaEdicao({ edicao }: { edicao: EdicaoGerida }) {
  const turmas = useTurmas(edicao.id).data ?? [];
  const vinculos = useVinculos(edicao.id).data ?? [];
  const ativos = vinculos.filter((v) => v.ativo && !v.derivado);
  const passos = [
    { rotulo: 'Criar edição', feito: true, caminho: null },
    { rotulo: 'Vincular turmas', feito: turmas.length > 0, caminho: '/coordenacao/organizacao' },
    {
      rotulo: 'Alunos e docentes por turma',
      feito: ativos.some((v) => v.papel === 'aluno'),
      caminho: '/coordenacao/organizacao',
    },
    {
      rotulo: 'Mentores por curso',
      feito: ativos.some((v) => v.papel === 'mentor'),
      caminho: '/coordenacao/organizacao',
    },
    { rotulo: 'Ativar', feito: edicao.estado !== 'rascunho', caminho: null },
  ];
  return (
    <ol className="flex flex-col gap-2">
      {passos.map((p, i) => (
        <li key={p.rotulo} className="flex min-h-11 items-center gap-3">
          <Icon nome={p.feito ? 'correta' : 'relogio'} tamanho="sm" />
          <span>
            {i + 1}. {p.rotulo}
            <span className="sr-only">{p.feito ? ' (feito)' : ' (pendente)'}</span>
          </span>
          {p.caminho && (
            // Não encolhe: o conteúdo quebra em qualquer ponto (wrap-anywhere) e partia "Abrir".
            <Link to={p.caminho} className="shrink-0 text-link underline-offset-4 hover:underline">
              Abrir
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Edição em preparação vazia pode ser apagada (FR-016); o servidor confere. */
function ApagarEdicao({ edicao, bloqueio }: { edicao: EdicaoGerida; bloqueio?: string }) {
  const { organizacao } = useRepositorios();
  const gravar = useGravar();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string>();
  return (
    <div className="mt-4 border-t border-border pt-4">
      <Button
        variante="secundario"
        icone="excluir"
        disabled={Boolean(bloqueio)}
        onClick={() => setAberto(true)}
      >
        Apagar edição
      </Button>
      <ConfirmDialog
        aberto={aberto}
        titulo={`Apagar ${edicao.nome}?`}
        descricao="Só uma edição em preparação, sem turmas vinculadas nem pessoas, pode ser apagada."
        rotuloConfirmar="Apagar"
        destrutivo
        carregando={carregando}
        erro={erro}
        onConfirmar={async () => {
          setCarregando(true);
          setErro(undefined);
          try {
            await gravar(() => organizacao.apagarEdicao(edicao.id))();
            setAberto(false);
          } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível apagar a edição.');
          } finally {
            setCarregando(false);
          }
        }}
        onCancelar={() => setAberto(false)}
      />
    </div>
  );
}

/** Regras da edição com versões (spec 011, US1); só leitura em edição encerrada. */
function RegrasDaEdicaoCard({ edicao, bloqueio }: { edicao: EdicaoGerida; bloqueio?: string }) {
  const consulta = useRegrasDaEdicaoVigentes(edicao.id);
  const historico = useHistoricoRegras(edicao.id, null);
  const { regras } = useRepositorios();
  const gravar = useGravar();
  const encerrada = edicao.estado === 'encerrada';
  return (
    <Card titulo="Regras da edição" icone="pontuacao">
      <Consulta consulta={consulta}>
        {(v) => (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Versão vigente: {v.rotulo}.{' '}
              {encerrada
                ? 'Edição encerrada: as regras não mudam mais.'
                : 'Cada encontro usa a versão vigente no seu início.'}
            </p>
            <FormRegras
              key={edicao.id}
              regras={v.regras}
              rotuloSugerido={v.sugestao}
              somenteLeitura={encerrada}
              bloqueio={bloqueio}
              onGravar={(r, rotulo, justificativa) =>
                gravar(() => regras.gravarRegras(edicao.id, v.rotulo, rotulo, r, justificativa))()
              }
            />
          </div>
        )}
      </Consulta>
      <h3 className="mt-6 mb-2 font-semibold">Histórico das regras</h3>
      <Consulta consulta={historico}>{(itens) => <HistoricoRegras itens={itens} />}</Consulta>
    </Card>
  );
}

function DetalheDaEdicao({ edicao }: { edicao: EdicaoGerida }) {
  const { sessao } = useAuth();
  const vinculos = useVinculos(edicao.id).data ?? [];
  const { organizacao } = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  return (
    <>
      <Card titulo={edicao.nome} icone="gestao" acao={<SeloDaEdicao estado={edicao.estado} />}>
        <FormDadosDaEdicao
          key={edicao.id}
          edicao={edicao}
          onSalvar={(e) => gravar(() => organizacao.alterarEdicao(edicao.id, e))()}
          bloqueio={bloqueio}
        />
      </Card>
      <RegrasDaEdicaoCard edicao={edicao} bloqueio={bloqueio} />
      <Card titulo="Passos da edição" icone="checklist">
        <PassosDaEdicao edicao={edicao} />
      </Card>
      <Card titulo="Estado da edição" icone="status">
        <EstadoDaEdicao
          key={edicao.id}
          edicao={edicao}
          bloqueio={bloqueio}
          onAtivar={gravar(() => organizacao.ativarEdicao(edicao.id))}
          onDefinirRegulamentoPublico={(publico) =>
            gravar(() => organizacao.definirRegulamentoPublico(edicao.id, publico))()
          }
          onCarregarPendencias={() => organizacao.pendenciasDaEdicao(edicao.id)}
          onEncerrar={(j) => gravar(() => organizacao.encerrarEdicao(edicao.id, j))()}
        />
        {edicao.estado === 'rascunho' && <ApagarEdicao edicao={edicao} bloqueio={bloqueio} />}
      </Card>
      <Card titulo="Coordenação da edição" icone="permissoes">
        <CoordenacaoDaEdicao
          vinculos={vinculos}
          usuarioAtualId={sessao?.usuarioId ?? null}
          bloqueio={edicao.estado === 'encerrada' ? 'Edição encerrada.' : bloqueio}
          onBuscar={(busca) => organizacao.pessoasParaVincular(edicao.id, busca)}
          onAtribuir={(id) => gravar(() => organizacao.atribuirCoordenacao(edicao.id, id))()}
          onDesativar={(id) => gravar(() => organizacao.desativarCoordenacao(edicao.id, id))()}
        />
      </Card>
    </>
  );
}

/** Edições que a coordenação gere: lista, criação e detalhe da escolhida (spec 010, US1). */
export function CoordenacaoEdicoesPage() {
  const { organizacao } = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const { escolher } = useEdicaoEmUso();
  const escolhida = useEdicaoAtual().data ?? null;
  const [criando, setCriando] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icone="gestao"
        titulo="Edições"
        descricao="Crie a edição, vincule as turmas, faça a enturmação e ative."
      />
      <Consulta consulta={useEdicoesQueCoordeno()}>
        {(edicoes) => {
          const atual = edicoes.find((e) => e.id === escolhida?.id) ?? null;
          return (
            <>
              <Card
                titulo="Edições que coordeno"
                icone="calendario"
                acao={
                  <Button
                    variante="secundario"
                    icone="adicionar"
                    onClick={() => setCriando((v) => !v)}
                    aria-expanded={criando}
                  >
                    Nova edição
                  </Button>
                }
              >
                {edicoes.length ? (
                  <ListaEdicoes
                    edicoes={edicoes}
                    escolhidaId={atual?.id ?? null}
                    onEscolher={escolher}
                  />
                ) : (
                  <EmptyState titulo="Nenhuma edição para gerir." />
                )}
              </Card>
              {criando && (
                <Card titulo="Nova edição" icone="adicionar">
                  <FormEdicao
                    basesPossiveis={edicoes}
                    bloqueio={bloqueio}
                    onCriar={async (chave, e, base) => {
                      const id = await gravar(() => organizacao.criarEdicao(chave, e, base))();
                      escolher(id);
                      return id;
                    }}
                  />
                </Card>
              )}
              {atual && <DetalheDaEdicao edicao={atual} />}
            </>
          );
        }}
      </Consulta>
    </div>
  );
}

/** Cadastro permanente de cursos e turmas da unidade (spec 010, US2). */
export function CoordenacaoCadastroPage() {
  const { organizacao } = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icone="educacao"
        titulo="Cursos e turmas"
        descricao="Cadastro permanente da unidade. Cada edição escolhe as turmas que participam dela."
      />
      <Consulta consulta={useCadastro()}>
        {(cadastro) => (
          <CadastroCursosTurmas
            cadastro={cadastro}
            bloqueio={bloqueio}
            onSalvarCurso={(id, nome, categoria) =>
              gravar(() => organizacao.salvarCursoDoCadastro(id, nome, categoria))()
            }
            onSalvarTurma={(id, cursoId, nome, anoLetivo) =>
              gravar(() => organizacao.salvarTurmaDoCadastro(id, cursoId, nome, anoLetivo))()
            }
            onApagar={(tipo, id) => gravar(() => organizacao.apagarDoCadastro(tipo, id))()}
          />
        )}
      </Consulta>
    </div>
  );
}
