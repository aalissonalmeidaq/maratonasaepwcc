import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type NomeIcone } from './Icon';

type Tom = 'sucesso' | 'erro' | 'alerta' | 'info';

const TONS: Record<Tom, { classe: string; icone: NomeIcone }> = {
  sucesso: { classe: 'border-green-700 bg-green-700/8 text-green-700', icone: 'sucesso' },
  erro: { classe: 'border-red-700 bg-red-700/8 text-red-700', icone: 'erro' },
  alerta: { classe: 'border-amber-800 bg-yellow-500/15 text-amber-800', icone: 'alerta' },
  info: { classe: 'border-blue-700 bg-blue-600/8 text-navy-900', icone: 'info' },
};

interface AlertProps {
  tom: Tom;
  titulo: string;
  children?: ReactNode;
  /** Anunciar imediatamente (erros e confirmações de envio). */
  anunciar?: boolean;
}

/** Feedback de sucesso, falha, alerta ou informação: ícone + texto, nunca só cor. */
export function Alert({ tom, titulo, children, anunciar = false }: AlertProps) {
  const t = TONS[tom];
  return (
    <div
      role={anunciar ? (tom === 'erro' ? 'alert' : 'status') : undefined}
      className={cx('flex gap-3 rounded-md border-l-4 p-3', t.classe)}
    >
      <span className="mt-0.5 shrink-0">
        <Icon nome={t.icone} />
      </span>
      <div className="text-sm">
        <p className="font-semibold">{titulo}</p>
        {children && <div className="mt-1 text-text">{children}</div>}
      </div>
    </div>
  );
}
