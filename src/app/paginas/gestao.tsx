import { Link } from 'react-router';
import { useAuth } from '@/modules/auth';
import {
  EdicoesDaUnidade,
  EquipeDaUnidade,
  type AcoesDaEquipe,
  type AcoesDeEdicoes,
} from '@/modules/rede';
import { Card, PageHeader } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useBloqueioDeEscrita,
  useEdicoesDaUnidade,
  useEquipeDaUnidade,
  useGravar,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <dt className="text-text-secondary">{rotulo}</dt>
      <dd className="font-display text-2xl font-bold">{valor}</dd>
    </div>
  );
}

/** Início da gestão (spec 016): equipe por função, edições por estado e edições sem coordenação. */
export function GestaoInicioPage() {
  const equipe = useEquipeDaUnidade();
  const edicoes = useEdicoesDaUnidade();
  return (
    <>
      <PageHeader
        titulo="Gestão da unidade"
        icone="gestao"
        descricao="Equipe e edições da unidade. A gestão não vê dados de estudantes."
      />
      <Consulta consulta={equipe}>
        {(membros) => {
          const ativos = membros.filter((m) => m.ativo);
          const com = (f: string) => ativos.filter((m) => m.funcoes.includes(f as never)).length;
          return (
            <Consulta consulta={edicoes}>
              {(lista) => {
                const semCoordenacao = lista.filter(
                  (e) => e.estado !== 'encerrada' && e.coordenacao.every((c) => !c.ativa),
                );
                const porEstado = (estado: string) =>
                  lista.filter((e) => e.estado === estado).length;
                return (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card titulo="Equipe" nivel={2} icone="usuarios">
                      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <Numero rotulo="Coordenação" valor={com('coordenacao')} />
                        <Numero rotulo="Docentes" valor={com('docente')} />
                        <Numero rotulo="Mentores" valor={com('mentor')} />
                        <Numero rotulo="Analistas" valor={com('analista')} />
                      </dl>
                    </Card>
                    <Card titulo="Edições" nivel={2} icone="calendario">
                      <dl className="grid grid-cols-3 gap-3 text-sm">
                        <Numero rotulo="Ativas" valor={porEstado('ativa')} />
                        <Numero rotulo="Em preparação" valor={porEstado('rascunho')} />
                        <Numero rotulo="Encerradas" valor={porEstado('encerrada')} />
                      </dl>
                    </Card>
                    {semCoordenacao.length > 0 && (
                      <Card titulo="Edições sem coordenação ativa" nivel={2} icone="advertencia">
                        <ul
                          aria-label="Edições sem coordenação ativa"
                          className="mb-3 list-disc pl-5 text-sm"
                        >
                          {semCoordenacao.map((e) => (
                            <li key={e.id}>{e.nome}</li>
                          ))}
                        </ul>
                        <Link
                          to="/gestao/edicoes"
                          className="text-sm font-semibold text-link underline"
                        >
                          Indicar a coordenação
                        </Link>
                      </Card>
                    )}
                  </div>
                );
              }}
            </Consulta>
          );
        }}
      </Consulta>
    </>
  );
}

export function GestaoEquipePage() {
  const { rede } = useRepositorios();
  const { sessao } = useAuth();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const acoes: AcoesDaEquipe = {
    cadastrar: (dados) => gravar(() => rede.criarConta({ acao: 'equipe', ...dados }))(),
    definirFuncoes: (usuarioId, funcoes, justificativa) =>
      gravar(() => rede.definirFuncoes(usuarioId, funcoes, justificativa))(),
    desativar: (usuarioId, justificativa) =>
      gravar(() => rede.desativarMembro(usuarioId, justificativa))(),
    reativar: (usuarioId) => gravar(() => rede.reativarMembro(usuarioId))(),
    reenviarConvite: (usuarioId) => gravar(() => rede.reenviarConvite(usuarioId))(),
  };
  return (
    <Consulta consulta={useEquipeDaUnidade()}>
      {(equipe) => (
        <EquipeDaUnidade
          equipe={equipe}
          usuarioAtualId={sessao?.usuarioId ?? ''}
          acoes={acoes}
          bloqueio={bloqueio}
        />
      )}
    </Consulta>
  );
}

export function GestaoEdicoesPage() {
  const { rede } = useRepositorios();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  const acoes: AcoesDeEdicoes = {
    criar: (dados) => gravar(() => rede.criarEdicao(dados))(),
    definirCoordenacao: (edicaoId, usuarioId, ativa, justificativa) =>
      gravar(() => rede.definirCoordenacao(edicaoId, usuarioId, ativa, justificativa))(),
  };
  const equipe = useEquipeDaUnidade();
  const edicoes = useEdicoesDaUnidade();
  return (
    <Consulta consulta={equipe}>
      {(membros) => (
        <Consulta consulta={edicoes}>
          {(lista) => (
            <EdicoesDaUnidade
              edicoes={lista}
              candidatas={membros.filter((m) => m.ativo && m.funcoes.includes('coordenacao'))}
              acoes={acoes}
              bloqueio={bloqueio}
            />
          )}
        </Consulta>
      )}
    </Consulta>
  );
}
