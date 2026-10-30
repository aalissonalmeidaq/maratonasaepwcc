import { useCallback, useState } from 'react';

export type EstadoEnvio =
  | { tipo: 'ocioso' }
  | { tipo: 'enviando' }
  | { tipo: 'sucesso'; mensagem: string }
  /** Gravado no servidor, mas com uma ressalva que a pessoa precisa ver (ex.: e-mail não enviado). */
  | { tipo: 'alerta'; mensagem: string }
  | { tipo: 'erro'; mensagem: string };

/** Mensagem fixa, ou calculada a partir da resposta do servidor (`{ alerta }` para ressalvas). */
export type RetornoDeSucesso<T> = string | ((resultado: T) => string | { alerta: string });

/**
 * Controla uma gravação: o sucesso só é declarado quando a promessa do servidor resolve
 * (constituição VII). Erros chegam com mensagem pronta (ErroDeDados) ou genérica.
 */
export function useEnvio() {
  const [estado, setEstado] = useState<EstadoEnvio>({ tipo: 'ocioso' });

  const enviar = useCallback(
    async <T>(gravar: () => Promise<T>, mensagemSucesso: RetornoDeSucesso<T>) => {
      setEstado({ tipo: 'enviando' });
      try {
        const resultado = await gravar();
        const retorno =
          typeof mensagemSucesso === 'function' ? mensagemSucesso(resultado) : mensagemSucesso;
        setEstado(
          typeof retorno === 'string'
            ? { tipo: 'sucesso', mensagem: retorno }
            : { tipo: 'alerta', mensagem: retorno.alerta },
        );
        return true;
      } catch (e) {
        setEstado({
          tipo: 'erro',
          mensagem: e instanceof Error ? e.message : 'Não foi possível concluir a operação.',
        });
        return false;
      }
    },
    [],
  );

  const limpar = useCallback(() => setEstado({ tipo: 'ocioso' }), []);
  return { estado, enviando: estado.tipo === 'enviando', enviar, limpar };
}
