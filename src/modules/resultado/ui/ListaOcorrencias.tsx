import type { ReactNode } from 'react';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { Button, EmptyState, StatusBadge, type EstadoVisual } from '@/shared/ui';
import { rotuloEstadoOcorrencia } from '../domain/prazos';
import type { EstadoOcorrencia, Ocorrencia } from '../domain/tipos';

const VISUAL: Record<EstadoOcorrencia, EstadoVisual> = {
  registrada: 'pendente',
  manifestada: 'enviado',
  confirmada: 'concluido',
  arquivada: 'parcial',
};

/**
 * Ocorrências visíveis a quem consulta (FR-010): estado em texto, prazo de manifestação,
 * evidência, manifestação e decisão. As ações (manifestar, decidir, pedir revisão) entram por
 * `acoes`, conforme o perfil.
 */
export function ListaOcorrencias({
  ocorrencias,
  onAbrirEvidencia,
  acoes,
}: {
  ocorrencias: Ocorrencia[];
  onAbrirEvidencia?: (caminho: string) => void;
  acoes?: (o: Ocorrencia) => ReactNode;
}) {
  if (ocorrencias.length === 0) {
    return <EmptyState titulo="Nenhuma ocorrência registrada." />;
  }
  return (
    <ul className="flex flex-col gap-4">
      {ocorrencias.map((o) => (
        <li key={o.id} className="rounded-lg border border-border bg-surface p-4">
          <article aria-labelledby={`oc-${o.id}`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`oc-${o.id}`} className="font-semibold">
                {o.tipoRotulo} — {o.duplaNome}
              </h3>
              <StatusBadge estado={VISUAL[o.estado]} rotulo={rotuloEstadoOcorrencia(o.estado)} />
            </div>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
              <dt className="font-semibold">Encontro</dt>
              <dd>{o.encontroNumero}</dd>
              <dt className="font-semibold">Fato</dt>
              <dd>{o.fato}</dd>
              <dt className="font-semibold">Evidência</dt>
              <dd className="flex flex-col items-start gap-2">
                <span>{o.evidencia}</span>
                {o.evidenciaPath && onAbrirEvidencia && (
                  <Button
                    variante="secundario"
                    icone="download"
                    onClick={() => onAbrirEvidencia(o.evidenciaPath!)}
                    aria-label={`Abrir evidência ${o.evidenciaNome ?? ''}`.trim()}
                  >
                    Abrir evidência
                  </Button>
                )}
              </dd>
              <dt className="font-semibold">Registro</dt>
              <dd>
                {o.autorNome}, {formatarDataHora(o.criadoEm)}
              </dd>
              {!o.decisao && (
                <>
                  <dt className="font-semibold">Prazo de manifestação</dt>
                  <dd>{formatarDataHora(o.prazoManifestacao)}</dd>
                </>
              )}
              {o.manifestacao && (
                <>
                  <dt className="font-semibold">Manifestação</dt>
                  <dd>
                    <p>{o.manifestacao.texto}</p>
                    <p className="text-text-secondary">
                      {o.manifestacao.autorNome}, {formatarDataHora(o.manifestacao.enviadaEm)}
                    </p>
                  </dd>
                </>
              )}
              {o.decisao && (
                <>
                  <dt className="font-semibold">Decisão</dt>
                  <dd>
                    <p>
                      {rotuloEstadoOcorrencia(o.estado)}: {o.decisao.justificativa}
                    </p>
                    {o.decisao.apresentacaoDependente && (
                      <p>A apresentação dependia da entrega e também foi zerada.</p>
                    )}
                    <p className="text-text-secondary">
                      {o.decisao.decididoPorNome}, {formatarDataHora(o.decisao.decididoEm)}
                    </p>
                  </dd>
                </>
              )}
            </dl>
            {acoes?.(o)}
          </article>
        </li>
      ))}
    </ul>
  );
}
