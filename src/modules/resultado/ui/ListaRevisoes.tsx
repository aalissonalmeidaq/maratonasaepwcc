import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { EmptyState, StatusBadge, type EstadoVisual } from '@/shared/ui';
import type { EstadoRevisao, PedidoRevisao } from '../domain/tipos';
import { ROTULO_COMPONENTE, objetoDoPedido } from '../domain/prazos';

const ESTADO: Record<EstadoRevisao, { visual: EstadoVisual; rotulo: string }> = {
  aberto: { visual: 'pendente', rotulo: 'Aberto' },
  deferido: { visual: 'concluido', rotulo: 'Deferido' },
  indeferido: { visual: 'parcial', rotulo: 'Indeferido' },
};

const TABELA: Record<string, string> = {
  presencas: 'Presença',
  participacoes: 'Participação',
  avaliacoes: 'Avaliação',
  resultados_prova: 'Prova oficial',
  ocorrencias: 'Decisão da ocorrência',
};

const rotuloCorrecao = (p: PedidoRevisao) =>
  p.objeto === 'ocorrencia'
    ? 'Rever a decisão'
    : `Corrigir ${(p.componente ? ROTULO_COMPONENTE[p.componente] : 'pontos').toLowerCase()}`;

/**
 * Pedidos de revisão (US5): objeto, motivo, estado, resposta e as correções de origem já
 * ligadas ao pedido (FR-022). Para a coordenação, atalho à correção com `?pedido=`.
 */
export function ListaRevisoes({
  pedidos,
  linkCorrecao,
  acoes,
}: {
  pedidos: PedidoRevisao[];
  linkCorrecao?: (p: PedidoRevisao) => string | null;
  acoes?: (p: PedidoRevisao) => ReactNode;
}) {
  if (pedidos.length === 0) return <EmptyState titulo="Nenhum pedido de revisão." />;
  return (
    <ul className="flex flex-col gap-4">
      {pedidos.map((p) => {
        const link = p.estado === 'aberto' ? linkCorrecao?.(p) : null;
        return (
          <li key={p.id} className="rounded-lg border border-border bg-surface p-4">
            <article aria-labelledby={`rev-${p.id}`} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={`rev-${p.id}`} className="font-semibold">
                  {objetoDoPedido(p)} — {p.duplaNome}
                </h3>
                <StatusBadge estado={ESTADO[p.estado].visual} rotulo={ESTADO[p.estado].rotulo} />
              </div>
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
                <dt className="font-semibold">Motivo</dt>
                <dd>
                  {p.justificativa}
                  <span className="block text-text-secondary">
                    {p.autorNome}, {formatarDataHora(p.criadoEm)}
                  </span>
                </dd>
                {p.resposta && (
                  <>
                    <dt className="font-semibold">Resposta</dt>
                    <dd>
                      {p.resposta}
                      {p.respondidoEm && (
                        <span className="block text-text-secondary">
                          {formatarDataHora(p.respondidoEm)}
                        </span>
                      )}
                    </dd>
                  </>
                )}
                {p.correcoes.length > 0 && (
                  <>
                    <dt className="font-semibold">Correções ligadas</dt>
                    <dd>
                      <ul className="flex flex-col gap-1">
                        {p.correcoes.map((c, i) => (
                          <li key={`${c.tabela}-${i}`}>
                            {TABELA[c.tabela] ?? c.tabela}, {formatarDataHora(c.ocorridoEm)}
                            {c.justificativa && `: ${c.justificativa}`}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </>
                )}
              </dl>
              {link && (
                <Link
                  to={link}
                  className="self-start font-semibold text-blue-700 underline underline-offset-2"
                >
                  {rotuloCorrecao(p)}
                </Link>
              )}
              {acoes?.(p)}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
