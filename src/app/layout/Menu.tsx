import { Fragment, useId, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import type { Area } from '@/modules/acesso';
import { Icon, cx } from '@/shared/ui';
import { MENUS, itensDoMenu, type ItemMenu } from '../navegacao';

/**
 * Menu da área (barra lateral e menu do celular): Início no topo e os itens agrupados nas
 * categorias da área (spec 011, US6). Cada categoria é recolhível: começa fechada (salvo a da
 * página atual) e abrir uma fecha a anterior — só uma fica aberta por vez.
 */
export function Menu({
  area,
  variante = 'sidebar',
  aberto = true,
  emArrasto = false,
  aoNavegar,
  extras,
}: {
  area: Area;
  variante?: 'sidebar' | 'drawer';
  aberto?: boolean;
  emArrasto?: boolean;
  aoNavegar?: () => void;
  /** Conteúdo extra por caminho do menu (ex.: contador de convites). */
  extras?: Partial<Record<string, ReactNode>>;
}) {
  const ehDrawer = variante === 'drawer';
  const idBase = useId();
  const { inicio, grupos } = MENUS[area];
  // Posição de cada item na ordem do menu (atraso da animação de entrada no celular).
  const posicao = new Map(itensDoMenu(area).map((item, i) => [item.caminho, i]));
  const { pathname } = useLocation();
  const grupoDaPagina = grupos.findIndex((g) => g.itens.some((i) => i.caminho === pathname));
  // Ao mudar de página, a categoria aberta passa a ser a da página atual (ou nenhuma).
  const [estado, setEstado] = useState({ caminho: pathname, aberto: grupoDaPagina });
  if (estado.caminho !== pathname) setEstado({ caminho: pathname, aberto: grupoDaPagina });
  const aberta = estado.caminho === pathname ? estado.aberto : grupoDaPagina;
  const alternar = (i: number) => setEstado({ caminho: pathname, aberto: aberta === i ? -1 : i });
  const linha = (item: ItemMenu) => {
    const indice = posicao.get(item.caminho) ?? 0;
    return (
      <li
        key={item.caminho}
        style={
          ehDrawer
            ? {
                transitionDuration: emArrasto ? '0ms' : undefined,
                transitionDelay: !emArrasto && aberto ? `${Math.min(indice * 45, 315)}ms` : '0ms',
              }
            : undefined
        }
        className={cx(
          ehDrawer &&
            'transition-[translate,scale,opacity] duration-600 ease-[cubic-bezier(0.32,0.72,0,1)]',
          ehDrawer &&
            (aberto || emArrasto ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'),
        )}
      >
        <NavLink
          to={item.caminho}
          end
          onClick={aoNavegar}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 text-sm transition-colors',
              ehDrawer ? 'min-h-10 sm:min-h-10.5' : 'min-h-11',
              'focus-visible:shadow-[0_0_0_3px_var(--color-cyan-500)] focus-visible:outline-none',
              ehDrawer
                ? cx(
                    '-ml-4 rounded-r-full pr-4 pl-5 sm:-ml-6 sm:pr-5 sm:pl-6',
                    isActive
                      ? 'bg-white font-semibold text-navy-900 shadow-sm'
                      : 'font-medium text-white/85 hover:bg-white/10 hover:text-white',
                  )
                : cx(
                    'rounded-md px-3 font-medium',
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-white/85 hover:bg-white/10 hover:text-white',
                  ),
            )
          }
        >
          <Icon nome={item.icone} />
          <span className="truncate">{item.rotulo}</span>
          {extras?.[item.caminho]}
        </NavLink>
      </li>
    );
  };
  return (
    <ul className="flex flex-col gap-1">
      {linha(inicio)}
      {grupos.map((g, i) => {
        const expandida = aberta === i;
        const temPaginaAtual = grupoDaPagina === i;
        return (
          <li
            key={g.titulo}
            className={cx('flex flex-col gap-1', i === 0 && 'mt-2 border-t border-white/10 pt-2')}
          >
            <button
              type="button"
              id={`${idBase}-${i}`}
              aria-expanded={expandida}
              aria-controls={`${idBase}-${i}-itens`}
              onClick={() => alternar(i)}
              className={cx(
                'flex w-full items-center gap-3 text-left text-sm font-semibold transition-colors',
                'focus-visible:shadow-[0_0_0_3px_var(--color-cyan-500)] focus-visible:outline-none',
                ehDrawer
                  ? 'min-h-10 -ml-4 rounded-r-full pr-4 pl-5 sm:min-h-10.5 sm:-ml-6 sm:pr-5 sm:pl-6'
                  : 'min-h-11 rounded-md px-3',
                expandida || temPaginaAtual
                  ? 'text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
                expandida && 'bg-white/5',
              )}
            >
              <Icon nome={g.icone} />
              <span className="min-w-0 flex-1 truncate">{g.titulo}</span>
              {/* Recolhida, a categoria ainda mostra os avisos dos itens (ex.: convites) e onde
                  está a página atual. */}
              {!expandida &&
                g.itens.map((item) => (
                  <Fragment key={item.caminho}>{extras?.[item.caminho]}</Fragment>
                ))}
              {!expandida && temPaginaAtual && (
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-cyan-500" />
              )}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={cx(
                  'size-4 shrink-0 opacity-75 transition-transform duration-200 motion-reduce:transition-none',
                  expandida && 'rotate-180',
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <ul
              id={`${idBase}-${i}-itens`}
              aria-labelledby={`${idBase}-${i}`}
              hidden={!expandida}
              className={cx(
                'flex flex-col gap-1',
                // Recuo com linha-guia: deixa claro que os itens pertencem à categoria.
                ehDrawer ? 'pl-3' : 'ml-5 border-l border-white/15 pl-2',
              )}
            >
              {g.itens.map(linha)}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
