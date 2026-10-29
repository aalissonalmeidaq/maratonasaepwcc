import { cx } from './cx';

/** Estados do Design System §7: sempre texto + marcador, nunca só cor. */
const ESTADOS = {
  em_andamento: {
    rotulo: 'Em andamento',
    cor: 'bg-blue-600/10 text-blue-700',
    ponto: 'bg-blue-600',
  },
  enviado: { rotulo: 'Enviado', cor: 'bg-blue-600/10 text-blue-700', ponto: 'bg-blue-600' },
  avaliado: { rotulo: 'Avaliado', cor: 'bg-green-700/10 text-green-700', ponto: 'bg-green-700' },
  concluido: { rotulo: 'Concluído', cor: 'bg-green-700/10 text-green-700', ponto: 'bg-green-700' },
  pendente: { rotulo: 'Pendente', cor: 'bg-amber-800/10 text-amber-800', ponto: 'bg-yellow-500' },
  em_atraso: { rotulo: 'Em atraso', cor: 'bg-red-700/10 text-red-700', ponto: 'bg-red-700' },
  nao_enviado: { rotulo: 'Não enviado', cor: 'bg-red-700/10 text-red-700', ponto: 'bg-red-700' },
  agendado: { rotulo: 'Agendado', cor: 'bg-purple-500/15 text-navy-900', ponto: 'bg-purple-500' },
  parcial: { rotulo: 'Parcial', cor: 'bg-gray-200 text-gray-700', ponto: 'bg-gray-500' },
  provisorio: {
    rotulo: 'Provisório',
    cor: 'bg-amber-800/10 text-amber-800',
    ponto: 'bg-yellow-500',
  },
  definitivo: {
    rotulo: 'Definitivo',
    cor: 'bg-green-700/10 text-green-700',
    ponto: 'bg-green-700',
  },
  a_confirmar: {
    rotulo: 'A confirmar',
    cor: 'bg-amber-800/10 text-amber-800',
    ponto: 'bg-yellow-500',
  },
} as const;

export type EstadoVisual = keyof typeof ESTADOS;

export function StatusBadge({ estado, rotulo }: { estado: EstadoVisual; rotulo?: string }) {
  const e = ESTADOS[estado];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        e.cor,
      )}
    >
      <span aria-hidden="true" className={cx('size-2 rounded-full', e.ponto)} />
      {rotulo ?? e.rotulo}
    </span>
  );
}
