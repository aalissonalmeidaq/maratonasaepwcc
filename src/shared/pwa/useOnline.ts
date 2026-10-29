import { useSyncExternalStore } from 'react';

function assinar(aviso: () => void) {
  window.addEventListener('online', aviso);
  window.addEventListener('offline', aviso);
  return () => {
    window.removeEventListener('online', aviso);
    window.removeEventListener('offline', aviso);
  };
}

/**
 * Estado de rede informado pelo navegador. `true` não garante que o servidor responda:
 * por isso nenhuma ação é dada como concluída sem resposta do servidor.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    assinar,
    () => navigator.onLine,
    () => true,
  );
}
