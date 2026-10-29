import { useId, type Ref, type TextareaHTMLAttributes } from 'react';
import { descricaoDoCampo, estiloControle } from './campo';
import { cx } from './cx';
import { CampoBase } from './TextField';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
  rotulo: string;
  dica?: string;
  erro?: string;
}

export function TextAreaField({
  rotulo,
  dica,
  erro,
  id,
  className,
  rows = 3,
  ...resto
}: TextAreaFieldProps) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <CampoBase id={campoId} rotulo={rotulo} dica={dica} erro={erro}>
      <textarea
        id={campoId}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricaoDoCampo(campoId, dica, erro)}
        className={cx(estiloControle, 'py-2', erro ? 'border-error' : 'border-gray-500', className)}
        {...resto}
      />
    </CampoBase>
  );
}
