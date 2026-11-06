import type { RegulamentoPublico as Conteudo } from '../domain/tipos';
import { ResumoRegulamento } from '@/modules/comunicados';
import { StatusBadge } from '@/shared/ui';
import { formatarData } from '@/shared/lib/formatacao';
export function RegulamentoPublico({ conteudo }: { conteudo: Conteudo }) {
  if (!conteudo.edicoes.length) return <p>Nenhum regulamento publicado no momento.</p>;
  return (
    <div className="flex flex-col gap-12">
      {conteudo.edicoes.map((e) => (
        <section key={e.id} aria-labelledby={`edicao-${e.id}`} className="min-w-0">
          <h2 id={`edicao-${e.id}`} className="mb-4 font-display text-2xl font-bold text-text">
            {e.nome}
          </h2>
          <p className="mb-4 text-sm text-text-secondary">
            {e.unidade ? `Unidade: ${e.unidade} · ` : ''}Período:{' '}
            {e.inicio ? formatarData(e.inicio, { year: 'numeric' }) : 'início a confirmar'}
            {e.fim ? ` a ${formatarData(e.fim, { year: 'numeric' })}` : ' · término a confirmar'}
          </p>
          <ResumoRegulamento regras={e.regras} versao={e.regrasVersao} />
          <h3 className="mt-8 mb-3 text-lg font-semibold">Encontros</h3>
          {!e.encontros.length ? (
            <p>Encontros ainda não divulgados.</p>
          ) : (
            <ol className="divide-y divide-border">
              {e.encontros.map((n) => (
                <li
                  key={n.numero}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-semibold">
                      Encontro {n.numero} — {n.titulo}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      <time dateTime={n.data}>
                        {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
                          new Date(`${n.data}T12:00:00`),
                        )}
                      </time>
                      {' · '}
                      {n.inicio
                        ? `${n.inicio.slice(0, 5)}${n.fim ? ` às ${n.fim.slice(0, 5)}` : ' (início)'}`
                        : 'horário a confirmar'}
                    </p>
                  </div>
                  <StatusBadge
                    estado={
                      n.estado === 'realizado'
                        ? 'concluido'
                        : n.estado === 'cancelado'
                          ? 'nao_enviado'
                          : 'agendado'
                    }
                    rotulo={
                      { realizado: 'Realizado', cancelado: 'Cancelado', agendado: 'Agendado' }[
                        n.estado
                      ]
                    }
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
