import { formatarDataHora } from '@/shared/lib/formatacao';
import { ROTULO_DO_GRUPO, type ItemHistorico } from '../domain/regrasTipos';

const PAPEL = { coordenacao: 'coordenação', mentor: 'mentor' } as const;

/** Histórico das regras: versões da edição e ajustes da turma, mais recentes primeiro (FR-002). */
export function HistoricoRegras({ itens }: { itens: ItemHistorico[] }) {
  if (itens.length === 0) return <p className="text-sm text-text-secondary">Sem histórico.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {itens.map((i, n) => (
        <li key={n} className="flex flex-col gap-1 rounded-md border border-border p-3">
          <span className="font-semibold">
            {i.tipo === 'edicao'
              ? `Versão ${i.rotulo ?? ''}`
              : `Ajuste da turma: ${i.grupos.length ? i.grupos.map((g) => ROTULO_DO_GRUPO[g]).join(', ') : 'tudo herdado da edição'}`}
          </span>
          <span className="text-sm text-text-secondary">
            {i.valeDesde
              ? `Vale desde ${formatarDataHora(i.valeDesde)}`
              : 'Vale desde o início da edição'}
            {i.autor && ` · ${i.autor}${i.papel ? ` (${PAPEL[i.papel]})` : ''}`}
          </span>
          {i.justificativa && <span className="text-sm">{i.justificativa}</span>}
        </li>
      ))}
    </ol>
  );
}
