import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type NomeIcone } from './Icon';

interface CardProps {
  titulo?: string;
  /** Nível do título para manter a hierarquia da página. */
  nivel?: 2 | 3;
  acao?: ReactNode;
  /** Ícone ao lado do título, nas cores da marca (decorativo). */
  icone?: NomeIcone;
  /** Âncora para navegação dentro da página. */
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Card({ titulo, nivel = 2, acao, icone, id, className, children }: CardProps) {
  const Titulo = `h${nivel}` as const;
  return (
    <section
      id={id}
      className={cx(
        'min-w-0 scroll-mt-24 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5',
        className,
      )}
    >
      {(titulo || acao) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && (
            <Titulo className="flex min-w-0 items-center gap-2 font-display text-lg font-semibold text-text">
              {icone && <Icon nome={icone} tamanho="lg" cor="marca" />}
              {titulo}
            </Titulo>
          )}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

const ACENTOS = {
  azul: 'bg-blue-700 text-white',
  roxo: 'bg-purple-500 text-navy-950',
  amarelo: 'bg-yellow-500 text-navy-950',
  ciano: 'bg-cyan-500 text-navy-950',
  coral: 'bg-coral-500 text-navy-950',
} as const;

interface StatCardProps {
  rotulo: string;
  valor: ReactNode;
  complemento?: ReactNode;
  icone: NomeIcone;
  acento?: keyof typeof ACENTOS;
}

/** Indicador numérico sempre acompanhado de rótulo claro (Design System §7). */
export function StatCard({ rotulo, valor, complemento, icone, acento = 'azul' }: StatCardProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-md', ACENTOS[acento])}>
        <Icon nome={icone} />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-sm font-medium text-text-secondary">{rotulo}</p>
        <p className="font-display text-2xl font-bold text-text tabular-nums">{valor}</p>
        {complemento && <p className="text-sm text-text-secondary">{complemento}</p>}
      </div>
    </div>
  );
}

export function ProgressBar({
  valor,
  maximo,
  rotulo,
}: {
  valor: number;
  maximo: number;
  rotulo: string;
}) {
  const pct = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={valor}
      className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
    >
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
    </div>
  );
}
