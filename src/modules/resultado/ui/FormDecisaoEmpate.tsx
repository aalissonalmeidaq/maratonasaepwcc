import { useState, type FormEvent } from 'react';
import { validarJustificativa } from '@/modules/duplas';
import { RodapeDoFormulario, TextAreaField, TextField, useEnvio } from '@/shared/ui';
import type { ItemPremiacaoDaTurma } from '../domain/tipos';

interface Erros {
  premiadas?: string;
  decisao?: string;
  justificativa?: string;
}

/**
 * Decisão da coordenação sobre um empate numa posição premiada da definitiva (spec 012, FR-018b):
 * as equipes premiadas saem só das empatadas; a decisão fica registrada com justificativa.
 */
export function FormDecisaoEmpate({
  item,
  onDecidir,
  bloqueio,
}: {
  item: ItemPremiacaoDaTurma;
  onDecidir: (d: {
    premiadas: string[];
    decisao: string;
    justificativa: string;
  }) => Promise<unknown>;
  bloqueio?: string;
}) {
  const [premiadas, setPremiadas] = useState<string[]>([]);
  const [decisao, setDecisao] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const { estado, enviando, enviar } = useEnvio();

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    const novos: Erros = {
      premiadas: premiadas.length === 0 ? 'Escolha ao menos uma equipe premiada.' : undefined,
      decisao:
        decisao.trim().length < 3 || decisao.trim().length > 500
          ? 'Descreva a decisão com 3 a 500 caracteres.'
          : undefined,
      justificativa: validarJustificativa(justificativa) ?? undefined,
    };
    setErros(novos);
    if (novos.premiadas || novos.decisao || novos.justificativa) return;
    await enviar(
      () => onDecidir({ premiadas, decisao: decisao.trim(), justificativa: justificativa.trim() }),
      'Decisão registrada. A premiação da turma foi atualizada.',
    );
  }

  return (
    <form
      onSubmit={aoEnviar}
      noValidate
      aria-label={`Decidir o empate do ${item.posicao}º lugar`}
      className="mt-2 flex flex-col gap-3 rounded-md bg-surface-muted p-3"
    >
      <fieldset aria-describedby={erros.premiadas ? `premiadas-${item.posicao}-erro` : undefined}>
        <legend className="mb-1 text-sm font-semibold">Equipes premiadas</legend>
        {item.equipes.map((e) => (
          <label key={e.id} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5"
              checked={premiadas.includes(e.id)}
              onChange={() =>
                setPremiadas((atual) =>
                  atual.includes(e.id) ? atual.filter((x) => x !== e.id) : [...atual, e.id],
                )
              }
            />
            {e.nome}
          </label>
        ))}
        {erros.premiadas && (
          <p id={`premiadas-${item.posicao}-erro`} className="text-sm font-semibold text-red-700">
            {erros.premiadas}
          </p>
        )}
      </fieldset>
      <TextField
        rotulo="Decisão"
        dica="Como o prêmio desta posição fica entre as empatadas."
        maxLength={500}
        value={decisao}
        erro={erros.decisao}
        onChange={(e) => setDecisao(e.target.value)}
      />
      <TextAreaField
        rotulo="Justificativa"
        maxLength={2000}
        value={justificativa}
        erro={erros.justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <RodapeDoFormulario
        bloqueio={bloqueio}
        estado={estado}
        enviando={enviando}
        rotulo="Registrar decisão"
        icone="trofeu"
      />
    </form>
  );
}
