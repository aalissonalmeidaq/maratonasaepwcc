import { useState, type FormEvent } from 'react';
import { RodapeDoFormulario, TextAreaField, useEnvio } from '@/shared/ui';

/** Manifestação da equipe sobre a ocorrência, uma por ocorrência, dentro do prazo (FR-008). */
export function FormManifestacao({
  onEnviar,
  bloqueio,
}: {
  onEnviar: (texto: string) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const motivo = texto.trim().length < 10 ? 'Escreva pelo menos 10 caracteres.' : null;
    setErro(motivo);
    if (motivo) return;
    await enviar(() => onEnviar(texto.trim()), 'Manifestação enviada.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-3">
      <TextAreaField
        rotulo="Manifestação da equipe"
        dica="A equipe envia uma única manifestação. A coordenação a considera na decisão."
        maxLength={4000}
        value={texto}
        erro={erro ?? undefined}
        onChange={(e) => setTexto(e.target.value)}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Enviar manifestação"
        icone="enviar"
      />
    </form>
  );
}
