import { formatarDataHora } from '@/shared/lib/formatacao';
import { EmptyState, ResponsiveTable, StatusBadge } from '@/shared/ui';
import { rotuloEstadoRanking } from '../domain/prazos';
import type { VersaoPublicada } from '../domain/tipos';

/** Versões publicadas da categoria, imutáveis, com autor e justificativa (FR-018). */
export function HistoricoPublicacoes({ versoes }: { versoes: VersaoPublicada[] }) {
  if (versoes.length === 0) return <EmptyState titulo="Nenhuma versão publicada." />;
  return (
    <ResponsiveTable
      legenda="Histórico de publicações"
      chave={(v) => v.id}
      linhas={versoes}
      colunas={[
        { id: 'versao', titulo: 'Versão', compacta: true, valor: (v) => v.versao },
        {
          id: 'estado',
          titulo: 'Estado',
          valor: (v) => <StatusBadge estado={v.estado} rotulo={rotuloEstadoRanking(v.estado)} />,
        },
        {
          id: 'quando',
          titulo: 'Publicada em',
          compacta: true,
          valor: (v) => formatarDataHora(v.publicadoEm),
        },
        { id: 'autor', titulo: 'Por', valor: (v) => v.publicadoPorNome },
        { id: 'justificativa', titulo: 'Justificativa', valor: (v) => v.justificativa ?? '—' },
      ]}
    />
  );
}
