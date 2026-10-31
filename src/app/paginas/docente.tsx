import { painelDocente } from '@/modules/demo';
import { formatarData } from '@/shared/lib/formatacao';
import {
  Card,
  EmConstrucao,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  BannerDestaque,
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
          <BannerDestaque
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

export function DocenteOcorrenciasPage() {
  return (
    <>
      <PageHeader icone="ocorrencia" titulo="Ocorrências" />
      <EmConstrucao modulo="Registro de ocorrências e evidências" incremento="Incremento 4" />
    </>
  );
}
