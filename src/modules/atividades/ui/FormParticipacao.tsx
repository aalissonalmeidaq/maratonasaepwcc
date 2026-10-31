import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import type { CriterioRubrica, Notas } from '@/modules/pontuacao';
import { Alert, RodapeDoFormulario, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import { useNotas } from './useNotas';
import type { EquipeResumo } from '../domain/tipos';

export function CamposDeNotas({
  criterios,
  valores,
  onAlterar,
  prefixo,
}: {
  criterios: CriterioRubrica[];
  valores: Record<string, string>;
  onAlterar: (id: string, valor: string) => void;
  prefixo?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {criterios.map((c) => (
        <TextField
          key={c.id}
          rotulo={`${prefixo ? `${prefixo}: ` : ''}${c.rotulo} (até ${c.maximo})`}
          type="number"
          inputMode="decimal"
          min={0}
          max={c.maximo}
          step={0.5}
          value={valores[c.id] ?? ''}
          onChange={(e) => onAlterar(c.id, e.target.value)}
        />
      ))}
    </div>
  );
}

/** Participação da equipe no encontro (FR-010); correção exige justificativa (FR-011). */
export function FormParticipacao({
  equipe,
  criterios,
  inicial,
  onSalvar,
  bloqueio,
}: {
  equipe: EquipeResumo;
  criterios: CriterioRubrica[];
  inicial?: Notas | null;
  onSalvar: (notas: Notas, justificativa?: string) => Promise<void>;
  bloqueio?: string;
}) {
  const notas = useNotas(criterios, inicial);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();
  const nome = equipe.nome ?? equipe.integrantes.map((i) => i.nome).join(' e ');

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const lido = notas.ler();
    const correcao = lido.notas !== null && notas.mudou(lido.notas);
    const motivo = lido.erro ?? (correcao ? validarJustificativa(justificativa) : null);
    setErro(motivo);
    if (motivo || !lido.notas) return;
    const valores = lido.notas;
    await enviar(
      () => onSalvar(valores, correcao ? justificativa.trim() : undefined),
      'Participação salva.',
    );
  }

  return (
    <form
      aria-label={`Participação da ${nome}`}
      onSubmit={aoEnviar}
      noValidate
      className="flex flex-col gap-3"
    >
      <CamposDeNotas
        criterios={criterios}
        valores={notas.valores}
        onAlterar={(id, v) => notas.setValores((atual) => ({ ...atual, [id]: v }))}
      />
      {inicial && (
        <TextAreaField
          rotulo="Justificativa da correção"
          dica="Obrigatória se alguma nota mudar. Fica na auditoria."
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      )}
      {erro && <Alert tom="erro" titulo={erro} />}
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Salvar participação"
        icone="salvar"
      />
    </form>
  );
}
