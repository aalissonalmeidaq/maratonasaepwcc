import { useEffect, useRef } from 'react';

/** Na edição, leva o foco ao primeiro campo assim que o formulário aparece. */
export function useFocoNaEdicao<T extends HTMLElement>(editando: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (editando) ref.current?.focus();
  }, [editando]);
  return ref;
}
