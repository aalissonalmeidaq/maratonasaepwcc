import { useId } from 'react';
import type { Area } from '@/modules/acesso';
import { CardDestaque } from '@/shared/ui';
import { Link } from 'react-router';
import { MENUS } from '../navegacao';

const ACENTOS = ['azul', 'amarelo', 'coral', 'ciano', 'roxo'] as const;

/**
 * Acesso rápido do painel inicial: os itens do menu do perfil como cartões de destaque
 * (prancha 09, "Cards e componentes digitais"), nas categorias do menu (spec 011, US6).
 */
export function Atalhos({ area, compacto = false }: { area: Area; compacto?: boolean }) {
  const idBase = useId();
  const grupos = MENUS[area].grupos;
  // Acento contínuo entre os grupos, como na lista única de antes.
  const ordem = new Map(grupos.flatMap((g) => g.itens).map((item, i) => [item.caminho, i]));
  return (
    <nav aria-label="Acesso rápido" className="mb-6 flex flex-col gap-4">
      {grupos.map((g, gi) => (
        <section key={g.titulo} className="flex flex-col gap-2">
          <h2 id={`${idBase}-${gi}`} className="text-sm font-semibold text-text-secondary">
            {g.titulo}
          </h2>
          <ul
            aria-labelledby={`${idBase}-${gi}`}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
          >
            {g.itens.map((item) => (
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
                    acento={ACENTOS[(ordem.get(item.caminho) ?? 0) % ACENTOS.length]}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
