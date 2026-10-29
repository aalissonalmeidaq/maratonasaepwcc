import { cx } from './cx';

export const estiloControle = cx(
  'block w-full min-h-(--control-min-height) rounded-md border bg-surface px-3 text-base text-text',
  'focus:outline-none focus-visible:shadow-(--focus-ring)',
  'disabled:bg-surface-muted disabled:text-text-secondary',
);

export function descricaoDoCampo(id: string, dica?: string, erro?: string): string | undefined {
  return [dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined;
}
