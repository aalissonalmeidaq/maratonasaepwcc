import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { RodapeDoFormulario, TextAreaField, useEnvio } from '@/shared/ui';
import type { ResultadoDecisao } from '../domain/tipos';

/**
 * Decisão fundamentada da coordenação (FR-009). O servidor recusa a decisão enquanto o prazo
 * de manifestação estiver aberto sem manifestação; a recusa aparece no lugar do sucesso.
 */
export function FormDecisao({
  plagio,
  onDecidir,
  bloqueio,
  rotulo = 'Registrar decisão',
}: {
  plagio: boolean;
  onDecidir: (d: {
    resultado: ResultadoDecisao;
    justificativa: string;
    apresentacaoDependente: boolean;
  }) => Promise<unknown>;
  bloqueio?: string;
  rotulo?: string;
}) {
  const [resultado, setResultado] = useState<ResultadoDecisao>('confirmada');
  const [dependente, setDependente] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const motivo = validarJustificativa(justificativa);
    setErro(motivo);
    if (motivo) return;
    await enviar(
      () =>
        onDecidir({
          resultado,
          justificativa: justificativa.trim(),
          apresentacaoDependente: plagio && dependente,
        }),
      'Decisão registrada.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-semibold">Decisão</legend>
        {(
          [
            ['confirmada', 'Confirmar'],
            ['arquivada', 'Arquivar'],
          ] as const
        ).map(([valor, texto]) => (
          <label key={valor} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="resultado"
              className="size-5"
              checked={resultado === valor}
              onChange={() => setResultado(valor)}
            />
            {texto}
          </label>
        ))}
      </fieldset>
      {plagio && (
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={dependente}
            onChange={(e) => setDependente(e.target.checked)}
          />
          Apresentação dependente da entrega
        </label>
      )}
      <TextAreaField
        rotulo="Justificativa da decisão"
        dica="Obrigatória. A equipe vê a justificativa e pode pedir revisão no prazo."
        maxLength={2000}
        value={justificativa}
        erro={erro ?? undefined}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo={rotulo}
        icone="salvar"
      />
    </form>
  );
}
