import type { ComponentePendente } from '@/modules/pontuacao';
import { EmptyState, StatusBadge } from '@/shared/ui';
import type { PontosDaEquipe, PontosDoEncontro } from '../domain/tipos';

const pontos = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const COMPONENTES: { id: ComponentePendente | 'presenca'; rotulo: string }[] = [
  { id: 'presenca', rotulo: 'Presença' },
  { id: 'participacao', rotulo: 'Participação' },
  { id: 'avaliacaoObjetiva', rotulo: 'Questões / prova oficial' },
  { id: 'entrega', rotulo: 'Entrega prática' },
  { id: 'apresentacao', rotulo: 'Apresentação' },
];

const Selo = () => <StatusBadge estado="parcial" rotulo="Prévia — não oficial" />;

function Encontro({ e }: { e: PontosDoEncontro }) {
  const p = e.pontuacao;
  const titulo = `${e.numero}. ${e.titulo}`;
  const id = `previa-${e.encontroId}`;
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id={id} className="font-semibold">
          {titulo}
        </h3>
        <Selo />
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        {COMPONENTES.map((c) => (
          <div key={c.id} className="flex justify-between gap-2">
            <dt>{c.rotulo}</dt>
            <dd className="tabular-nums">
              {c.id !== 'presenca' && p.pendencias.includes(c.id) ? (
                <span className="text-text-secondary">Aguardando registro</span>
              ) : (
                pontos(p[c.id])
              )}
            </dd>
          </div>
        ))}
        {p.descontos > 0 && (
          <div className="flex justify-between gap-2">
            <dt>Descontos de ocorrências</dt>
            <dd className="tabular-nums">−{pontos(p.descontos)}</dd>
          </div>
        )}
        <div className="mt-1 flex justify-between gap-2 border-t border-border pt-2 font-semibold">
          <dt>Total do encontro</dt>
          <dd className="tabular-nums">{pontos(p.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Encontros({ equipe }: { equipe: PontosDaEquipe }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {equipe.encontros.map((e) => (
        <Encontro key={e.encontroId} e={e} />
      ))}
    </div>
  );
}

const situacao = (pendente: boolean) =>
  pendente ? (
    <StatusBadge estado="pendente" rotulo="Com pendências" />
  ) : (
    <StatusBadge estado="concluido" rotulo="Completo" />
  );

/**
 * Prévia dos pontos oficiais calculados no servidor (FR-019, FR-019a). Não é o resultado
 * oficial: só a versão publicada do ranking é oficial. Nunca mostra nota individual da prova.
 */
/** Total da equipe e, quando houver, a pontuação máxima da turma ("X de N"). */
const deMaximo = (e: PontosDaEquipe) =>
  e.maximo === undefined
    ? pontos(e.totais.total)
    : `${pontos(e.totais.total)} de ${pontos(e.maximo)}`;

export function PreviaPontos({
  equipes,
  modo,
}: {
  equipes: PontosDaEquipe[];
  modo: 'equipe' | 'turma';
}) {
  if (equipes.length === 0) {
    return <EmptyState titulo="Nenhuma equipe com pontos nesta turma." />;
  }
  if (modo === 'equipe') {
    const e = equipes[0]!;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold">{`${deMaximo(e)} pontos até agora`}</p>
          <Selo />
          {situacao(e.totais.pendente)}
        </div>
        <Encontros equipe={e} />
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {equipes.map((e) => (
        <li key={e.duplaId} className="rounded-lg border border-border bg-surface">
          <details>
            <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 p-3">
              <span className="font-semibold">{e.nome}</span>
              <span className="tabular-nums">{`${deMaximo(e)} pontos`}</span>
              {situacao(e.totais.pendente)}
            </summary>
            <div className="border-t border-border p-3">
              <Encontros equipe={e} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
