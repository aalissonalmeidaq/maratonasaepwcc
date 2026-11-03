import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatarData } from '@/shared/lib/formatacao';
import { StatusBadge } from '@/shared/ui';
import type { EncontroDoPainel } from '../domain/tipos';

/** Link de ação dos painéis: leva à página onde o dado é visto ou a ação é feita (FR-005). */
export function LinkDoPainel({ para, children }: { para: string; children: ReactNode }) {
  return (
    <Link
      to={para}
      className="inline-flex min-h-11 items-center rounded-md font-semibold text-link underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}

export const SeloFicticio = () => <StatusBadge estado="a_confirmar" rotulo="Dados fictícios" />;

export function TextoEncontro({ encontro }: { encontro: EncontroDoPainel | null }) {
  if (!encontro) return <p>Nenhum encontro futuro cadastrado.</p>;
  return (
    <>
      <p className="text-lg font-semibold">
        {encontro.numero}. {encontro.titulo}
      </p>
      <p className="mt-1 text-text-secondary">
        {formatarData(encontro.data, { weekday: 'long' })}
        {encontro.inicio ? ` · ${encontro.inicio}` : ' · horário a confirmar'}
      </p>
    </>
  );
}
