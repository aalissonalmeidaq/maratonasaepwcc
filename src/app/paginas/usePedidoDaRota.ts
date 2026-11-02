import { useSearchParams } from 'react-router';

/** `?pedido=` liga uma correção a um pedido de revisão aberto (spec 007, R7). */
export function usePedidoDaRota(): string | null {
  const [params] = useSearchParams();
  return params.get('pedido');
}

/** `?ocorrencia=`: a ocorrência do pedido; só ela recebe o formulário de nova decisão. */
export function useOcorrenciaDaRota(): string | null {
  const [params] = useSearchParams();
  return params.get('ocorrencia');
}
