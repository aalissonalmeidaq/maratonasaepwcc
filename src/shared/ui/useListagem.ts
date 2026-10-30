import { useState } from 'react';
import { filtrarPorBusca, paginar } from '@/shared/lib/listagem';

export const POR_PAGINA = 10;

/** Estado de busca (filtra a cada tecla) e paginação de uma listagem (spec 005). */
export function useListagem<T>(itens: T[], textoDe: (item: T) => string, porPagina = POR_PAGINA) {
  const [termo, setTermo] = useState('');
  const [pagina, setPagina] = useState(1);
  const resultado = paginar(filtrarPorBusca(itens, termo, textoDe), pagina, porPagina);
  return {
    ...resultado,
    termo,
    buscar(novo: string) {
      setTermo(novo);
      setPagina(1);
    },
    irPara: setPagina,
  };
}
