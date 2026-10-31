import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { RodapeDoFormulario, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import type { Prorrogacao } from '../domain/tipos';

/** Prorrogação ou impedimento justificado para uma equipe (FR-007): novo prazo sem desconto. */
export function FormProrrogacao({
  atual,
  onSalvar,
  bloqueio,
}: {
  atual?: Prorrogacao | null;
  onSalvar: (dados: { novoPrazo: string; justificativa: string }) => Promise<void>;
  bloqueio?: string;
}) {
  const [prazo, setPrazo] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<{ prazo?: string; justificativa?: string }>({});
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const validacao = {
      prazo: prazo ? undefined : 'Informe o novo prazo.',
      justificativa: validarJustificativa(justificativa) ?? undefined,
    };
    setErros(validacao);
    if (validacao.prazo || validacao.justificativa) return;
    await enviar(
      () =>
        onSalvar({ novoPrazo: new Date(prazo).toISOString(), justificativa: justificativa.trim() }),
      'Prorrogação registrada.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-3 sm:grid-cols-2">
      {atual && (
        <p className="text-sm text-text-secondary sm:col-span-2">
          Prorrogação atual: até {formatarDataHora(atual.novoPrazo)} — {atual.justificativa}
        </p>
      )}
      <TextField
        rotulo="Novo prazo"
        type="datetime-local"
        value={prazo}
        erro={erros.prazo}
        onChange={(e) => setPrazo(e.target.value)}
      />
      <TextAreaField
        rotulo="Justificativa da prorrogação"
        value={justificativa}
        erro={erros.justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Registrar prorrogação"
        icone="cronograma"
      />
    </form>
  );
}
