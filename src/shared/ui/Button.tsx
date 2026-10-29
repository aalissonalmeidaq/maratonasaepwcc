import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from './cx';
import { Icon, type NomeIcone } from './Icon';
import { Spinner } from './Spinner';

type Variante = 'primario' | 'secundario' | 'terciario' | 'destrutivo';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-action text-action-text hover:bg-action-hover active:bg-navy-950',
  secundario:
    'bg-surface text-navy-900 border border-blue-700 hover:bg-surface-muted active:bg-gray-200',
  terciario: 'bg-transparent text-link underline-offset-4 hover:underline',
  destrutivo: 'bg-error text-white hover:brightness-90',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  variante?: Variante;
  icone?: NomeIcone;
  carregando?: boolean;
  larguraTotal?: boolean;
  children: ReactNode;
}

export function Button({
  variante = 'primario',
  icone,
  carregando = false,
  larguraTotal = false,
  disabled,
  className,
  children,
  type = 'button',
  ...resto
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cx(
        'inline-flex min-h-(--control-min-height) items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold',
        'transition-colors duration-(--duration-fast) focus-visible:shadow-(--focus-ring) focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTES[variante],
        larguraTotal && 'w-full',
        className,
      )}
      {...resto}
    >
      {carregando ? <Spinner tamanho="sm" /> : icone && <Icon nome={icone} tamanho="sm" />}
      {children}
    </button>
  );
}
