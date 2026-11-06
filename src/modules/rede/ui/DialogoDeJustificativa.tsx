import { useState } from 'react';
import { ConfirmDialog, TextAreaField } from '@/shared/ui';
import { validarJustificativa } from '../domain/validacao';

interface DialogoDeJustificativaProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  onConfirmar: (justificativa: string) => Promise<void>;
  onCancelar: () => void;
}

/** Diálogo aberto: o estado (justificativa e erros) nasce zerado a cada abertura, pois remonta. */
function DialogoAberto({
  titulo,
  descricao,
  rotuloConfirmar,
  onConfirmar,
  onCancelar,
}: Omit<DialogoDeJustificativaProps, 'aberto'>) {
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string>();
  const [erroServidor, setErroServidor] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    const invalida = validarJustificativa(justificativa);
    setErro(invalida);
    setErroServidor(undefined);
    if (invalida) return;
    setEnviando(true);
    try {
      await onConfirmar(justificativa.trim());
    } catch (e) {
      setErroServidor(e instanceof Error ? e.message : 'Não foi possível concluir a operação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo={titulo}
      descricao={descricao}
      rotuloConfirmar={rotuloConfirmar}
      destrutivo
      carregando={enviando}
      erro={erroServidor}
      onConfirmar={() => void confirmar()}
      onCancelar={onCancelar}
    >
      <TextAreaField
        rotulo="Justificativa"
        value={justificativa}
        rows={3}
        erro={erro}
        onChange={(e) => setJustificativa(e.target.value)}
      />
    </ConfirmDialog>
  );
}

/**
 * Confirmação com justificativa (mínimo de 10 caracteres, como no servidor). A recusa do
 * servidor aparece dentro do diálogo; quem chama fecha o diálogo depois do sucesso. O foco volta
 * ao elemento que abriu o diálogo quando ele fecha (o `ConfirmDialog` restaura ao desmontar).
 */
export function DialogoDeJustificativa(props: DialogoDeJustificativaProps) {
  if (!props.aberto) return null;
  return <DialogoAberto {...props} />;
}
