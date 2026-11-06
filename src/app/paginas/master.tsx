import { Link } from 'react-router';
import { useAuth } from '@/modules/auth';
import {
  Masters,
  TransferirConta,
  Unidades,
  type AcoesDeMasters,
  type AcoesDeUnidades,
  type Unidade,
} from '@/modules/rede';
import { novaChaveDeEnvio } from '@/shared/lib/chave';
import { Card, PageHeader } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useBloqueioDeEscrita,
  useEquipeDaUnidadeDaRede,
  useGravar,
  useMasters,
  useUnidades,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';

/** Início do master (spec 016): unidades sem gestão e o resumo da rede. */
export function MasterInicioPage() {
  const unidades = useUnidades();
  const masters = useMasters();
  return (
    <>
      <PageHeader
        titulo="Rede"
        icone="administracao"
        descricao="Unidades, contas de gestão e masters da instalação. O master não vê dados de estudantes."
      />
      <Consulta consulta={unidades}>
        {(lista) => {
          const ativas = lista.filter((u) => u.ativa);
          const semGestao = ativas.filter((u) => u.gestao.every((g) => !g.ativa));
          return (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card titulo="Unidades sem gestão" nivel={2} icone="advertencia">
                {semGestao.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    Todas as unidades ativas têm gestão.
                  </p>
                ) : (
                  <>
                    <ul aria-label="Unidades sem gestão" className="mb-3 list-disc pl-5 text-sm">
                      {semGestao.map((u) => (
                        <li key={u.id}>{u.nome}</li>
                      ))}
                    </ul>
                    <Link
                      to="/master/unidades"
                      className="text-sm font-semibold text-link underline"
                    >
                      Cadastrar a gestão
                    </Link>
                  </>
                )}
              </Card>
              <Card titulo="Resumo" nivel={2} icone="estatisticas">
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-text-secondary">Unidades ativas</dt>
                    <dd className="font-display text-2xl font-bold">{ativas.length}</dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Unidades desativadas</dt>
                    <dd className="font-display text-2xl font-bold">
                      {lista.length - ativas.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Masters ativos</dt>
                    <dd className="font-display text-2xl font-bold">
                      {masters.data?.filter((m) => m.ativo).length ?? '—'}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>
          );
        }}
      </Consulta>
    </>
  );
}

/** Mensagem do servidor depois que a unidade já foi criada, mas a gestão não (cadastro em 2 passos). */
function mensagemDe(e: unknown) {
  return e instanceof Error ? e.message : 'Não foi possível criar a conta.';
}

/** Equipe de uma unidade e transferência de conta (spec 019): o servidor decide e recusa. */
function EquipeParaTransferir({ unidade, unidades }: { unidade: Unidade; unidades: Unidade[] }) {
  const { rede } = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  return (
    <Consulta consulta={useEquipeDaUnidadeDaRede(unidade.id)}>
      {(membros) => (
        <TransferirConta
          unidade={unidade}
          membros={membros}
          destinos={unidades}
          bloqueio={bloqueio}
          transferir={async (dados) => {
            await gravar(() =>
              rede.transferirConta({
                chave: novaChaveDeEnvio(),
                usuarioId: dados.usuarioId,
                unidadeOrigemId: unidade.id,
                unidadeDestinoId: dados.unidadeDestinoId,
                justificativa: dados.justificativa,
              }),
            )();
          }}
        />
      )}
    </Consulta>
  );
}

export function MasterUnidadesPage() {
  const { rede } = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const acoes: AcoesDeUnidades = {
    async cadastrar(chave, { nome, gestao }) {
      let falhaDaGestao: unknown = null;
      // A lista é atualizada mesmo quando só a conta de gestão falha (a unidade já existe).
      const resultado = await gravar(async () => {
        const id = await rede.cadastrarUnidade(chave, nome);
        if (!gestao) return { conviteEnviado: null as boolean | null };
        try {
          const conta = await rede.criarConta({ acao: 'gestao', ...gestao, unidadeId: id });
          return { conviteEnviado: conta.conviteEnviado as boolean | null };
        } catch (e) {
          falhaDaGestao = e;
          return { conviteEnviado: null as boolean | null };
        }
      })();
      if (falhaDaGestao)
        throw new Error(
          `A unidade foi cadastrada, mas a conta de gestão não: ${mensagemDe(falhaDaGestao)} Use "Acrescentar gestão" na lista.`,
        );
      return resultado;
    },
    renomear: (id, nome) => gravar(() => rede.renomearUnidade(id, nome))(),
    definirSituacao: (id, ativa, justificativa) =>
      gravar(() => rede.definirSituacaoUnidade(id, ativa, justificativa))(),
    acrescentarGestao: (unidadeId, conta) =>
      gravar(() => rede.criarConta({ acao: 'gestao', ...conta, unidadeId }))(),
    definirGestao: (usuarioId, ativa, justificativa) =>
      gravar(() => rede.definirGestao(usuarioId, ativa, justificativa))(),
    reenviarConvite: (usuarioId) => gravar(() => rede.reenviarConvite(usuarioId))(),
  };
  return (
    <Consulta consulta={useUnidades()}>
      {(unidades) => (
        <Unidades
          unidades={unidades}
          acoes={acoes}
          bloqueio={bloqueio}
          equipeDe={(u) => <EquipeParaTransferir unidade={u} unidades={unidades} />}
        />
      )}
    </Consulta>
  );
}

export function MasterMastersPage() {
  const { rede } = useRepositorios();
  const { sessao } = useAuth();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const acoes: AcoesDeMasters = {
    convidar: (conta) => gravar(() => rede.criarConta({ acao: 'master', ...conta }))(),
    definirMaster: (usuarioId, ativo, justificativa) =>
      gravar(() => rede.definirMaster(usuarioId, ativo, justificativa))(),
    reenviarConvite: (usuarioId) => gravar(() => rede.reenviarConvite(usuarioId))(),
  };
  return (
    <Consulta consulta={useMasters()}>
      {(masters) => (
        <Masters
          masters={masters}
          usuarioAtualId={sessao?.usuarioId ?? ''}
          acoes={acoes}
          bloqueio={bloqueio}
        />
      )}
    </Consulta>
  );
}
