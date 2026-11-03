import { useId } from 'react';
import { Button, TextField } from '@/shared/ui';
import type { CriterioRubrica } from '../domain/tipos';

/**
 * Lista editável de critérios de uma rubrica (spec 011, FR-007): nome e pontuação máxima;
 * critério novo recebe id a partir do nome ao gravar; o id não muda ao renomear.
 */
export function EditorDeCriterios({
  caminho,
  criterios,
  onAlterar,
  erros,
  protegido,
  motivoProtegido,
  somenteLeitura = false,
}: {
  /** Prefixo do caminho dos erros (ex.: `entrega`). */
  caminho: string;
  criterios: CriterioRubrica[];
  onAlterar: (criterios: CriterioRubrica[]) => void;
  erros: Record<string, string>;
  /** Id do critério que não pode ser removido (ex.: critério de atraso). */
  protegido?: string;
  motivoProtegido?: string;
  somenteLeitura?: boolean;
}) {
  const idDica = useId();
  const alterar = (i: number, parcial: Partial<CriterioRubrica>) =>
    onAlterar(criterios.map((c, j) => (j === i ? { ...c, ...parcial } : c)));

  return (
    <div className="flex flex-col gap-3">
      {erros[`${caminho}.criterios`] && (
        <p className="text-sm font-medium text-error">{erros[`${caminho}.criterios`]}</p>
      )}
      <ul className="flex flex-col gap-3">
        {criterios.map((c, i) => (
          <li key={c.id || i} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
            <TextField
              rotulo="Nome do critério"
              value={c.rotulo}
              disabled={somenteLeitura}
              maxLength={80}
              erro={erros[`${caminho}.criterios.${i}.rotulo`]}
              onChange={(e) => alterar(i, { rotulo: e.target.value })}
            />
            <TextField
              rotulo="Pontuação máxima"
              type="number"
              min={0}
              step="any"
              value={Number.isNaN(c.maximo) ? '' : String(c.maximo)}
              disabled={somenteLeitura}
              erro={erros[`${caminho}.criterios.${i}.maximo`]}
              onChange={(e) =>
                alterar(i, { maximo: e.target.value === '' ? NaN : Number(e.target.value) })
              }
            />
            {!somenteLeitura && (
              <Button
                variante="secundario"
                icone="excluir"
                disabled={c.id === protegido}
                aria-describedby={c.id === protegido ? idDica : undefined}
                onClick={() => onAlterar(criterios.filter((_, j) => j !== i))}
                aria-label={`Remover ${c.rotulo || 'critério sem nome'}`}
              >
                Remover
              </Button>
            )}
          </li>
        ))}
      </ul>
      {protegido && motivoProtegido && (
        <p id={idDica} className="text-sm text-text-secondary">
          {motivoProtegido}
        </p>
      )}
      {!somenteLeitura && (
        <div>
          <Button
            variante="secundario"
            icone="adicionar"
            onClick={() => onAlterar([...criterios, { id: '', rotulo: '', maximo: 1 }])}
          >
            Adicionar critério
          </Button>
        </div>
      )}
    </div>
  );
}
