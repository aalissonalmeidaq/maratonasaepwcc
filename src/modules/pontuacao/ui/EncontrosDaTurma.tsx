import { useId, useState, type FormEvent } from 'react';
import { Button, RetornoEnvio, useEnvio } from '@/shared/ui';
import type { EncontroBloqueado } from '../domain/regrasTipos';

/**
 * Encontros de que a turma participa (US3, FR-008): todos marcados por padrão; encontro com
 * lançamentos da turma fica marcado e bloqueado, com o motivo. Grava só após a resposta.
 */
export function EncontrosDaTurma({
  encontros,
  excluidos,
  bloqueados,
  onGravar,
  bloqueio,
}: {
  encontros: { id: string; numero: number; titulo: string }[];
  excluidos: string[];
  bloqueados: EncontroBloqueado[];
  onGravar: (excluidos: string[]) => Promise<unknown>;
  bloqueio?: string;
}) {
  const base = useId();
  const [fora, setFora] = useState(excluidos);
  const { estado, enviando, enviar } = useEnvio();
  const motivo = (id: string) => bloqueados.find((b) => b.encontroId === id)?.motivo;

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    await enviar(() => onGravar(fora), 'Encontros da turma gravados.');
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">Encontros de que a turma participa</legend>
        {encontros.map((e) => {
          const travado = motivo(e.id);
          return (
            <div key={e.id} className="flex flex-col">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={!fora.includes(e.id)}
                  disabled={Boolean(travado)}
                  aria-describedby={travado ? `${base}-${e.id}` : undefined}
                  onChange={(ev) =>
                    setFora((f) => (ev.target.checked ? f.filter((x) => x !== e.id) : [...f, e.id]))
                  }
                  className="size-5"
                />
                {e.numero}. {e.titulo}
              </label>
              {travado && (
                <p id={`${base}-${e.id}`} className="ml-8 text-sm text-text-secondary">
                  {travado}
                </p>
              )}
            </div>
          );
        })}
      </fieldset>
      <RetornoEnvio estado={estado} />
      <div>
        <Button type="submit" icone="salvar" carregando={enviando} disabled={Boolean(bloqueio)}>
          Gravar encontros da turma
        </Button>
      </div>
    </form>
  );
}
