import { useCallback, useState } from 'react';

export type EstadoEnvio =
  | { tipo: 'ocioso' }
  | { tipo: 'enviando' }
  | { tipo: 'sucesso'; mensagem: string }
  | { tipo: 'erro'; mensagem: string };

/**
 * Controla uma gravação: o sucesso só é declarado quando a promessa do servidor resolve
 * (constituição VII). Erros chegam com mensagem pronta (ErroDeDados) ou genérica.
 */
export function useEnvio() {
  const [estado, setEstado] = useState<EstadoEnvio>({ tipo: 'ocioso' });

  const enviar = useCallback(async (gravar: () => Promise<unknown>, mensagemSucesso: string) => {
    setEstado({ tipo: 'enviando' });
    try {
      await gravar();
      setEstado({ tipo: 'sucesso', mensagem: mensagemSucesso });
      return true;
    } catch (e) {
      setEstado({
        tipo: 'erro',
        mensagem: e instanceof Error ? e.message : 'Não foi possível concluir a operação.',
      });
      return false;
    }
  }, []);

  const limpar = useCallback(() => setEstado({ tipo: 'ocioso' }), []);
  return { estado, enviando: estado.tipo === 'enviando', enviar, limpar };
}
