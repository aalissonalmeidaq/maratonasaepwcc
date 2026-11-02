import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { RodapeDoFormulario, TextAreaField, useEnvio } from '@/shared/ui';

/**
 * Resposta da coordenação ao pedido (FR-021). Deferir não altera pontos por si: a correção é
 * feita no registro de origem, ligada ao pedido (FR-022), antes ou depois da resposta.
 */
export function FormRespostaRevisao({
  onResponder,
  bloqueio,
}: {
  onResponder: (d: {
    resposta: 'deferido' | 'indeferido';
    justificativa: string;
  }) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [resposta, setResposta] = useState<'deferido' | 'indeferido'>('deferido');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const motivo = validarJustificativa(justificativa);
    setErro(motivo);
    if (motivo) return;
    await enviar(
      () => onResponder({ resposta, justificativa: justificativa.trim() }),
      'Resposta registrada.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-semibold">Resposta</legend>
        {(
          [
            ['deferido', 'Deferir'],
            ['indeferido', 'Indeferir'],
          ] as const
        ).map(([valor, texto]) => (
          <label key={valor} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="resposta-revisao"
              className="size-5"
              checked={resposta === valor}
              onChange={() => setResposta(valor)}
            />
            {texto}
          </label>
        ))}
      </fieldset>
      <TextAreaField
        rotulo="Justificativa da resposta"
        dica="A equipe vê a resposta. Para mudar pontos, corrija o registro de origem pelo atalho acima."
        maxLength={2000}
        value={justificativa}
        erro={erro ?? undefined}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Responder pedido"
        icone="salvar"
      />
    </form>
  );
}
