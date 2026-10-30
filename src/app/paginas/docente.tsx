import { painelDocente } from '@/modules/demo';
import { REGRAS_PILOTO, type CriterioRubrica } from '@/modules/pontuacao';
import { formatarData } from '@/shared/lib/formatacao';
import {
  Alert,
  Card,
  EmConstrucao,
  EmptyState,
  PageHeader,
  ResponsiveTable,
  StatCard,
  StatusBadge,
} from '@/shared/ui';
import { Atalhos } from '../layout/Atalhos';
import { ComDadosDemo } from './comum';

type Painel = ReturnType<typeof painelDocente>;
const carregar = (s: { usuarioId: string }) => painelDocente(s.usuarioId);

export function DocenteInicioPage() {
  return (
    <ComDadosDemo carregar={carregar} foraDaDemo={<Atalhos area="docente" />}>
      {(p: Painel) => (
        <>
          <PageHeader
            icone="inicio"
            titulo={`Olá, ${p.docente?.nome ?? 'docente'}`}
            descricao="Turmas autorizadas, presenças e avaliações pendentes."
          />
          <Atalhos area="docente" />
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icone="turma" rotulo="Turmas vinculadas" valor={p.turmas.length} />
            <StatCard
              icone="dupla"
              acento="ciano"
              rotulo="Duplas acompanhadas"
              valor={p.duplas.length}
            />
            <StatCard
              icone="avaliacao"
              acento="coral"
              rotulo="Avaliações pendentes"
              valor={p.entregasAAvaliar.length}
            />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card icone="calendario" titulo="Próximo encontro">
              {p.proximoEncontro ? (
                <>
                  <p className="font-semibold">{p.proximoEncontro.titulo}</p>
                  <p className="text-sm text-text-secondary">
                    {formatarData(p.proximoEncontro.data, { weekday: 'long' })} ·{' '}
                    {p.proximoEncontro.horario} · {p.proximoEncontro.ambiente}
                  </p>
                </>
              ) : (
                <EmptyState titulo="Nenhum encontro futuro." />
              )}
            </Card>
            <Card icone="avaliacao" titulo="Avaliações a concluir">
              {p.entregasAAvaliar.length ? (
                <ul className="flex flex-col gap-2">
                  {p.entregasAAvaliar.map((e) => (
                    <li
                      key={`${e.dupla.id}-${e.encontro.id}`}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        <span className="font-semibold">{e.dupla.nome}</span>
                        <span className="block text-sm text-text-secondary">
                          {e.encontro.titulo}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {e.pendentes.map((x) => (
                          <StatusBadge key={x} estado="pendente" rotulo={x} />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState titulo="Nenhuma avaliação pendente." icone="correta" />
              )}
            </Card>
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function DocentePresencaPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            icone="presenca"
            titulo="Presença"
            descricao={p.ultimoEncontro ? `Registros do ${p.ultimoEncontro.titulo}` : undefined}
          />
          <Alert tom="info" titulo="Registro de presença no Incremento 3">
            Nesta versão a lista é somente leitura. O registro individual com autoria e horário do
            servidor exige conexão e será habilitado com a especificação de presença.
          </Alert>
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
            <ResponsiveTable
              legenda="Presença individual"
              chave={(l) => l.estudante}
              linhas={p.presencaUltimoEncontro}
              colunas={[
                { id: 'est', titulo: 'Estudante', valor: (l) => l.estudante },
                { id: 'dupla', titulo: 'Dupla', valor: (l) => l.dupla },
                {
                  id: 'sit',
                  titulo: 'Situação',
                  valor: (l) =>
                    l.presente ? (
                      <StatusBadge estado="concluido" rotulo="Presente" />
                    ) : (
                      <StatusBadge estado="nao_enviado" rotulo="Ausente" />
                    ),
                },
              ]}
            />
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

function TabelaCriterios({ titulo, criterios }: { titulo: string; criterios: CriterioRubrica[] }) {
  const total = criterios.reduce((t, c) => t + c.maximo, 0);
  return (
    <Card icone="avaliacao" titulo={`${titulo} — até ${total} pontos`}>
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

export function DocenteAvaliacoesPage() {
  const r = REGRAS_PILOTO;
  return (
    <>
      <PageHeader
        icone="avaliacao"
        titulo="Avaliações e rubricas"
        descricao={`Critérios da edição (regras ${r.versao}).`}
      />
      <Alert tom="info" titulo="Lançamento de notas no Incremento 3">
        O formulário de rubrica com validação no servidor, feedback e autoria será habilitado na
        especificação de avaliação. As notas aceitam valores de 0 até o máximo de cada critério.
      </Alert>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <TabelaCriterios titulo="Entrega prática" criterios={r.entrega.criterios} />
        <TabelaCriterios titulo="Apresentação" criterios={r.apresentacao.criterios} />
        <TabelaCriterios titulo="Participação da dupla" criterios={r.participacao.criterios} />
      </div>
    </>
  );
}

export function DocenteOcorrenciasPage() {
  return (
    <>
      <PageHeader icone="ocorrencia" titulo="Ocorrências" />
      <EmConstrucao modulo="Registro de ocorrências e evidências" incremento="Incremento 4" />
    </>
  );
}
