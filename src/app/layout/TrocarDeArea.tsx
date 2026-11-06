import { Link } from 'react-router';
import { areasDoAcesso, type Area } from '@/modules/acesso';
import { useAuth } from '@/modules/auth';
import { cx } from '@/shared/ui';
import { ROTULO_AREA } from '../navegacao';

/**
 * Atalho para as outras áreas a que a conta tem direito (spec 016, FR-006b): quem acumula funções
 * (ex.: gestão e coordenação) escolhe a área aqui. Navegação, não barreira: o servidor decide.
 */
export function TrocarDeArea({
  areaAtual,
  fundo,
  className,
}: {
  areaAtual: Area;
  fundo: 'escuro' | 'claro';
  className?: string;
}) {
  const { sessao } = useAuth();
  const outras = sessao ? areasDoAcesso(sessao).filter((a) => a !== areaAtual) : [];
  if (outras.length === 0) return null;
  return (
    <nav aria-label="Trocar de área" className={cx('text-sm', className)}>
      <p
        className={cx('mb-1 text-xs', fundo === 'escuro' ? 'text-white/70' : 'text-text-secondary')}
      >
        Trocar de área
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {outras.map((area) => (
          <li key={area}>
            <Link
              to={`/${area}`}
              className={cx(
                'inline-flex min-h-6 items-center font-semibold underline underline-offset-2',
                fundo === 'escuro' ? 'text-white' : 'text-link',
              )}
            >
              {ROTULO_AREA[area]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
