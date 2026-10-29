import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ROTULO_PAPEL, type Area } from '@/modules/acesso';
import { useAuth } from '@/modules/auth';
import { BotaoInstalar } from '@/shared/pwa';
import { Brand, Button, Icon, MarcaSenaiProvisoria, cx } from '@/shared/ui';
import { MENUS, ROTULO_AREA } from '../navegacao';

function Menu({ area, aoNavegar }: { area: Area; aoNavegar?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {MENUS[area].map((item) => (
        <li key={item.caminho}>
          <NavLink
            to={item.caminho}
            end
            onClick={aoNavegar}
            className={({ isActive }) =>
              cx(
                'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                'focus-visible:shadow-[0_0_0_3px_var(--color-cyan-500)] focus-visible:outline-none',
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-white/85 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon nome={item.icone} />
            {item.rotulo}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Faixas diagonais da marca, usadas com moderação como grafismo (Design System §2). */
function Faixas() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 -bottom-4 flex gap-2 opacity-90"
    >
      <span className="h-24 w-4 rotate-35 rounded-sm bg-cyan-500" />
      <span className="h-24 w-4 rotate-35 rounded-sm bg-yellow-500" />
      <span className="h-24 w-4 rotate-35 rounded-sm bg-coral-500" />
      <span className="h-24 w-4 rotate-35 rounded-sm bg-purple-500" />
    </div>
  );
}

export function AppShell({ area }: { area: Area }) {
  const { sessao, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const painelMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    painelMenu.current?.querySelector<HTMLElement>('a')?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAberto(false);
        botaoMenu.current?.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [menuAberto]);

  const papel = sessao?.papeis[0];

  return (
    <div className="min-h-dvh lg:pl-(--sidebar-width)">
      <a
        href="#conteudo"
        className="sr-only z-(--z-modal) rounded-md bg-white px-4 py-2 font-semibold text-navy-900 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>

      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-(--z-header) hidden w-(--sidebar-width) flex-col overflow-hidden bg-navy-900 px-4 py-6 lg:flex">
        <Brand variante="textoBranco" className="mb-8 w-48" />
        <nav aria-label={ROTULO_AREA[area]} className="flex-1">
          <Menu area={area} />
        </nav>
        <div className="relative z-10 mt-6">
          <MarcaSenaiProvisoria fundo="escuro" />
        </div>
        <Faixas />
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-(--z-header) border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
          <button
            ref={botaoMenu}
            type="button"
            className="grid size-11 place-items-center rounded-md text-navy-900 hover:bg-surface-muted focus-visible:shadow-(--focus-ring) focus-visible:outline-none lg:hidden"
            aria-expanded={menuAberto}
            aria-controls="menu-movel"
            onClick={() => setMenuAberto((v) => !v)}
          >
            <Icon
              nome={menuAberto ? 'fechar' : 'menu'}
              rotulo={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            />
          </button>
          <Brand variante="positivo" className="w-32 lg:hidden" />
          <p className="hidden text-sm font-semibold text-text-secondary lg:block">
            {ROTULO_AREA[area]}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <BotaoInstalar />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-text">{sessao?.nome}</p>
              {papel && <p className="text-xs text-text-secondary">{ROTULO_PAPEL[papel]}</p>}
            </div>
            <Button variante="terciario" icone="sair" onClick={() => void sair()}>
              Sair
            </Button>
          </div>
        </div>

        {/* Menu recolhível (celular e tablet): ancorado logo abaixo do cabeçalho, para nunca
            cobrir o botão de fechar, qualquer que seja a altura dos avisos acima. */}
        {menuAberto && (
          <div
            id="menu-movel"
            ref={painelMenu}
            className="absolute inset-x-0 top-full z-(--z-overlay) h-[calc(100dvh-4rem)] overflow-y-auto bg-navy-900 px-4 py-4 lg:hidden"
          >
            <nav aria-label={ROTULO_AREA[area]}>
              <Menu area={area} aoNavegar={() => setMenuAberto(false)} />
            </nav>
            <div className="mt-6 sm:hidden">
              <p className="text-sm font-semibold text-white">{sessao?.nome}</p>
              {papel && <p className="text-xs text-white/75">{ROTULO_PAPEL[papel]}</p>}
            </div>
          </div>
        )}
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-(--content-max) px-4 py-6 sm:px-6 lg:px-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
