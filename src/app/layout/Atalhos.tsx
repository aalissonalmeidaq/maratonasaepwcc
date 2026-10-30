import { Link } from 'react-router';
import type { Area } from '@/modules/acesso';
import { Icon } from '@/shared/ui';
import { MENUS } from '../navegacao';

/**
 * Acesso rápido do painel inicial: os itens do menu do perfil como blocos com o ícone da marca
 * (Design System §7, "Componentes de dashboard").
 */
export function Atalhos({ area }: { area: Area }) {
  const itens = MENUS[area].filter((i) => i.caminho !== `/${area}`);
  return (
    <nav aria-label="Acesso rápido" className="mb-6">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {itens.map((item) => (
          <li key={item.caminho}>
            <Link
              to={item.caminho}
              className="flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3 text-center text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:border-blue-600 hover:bg-surface-muted focus-visible:shadow-(--focus-ring) focus-visible:outline-none"
            >
              <Icon nome={item.icone} tamanho="xl" cor="marca" />
              {item.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
