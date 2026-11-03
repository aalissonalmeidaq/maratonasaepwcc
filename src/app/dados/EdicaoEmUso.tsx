import { useCallback, useState, type ReactNode } from 'react';
import { ContextoEdicaoEmUso } from './edicaoEmUsoContexto';

const chaveDe = (usuarioId: string) => `maratona:edicao:${usuarioId}`;

// Só o id da edição fica no dispositivo (nada sensível); o armazenamento pode estar bloqueado.
function lerEscolha(usuarioId: string | null): string | null {
  if (!usuarioId) return null;
  try {
    return localStorage.getItem(chaveDe(usuarioId));
  } catch {
    return null;
  }
}

function gravarEscolha(usuarioId: string | null, id: string) {
  if (!usuarioId) return;
  try {
    localStorage.setItem(chaveDe(usuarioId), id);
  } catch {
    // Sem armazenamento, a escolha vale só nesta sessão.
  }
}

/** Edição escolhida pela pessoa (spec 010, US7), lembrada neste dispositivo. */
export function ProvedorEdicaoEmUso({
  usuarioId,
  children,
}: {
  usuarioId: string | null;
  children: ReactNode;
}) {
  const [escolha, setEscolha] = useState(() => ({ usuarioId, id: lerEscolha(usuarioId) }));
  // Outra pessoa entrou: vale a escolha dela, não a anterior.
  const atual =
    escolha.usuarioId === usuarioId ? escolha : { usuarioId, id: lerEscolha(usuarioId) };
  if (atual !== escolha) setEscolha(atual);

  const escolher = useCallback(
    (id: string) => {
      gravarEscolha(usuarioId, id);
      setEscolha({ usuarioId, id });
    },
    [usuarioId],
  );
  return (
    <ContextoEdicaoEmUso.Provider value={{ escolhidaId: atual.id, escolher }}>
      {children}
    </ContextoEdicaoEmUso.Provider>
  );
}
