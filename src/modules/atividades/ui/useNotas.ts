import { useState } from 'react';
import type { CriterioRubrica, Notas } from '@/modules/pontuacao';

/** Notas por critério: um campo por critério das regras (FR-025), validado contra o máximo. */
export function useNotas(criterios: CriterioRubrica[], inicial?: Notas | null) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      criterios.map((c) => [c.id, inicial?.[c.id] !== undefined ? String(inicial[c.id]) : '']),
    ),
  );
  const ler = (): { notas: Notas | null; erro: string | null } => {
    const notas: Record<string, number> = {};
    for (const c of criterios) {
      const texto = (valores[c.id] ?? '').trim().replace(',', '.');
      const nota = Number(texto);
      if (texto === '' || !Number.isFinite(nota) || nota < 0 || nota > c.maximo) {
        return { notas: null, erro: `A nota de "${c.rotulo}" deve estar entre 0 e ${c.maximo}.` };
      }
      notas[c.id] = nota;
    }
    return { notas, erro: null };
  };
  const mudou = (atual: Notas) =>
    inicial ? criterios.some((c) => inicial[c.id] !== atual[c.id]) : false;
  return { valores, setValores, ler, mudou };
}
