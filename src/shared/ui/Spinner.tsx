import { cx } from './cx';

interface SpinnerProps {
  tamanho?: 'sm' | 'md';
  /** Texto para leitores de tela quando o indicador aparece sozinho. */
  rotulo?: string;
}

export function Spinner({ tamanho = 'md', rotulo }: SpinnerProps) {
  const circulo = (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none',
        tamanho === 'sm' ? 'size-4' : 'size-6',
      )}
    />
  );
  if (!rotulo) return circulo;
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-text-secondary">
      {circulo}
      <span>{rotulo}</span>
    </span>
  );
}
