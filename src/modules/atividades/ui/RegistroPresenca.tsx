import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { Button, RodapeDoFormulario, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import type { AlunoDaPresenca, PresencaDaTurma, RegistroDePresenca } from '../domain/tipos';

interface Linha {
  presente: boolean;
  observacao: string;
}

/**
 * Presença individual de um encontro (FR-009, SC-003): a turma inteira é marcada numa tela e
 * enviada num único lote. Alterar um registro existente exige justificativa (FR-011).
 */
export function RegistroPresenca({
  dados,
  onSalvar,
  bloqueio,
}: {
  dados: PresencaDaTurma;
  onSalvar: (registros: RegistroDePresenca[], justificativa?: string) => Promise<void>;
  bloqueio?: string;
}) {
  const inicial = (a: AlunoDaPresenca): Linha => ({
    presente: a.presente ?? false,
    observacao: a.observacao ?? '',
  });
  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(dados.alunos.map((a) => [a.estudanteId, inicial(a)])),
  );
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { estado, enviando, enviar } = useEnvio();

  const alterou = dados.alunos.some((a) => {
    const l = linhas[a.estudanteId]!;
    return (
      a.presente !== null && (l.presente !== a.presente || l.observacao !== (a.observacao ?? ''))
    );
  });
  const atualizar = (id: string, parcial: Partial<Linha>) =>
    setLinhas((atual) => ({ ...atual, [id]: { ...atual[id]!, ...parcial } }));

  const grupos = [
    ...dados.equipes.map((e) => ({
      chave: e.id,
      titulo: e.nome ?? e.integrantes.map((i) => i.nome).join(' e '),
      alunos: dados.alunos.filter((a) => a.duplaId === e.id),
    })),
    { chave: 'sem-equipe', titulo: 'Sem equipe', alunos: dados.alunos.filter((a) => !a.duplaId) },
  ].filter((g) => g.alunos.length > 0);

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const motivo = alterou ? validarJustificativa(justificativa) : null;
    setErro(motivo);
    if (motivo) return;
    await enviar(
      () =>
        onSalvar(
          dados.alunos.map((a) => ({
            estudanteId: a.estudanteId,
            presente: linhas[a.estudanteId]!.presente,
            observacao: linhas[a.estudanteId]!.observacao.trim(),
          })),
          alterou ? justificativa.trim() : undefined,
        ),
      'Presenças salvas.',
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      <Button
        variante="secundario"
        className="self-start"
        onClick={() =>
          setLinhas((atual) =>
            Object.fromEntries(
              Object.entries(atual).map(([id, l]) => [id, { ...l, presente: true }]),
            ),
          )
        }
      >
        Marcar todos presentes
      </Button>
      {grupos.map((g) => (
        <fieldset key={g.chave} className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold">{g.titulo}</legend>
          <ul className="flex flex-col gap-3">
            {g.alunos.map((a) => {
              const l = linhas[a.estudanteId]!;
              return (
                <li
                  key={a.estudanteId}
                  className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center"
                >
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={l.presente}
                      onChange={(e) => atualizar(a.estudanteId, { presente: e.target.checked })}
                      aria-label={`${a.nome} presente`}
                      className="size-5"
                    />
                    <span aria-hidden="true">{a.nome}</span>
                  </label>
                  <TextField
                    rotulo={`Observação de ${a.nome}`}
                    value={l.observacao}
                    maxLength={300}
                    placeholder="Opcional (ex.: chegou atrasado)"
                    onChange={(e) => atualizar(a.estudanteId, { observacao: e.target.value })}
                  />
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      {alterou && (
        <TextAreaField
          rotulo="Justificativa da correção"
          dica="Obrigatória ao alterar um registro existente. Fica na auditoria."
          value={justificativa}
          erro={erro ?? undefined}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      )}
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Salvar presenças"
        icone="salvar"
      />
    </form>
  );
}
