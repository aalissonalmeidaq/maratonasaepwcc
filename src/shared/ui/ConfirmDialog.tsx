import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  destrutivo?: boolean;
  carregando?: boolean;
  /** Recusa do servidor, exibida dentro do diálogo (fora dele ficaria encoberta). */
  erro?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Diálogo modal: foco inicial em "Cancelar" (ação segura), Tab preso no diálogo, Esc fecha e o
 * foco volta ao elemento que o abriu (Design System §7).
 */
export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar,
  rotuloCancelar = 'Cancelar',
  destrutivo = false,
  carregando = false,
  erro,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    cancelar.current?.focus();
    return () => anterior?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancelar();
        return;
      }
      if (e.key !== 'Tab' || !caixa.current) return;
      const focaveis = caixa.current.querySelectorAll<HTMLElement>('button:not([disabled])');
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro?.focus();
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-(--z-modal) flex items-end justify-center bg-navy-950/60 p-4 sm:items-center">
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descricao`}
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-md"
      >
        <h2 id={`${id}-titulo`} className="font-display text-xl font-bold text-text">
          {titulo}
        </h2>
        <p id={`${id}-descricao`} className="mt-2 text-text-secondary">
          {descricao}
        </p>
        {erro && (
          <div className="mt-4">
            <Alert tom="erro" titulo={erro} anunciar />
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelar} variante="secundario" onClick={onCancelar}>
            {rotuloCancelar}
          </Button>
          <Button
            variante={destrutivo ? 'destrutivo' : 'primario'}
            carregando={carregando}
            onClick={onConfirmar}
          >
            {rotuloConfirmar}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
