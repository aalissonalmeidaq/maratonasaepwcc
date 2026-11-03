import type { EdicaoGerida } from '../domain/edicoes';
import { SeloDaEdicao } from './SeloDaEdicao';
import { textoDoPeriodo } from './textoDaEdicao';

/** Edições que a pessoa coordena (FR-018), com a escolhida marcada. */
export function ListaEdicoes({
  edicoes,
  escolhidaId,
  onEscolher,
}: {
  edicoes: EdicaoGerida[];
  escolhidaId: string | null;
  onEscolher: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {edicoes.map((e) => (
        <li
          key={e.id}
          className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{e.nome}</span>
              <SeloDaEdicao estado={e.estado} />
            </div>
            <span className="text-sm text-text-secondary">
              {textoDoPeriodo(e.inicio, e.fim)} · Regras: {e.regrasVersao}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onEscolher(e.id)}
            aria-current={e.id === escolhidaId ? 'true' : undefined}
            aria-label={`Gerir: ${e.nome}`}
            className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-link hover:bg-surface-muted aria-[current=true]:bg-blue-600/10"
          >
            {e.id === escolhidaId ? 'Em gestão' : 'Gerir'}
          </button>
        </li>
      ))}
    </ul>
  );
}
