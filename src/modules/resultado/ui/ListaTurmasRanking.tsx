import { formatarDataHora } from '@/shared/lib/formatacao';
import { StatusBadge, cx } from '@/shared/ui';
import { rotuloEstadoRanking } from '../domain/prazos';
import type { TurmaNoRanking } from '../domain/tipos';

const totalDe = (t: TurmaNoRanking) =>
  t.pendencias.componentes + t.pendencias.ocorrencias + t.pendencias.revisoes;

/**
 * Turmas da edição na tela de ranking da coordenação (spec 012, FR-007): seleção para publicar
 * em lote, estado da última publicação e pendências dos encontros realizados.
 */
export function ListaTurmasRanking({
  turmas,
  selecionadas,
  onSelecionar,
  onAbrir,
  aberta,
}: {
  turmas: TurmaNoRanking[];
  selecionadas: string[];
  onSelecionar: (ids: string[]) => void;
  onAbrir: (turmaId: string) => void;
  /** Turma cujo detalhe está aberto, destacada na lista. */
  aberta?: string | null;
}) {
  const todas = turmas.length > 0 && turmas.every((t) => selecionadas.includes(t.turmaId));
  const alternar = (id: string) =>
    onSelecionar(
      selecionadas.includes(id)
        ? selecionadas.filter((s) => s !== id)
        : turmas.map((t) => t.turmaId).filter((t) => t === id || selecionadas.includes(t)),
    );
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-3 self-start font-semibold">
        <input
          type="checkbox"
          className="size-5"
          checked={todas}
          onChange={() => onSelecionar(todas ? [] : turmas.map((t) => t.turmaId))}
        />
        Selecionar todas as turmas
      </label>
      <ul aria-label="Turmas da edição" className="grid gap-3 lg:grid-cols-2">
        {turmas.map((t) => {
          const pendencias = totalDe(t);
          return (
            <li
              key={t.turmaId}
              className={cx(
                'flex items-start gap-3 rounded-lg border bg-surface p-3 shadow-sm',
                aberta === t.turmaId ? 'border-blue-600' : 'border-border',
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0"
                aria-label={`Selecionar ${t.turma}`}
                checked={selecionadas.includes(t.turmaId)}
                onChange={() => alternar(t.turmaId)}
              />
              <div className="min-w-0 flex-1 wrap-anywhere">
                <button
                  type="button"
                  aria-label={`Abrir ${t.turma}`}
                  aria-pressed={aberta === t.turmaId}
                  onClick={() => onAbrir(t.turmaId)}
                  className="min-h-11 text-left font-semibold text-link underline-offset-4 hover:underline"
                >
                  {t.turma}
                </button>
                <p className="text-sm text-text-secondary">{t.categoria}</p>
                <p className="text-sm text-text-secondary">
                  {t.equipes} {t.equipes === 1 ? 'equipe' : 'equipes'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {t.ultima ? (
                    <>
                      <StatusBadge
                        estado={t.ultima.estado}
                        rotulo={rotuloEstadoRanking(t.ultima.estado)}
                      />
                      <span className="text-text-secondary">
                        versão {t.ultima.versao}, {formatarDataHora(t.ultima.publicadoEm)}
                      </span>
                    </>
                  ) : (
                    <span className="text-text-secondary">Não publicado</span>
                  )}
                  <span
                    className={cx(
                      'font-semibold',
                      pendencias > 0 ? 'text-amber-800' : 'text-text-secondary',
                    )}
                  >
                    {pendencias === 0
                      ? 'Nenhuma pendência'
                      : `${pendencias} ${pendencias === 1 ? 'pendência' : 'pendências'}`}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-secondary">
        Pendências dos encontros já realizados. A publicação definitiva considera também os
        encontros futuros da turma.
      </p>
    </div>
  );
}
