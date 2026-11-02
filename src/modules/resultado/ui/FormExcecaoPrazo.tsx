import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { RodapeDoFormulario, TextAreaField, TextField, useEnvio } from '@/shared/ui';

/** Exceção de prazo registrada pela coordenação para a equipe, com justificativa (FR-021). */
export function FormExcecaoPrazo({
  onRegistrar,
  bloqueio,
}: {
  onRegistrar: (d: { novoPrazo: string; justificativa: string }) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [prazo, setPrazo] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<{ prazo?: string; justificativa?: string }>({});
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const e = {
      prazo: prazo ? undefined : 'Informe o novo prazo.',
      justificativa: validarJustificativa(justificativa) ?? undefined,
    };
    setErros(e);
    if (e.prazo || e.justificativa) return;
    await enviar(
      () =>
        onRegistrar({
          novoPrazo: new Date(prazo).toISOString(),
          justificativa: justificativa.trim(),
        }),
      'Exceção de prazo registrada.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-3">
      <TextField
        rotulo="Novo prazo"
        type="datetime-local"
        dica="No horário deste aparelho; o servidor confere o prazo pelo próprio relógio."
        value={prazo}
        erro={erros.prazo}
        onChange={(e) => setPrazo(e.target.value)}
      />
      <TextAreaField
        rotulo="Justificativa da exceção"
        maxLength={1000}
        value={justificativa}
        erro={erros.justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Registrar exceção de prazo"
        icone="relogio"
      />
    </form>
  );
}
