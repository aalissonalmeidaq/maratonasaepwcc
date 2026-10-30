import { cx } from './cx';

interface ProgressoCircularProps {
  valor: number;
  maximo: number;
  rotulo: string;
  /** Tamanho em pixels. */
  tamanho?: number;
  /** Para uso sobre fundo escuro. */
  inverso?: boolean;
}

/** Indicador circular com percentual (prancha 06, "Barras de progresso"). */
export function ProgressoCircular({
  valor,
  maximo,
  rotulo,
  tamanho = 88,
  inverso = false,
}: ProgressoCircularProps) {
  const fracao = maximo > 0 ? Math.min(1, Math.max(0, valor / maximo)) : 0;
  const raio = 15.5;
  const circunferencia = 2 * Math.PI * raio;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={valor}
      className="relative grid place-items-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx="18"
          cy="18"
          r={raio}
          fill="none"
          strokeWidth="3.5"
          className={inverso ? 'stroke-white/20' : 'stroke-gray-200'}
        />
        <circle
          cx="18"
          cy="18"
          r={raio}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${fracao * circunferencia} ${circunferencia}`}
          className="stroke-cyan-500 transition-[stroke-dasharray] duration-(--duration-normal)"
        />
      </svg>
      <span
        className={cx(
          'font-display text-lg font-bold tabular-nums',
          inverso ? 'text-white' : 'text-text',
        )}
      >
        {Math.round(fracao * 100)}%
      </span>
    </div>
  );
}
