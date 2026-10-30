import { isValidElement, type ReactNode } from 'react';

/**
 * Texto pesquisável de um conteúdo de célula: textos e números, filhos de elementos e a prop
 * `rotulo` (usada por `StatusBadge`). Não renderiza componentes; texto calculado dentro deles
 * fica de fora — nesse caso a coluna informa `texto`.
 */
export function textoDoNo(no: ReactNode): string {
  if (no === null || no === undefined || typeof no === 'boolean') return '';
  if (typeof no === 'string' || typeof no === 'number' || typeof no === 'bigint') return String(no);
  if (Array.isArray(no)) return juntar(no.map(textoDoNo));
  if (isValidElement(no)) {
    const props = no.props as { children?: ReactNode; rotulo?: unknown };
    return juntar([
      typeof props.rotulo === 'string' ? props.rotulo : '',
      textoDoNo(props.children),
    ]);
  }
  return '';
}

const juntar = (partes: string[]) => partes.filter(Boolean).join(' ');
