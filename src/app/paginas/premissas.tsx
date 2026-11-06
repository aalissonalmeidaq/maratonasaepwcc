import { useQueryClient } from '@tanstack/react-query';
import { FormResposta, PremissasPage, type EntradaResposta } from '@/modules/premissas';
import { ErroDeDados } from '@/shared/dados/erros';
import { Consulta } from '../dados/Consulta';
import { useBloqueioDeEscrita, useGravar, usePremissas } from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';

/**
 * Registra a resposta e atualiza a lista depois do servidor. Se outra pessoa respondeu antes
 * (40001), recarrega a lista para mostrar a resposta atual e repassa o aviso (FR-008).
 */
function useResponder() {
  const { premissas } = useRepositorios();
  const gravar = useGravar();
  const cliente = useQueryClient();
  return async (entrada: EntradaResposta) => {
    try {
      return await gravar(() => premissas.responder(entrada))();
    } catch (e) {
      const original = e instanceof ErroDeDados ? (e.original as { code?: string }) : null;
      if (original?.code === '40001') await cliente.invalidateQueries();
      throw e;
    }
  };
}

/**
 * Premissas em validação (spec 015): a mesma tela para master, gestão, coordenação e docentes; o servidor decide
 * quem pode responder (`podeResponder`) e recusa estudantes.
 */
export function PremissasEmValidacaoPage() {
  const responder = useResponder();
  const bloqueio = useBloqueioDeEscrita();
  return (
    <Consulta consulta={usePremissas()}>
      {(catalogo) => (
        <PremissasPage
          catalogo={catalogo}
          formulario={(p) => (
            <FormResposta premissa={p} onResponder={responder} bloqueio={bloqueio} />
          )}
        />
      )}
    </Consulta>
  );
}
