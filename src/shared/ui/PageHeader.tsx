import type { ReactNode } from 'react';

interface PageHeaderProps {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
}

export function PageHeader({ titulo, descricao, acoes }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-text-secondary">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

/** Tela de módulo ainda não implementado: explicita o incremento previsto, sem simular função. */
export function EmConstrucao({ modulo, incremento }: { modulo: string; incremento: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-500 bg-surface p-6">
      <p className="font-semibold text-text">{modulo} — ainda não implementado</p>
      <p className="mt-1 text-sm text-text-secondary">
        Previsto para o {incremento}. Nenhum dado é registrado nesta tela.
      </p>
    </div>
  );
}
