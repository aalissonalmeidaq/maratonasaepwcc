import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { descricaoDoCampo, estiloControle } from './campo';
import { CampoBase } from './TextField';
import { cx } from './cx';

export interface Opcao {
  valor: string;
  rotulo: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string;
  opcoes: Opcao[];
  dica?: string;
  erro?: string;
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { rotulo, opcoes, dica, erro, placeholder, id, className, ...resto },
  ref,
) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <CampoBase id={campoId} rotulo={rotulo} dica={dica} erro={erro}>
      <select
        ref={ref}
        id={campoId}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricaoDoCampo(campoId, dica, erro)}
        className={cx(estiloControle, erro ? 'border-error' : 'border-gray-500', className)}
        {...resto}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </CampoBase>
  );
});
