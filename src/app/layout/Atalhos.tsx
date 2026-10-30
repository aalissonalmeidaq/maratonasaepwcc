import type { Area } from '@/modules/acesso';
import { CardDestaque } from '@/shared/ui';
import { Link } from 'react-router';
import { MENUS } from '../navegacao';

const ACENTOS = ['azul', 'amarelo', 'coral', 'ciano', 'roxo'] as const;

/**
 * Acesso rápido do painel inicial: os itens do menu do perfil como cartões de destaque
 * (prancha 09, "Cards e componentes digitais").
 */
export function Atalhos({ area, compacto = false }: { area: Area; compacto?: boolean }) {
  const itens = MENUS[area].filter((i) => i.caminho !== `/${area}`);
  return (
    <nav aria-label="Acesso rápido" className="mb-6">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
        {itens.map((item, i) => (
          <li key={item.caminho} className="min-w-0">
            {compacto ? (
              <Link
                to={item.caminho}
                className="flex min-h-11 items-center rounded-md border border-border bg-surface px-3 py-2 font-semibold text-link wrap-anywhere hover:bg-surface-muted"
              >
                {item.rotulo}
              </Link>
            ) : (
              <CardDestaque
                titulo={item.rotulo}
                descricao={item.descricao}
                icone={item.icone}
                para={item.caminho}
                acento={ACENTOS[i % ACENTOS.length]}
              />
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
