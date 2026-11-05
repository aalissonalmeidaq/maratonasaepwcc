import { useId, useState, type ReactNode } from 'react';
import { formatarDataHora } from '@/shared/lib/formatacao';
import { Alert, Button, StatusBadge, type EstadoVisual } from '@/shared/ui';
import { ROTULO_SITUACAO } from '../domain/situacao';
import type { Premissa, Resposta, Situacao } from '../domain/tipos';

const BADGE: Record<Situacao, EstadoVisual> = {
  aguardando: 'pendente',
  confirmada: 'concluido',
  precisa_mudar: 'em_atraso',
};

export function SeloSituacao({ situacao }: { situacao: Situacao }) {
  return <StatusBadge estado={BADGE[situacao]} rotulo={ROTULO_SITUACAO[situacao]} />;
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-sm text-text">{children}</dd>
    </div>
  );
}

function TextoDaResposta({ resposta }: { resposta: Resposta }) {
  return (
    <>
      <p className="text-sm">
        <span className="font-semibold">{ROTULO_SITUACAO[resposta.decisao]}</span> por{' '}
        {resposta.autorNome} em {formatarDataHora(resposta.registradoEm)}:
      </p>
      <p className="text-sm whitespace-pre-line">{resposta.justificativa}</p>
    </>
  );
}

/**
 * Uma premissa do catálogo (contracts/telas.md): pergunta, premissa em uso, impacto, opções,
 * referência, resposta atual e histórico. `children` recebe o formulário de resposta (US2).
 */
export function CartaoPremissa({
  premissa,
  children,
}: {
  premissa: Premissa;
  children?: ReactNode;
}) {
  const idTitulo = useId();
  const idHistorico = useId();
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const anteriores = premissa.historico.slice(0, -1).reverse();
  return (
    <article
      aria-labelledby={idTitulo}
      className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm break-inside-avoid sm:p-5 print:shadow-none"
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 id={idTitulo} className="min-w-0 font-display text-base font-semibold text-text">
          <span className="mr-2 rounded bg-navy-900 px-1.5 py-0.5 font-mono text-xs text-white">
            {premissa.codigo}
          </span>{' '}
          {premissa.pergunta}
        </h3>
        {premissa.resolvidaPor ? (
          <StatusBadge estado="parcial" rotulo={`Resolvida pela ${premissa.resolvidaPor}`} />
        ) : (
          <SeloSituacao situacao={premissa.situacao} />
        )}
      </header>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Em uso hoje">{premissa.premissaEmUso}</Campo>
        <Campo rotulo="Onde afeta">{premissa.ondeAfeta}</Campo>
        {premissa.opcoes.length > 0 && (
          <Campo rotulo="Opções conhecidas">
            <ul className="list-disc pl-5">
              {premissa.opcoes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </Campo>
        )}
        <Campo rotulo="Referência">{premissa.referencia}</Campo>
      </dl>
      {premissa.atual && (
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
          <TextoDaResposta resposta={premissa.atual} />
        </div>
      )}
      {premissa.situacao === 'precisa_mudar' && !premissa.resolvidaPor && (
        <div className="mt-3">
          <Alert tom="info" titulo="O sistema segue a premissa em uso até a mudança ser feita." />
        </div>
      )}
      {anteriores.length > 0 && (
        <div className="mt-3">
          <Button
            variante="secundario"
            aria-expanded={historicoAberto}
            aria-controls={idHistorico}
            onClick={() => setHistoricoAberto((a) => !a)}
            className="print:hidden"
          >
            Ver histórico ({premissa.historico.length})
          </Button>
          <ol
            id={idHistorico}
            className={`mt-2 flex flex-col gap-2 border-l-2 border-border pl-3 print:flex ${historicoAberto ? '' : 'hidden'}`}
          >
            {anteriores.map((r) => (
              <li key={r.id}>
                <TextoDaResposta resposta={r} />
              </li>
            ))}
          </ol>
        </div>
      )}
      {children}
    </article>
  );
}
