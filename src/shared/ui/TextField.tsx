import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { descricaoDoCampo, estiloControle } from './campo';
import { Icon } from './Icon';

interface CampoBaseProps {
  rotulo: string;
  dica?: string;
  erro?: string;
}

/** Rótulo acima, dica e erro associados por aria-describedby (Design System §7). */
export function CampoBase({
  id,
  rotulo,
  dica,
  erro,
  children,
}: CampoBaseProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {rotulo}
      </label>
      {children}
      {dica && (
        <p id={`${id}-dica`} className="text-sm text-text-secondary">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="flex items-center gap-1 text-sm font-medium text-error">
          <Icon nome="erro" tamanho="sm" />
          {erro}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps extends CampoBaseProps, InputHTMLAttributes<HTMLInputElement> {}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { rotulo, dica, erro, id, className, ...resto },
  ref,
) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <CampoBase id={campoId} rotulo={rotulo} dica={dica} erro={erro}>
      <input
        ref={ref}
        id={campoId}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricaoDoCampo(campoId, dica, erro)}
        className={cx(estiloControle, erro ? 'border-error' : 'border-gray-500', className)}
        {...resto}
      />
    </CampoBase>
  );
});
