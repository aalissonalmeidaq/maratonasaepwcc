import { StatusBadge } from '@/shared/ui';
import type { EstadoEdicao } from '../domain/edicoes';
import { SELOS } from './textoDaEdicao';

/** Estado da edição sempre em texto; "rascunho" aparece como "Em preparação" (FR-015). */
export function SeloDaEdicao({ estado }: { estado: EstadoEdicao }) {
  const s = SELOS[estado];
  return <StatusBadge estado={s.estado} rotulo={s.rotulo} />;
}
