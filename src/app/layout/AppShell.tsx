import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ROTULO_PAPEL, type Area } from '@/modules/acesso';
import { useAuth } from '@/modules/auth';
import { ContadorConvites } from '@/modules/duplas';
import { BotaoInstalar } from '@/shared/pwa';
import { Brand, Button, Icon, MarcaSenai, PadraoGrafico, cx } from '@/shared/ui';
import { useConvitesPendentes } from '../dados/consultas';
import { MENUS, ROTULO_AREA } from '../navegacao';

function obterIniciais(nome?: string): string {
  if (!nome) return 'MS';
  const limpo = nome.replace(/[()]/g, '').trim();
  const partes = limpo.split(/\s+/).filter((p) => p.length > 0 && !p.endsWith('.'));
  const primeira = partes[0];
  const ultima = partes[partes.length - 1];
  if (!primeira || !ultima) return limpo.slice(0, 2).toUpperCase();
  if (partes.length === 1) return primeira.slice(0, 2).toUpperCase();
  return `${primeira.charAt(0)}${ultima.charAt(0)}`.toUpperCase();
}

function Menu({
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
  return (
    <ul className={cx('flex flex-col', ehDrawer ? 'gap-1' : 'gap-1')}>
      {MENUS[area].map((item, indice) => (
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
      ))}
    </ul>
  );
}

export function AppShell({ area }: { area: Area }) {
  const { sessao, sair } = useAuth();
  const convitesPendentes = useConvitesPendentes(area === 'aluno');
  const extrasDoMenu = {
    '/aluno/dupla': <ContadorConvites quantidade={convitesPendentes} />,
  };
  const [menuAberto, setMenuAberto] = useState(false);
  const [emTransicao, setEmTransicao] = useState(false);
  const [arrasto, setArrasto] = useState<{
    abertura: number;
    deslocamentoAbertoPx: number;
    escalaAberta: number;
  } | null>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const painelMenu = useRef<HTMLDivElement>(null);
  const suprimirCliqueRef = useRef(false);
  const gestoRef = useRef({
    ativo: false,
    arrastando: false,
    modo: 'fechando' as 'abrindo' | 'fechando',
    ponteiroId: -1,
    inicioX: 0,
    inicioY: 0,
    larguraDrawer: 240,
    deslocamentoAbertoPx: 220,
    escalaAberta: 0.82,
    fracaoAtual: 0,
  });

  const abrirMenu = () => {
    setArrasto(null);
    setEmTransicao(true);
    setMenuAberto(true);
  };

  const fecharMenu = () => {
    setArrasto(null);
    setMenuAberto(false);
    setEmTransicao(true);
  };

  const alternarMenu = () => {
    if (menuAberto) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  };

  const iniciarGesto = (
    clientX: number,
    clientY: number,
    alvo: EventTarget | null,
    ponteiroId = -1,
  ) => {
    if (window.innerWidth >= 1024) return;
    if (!menuAberto) {
      // A abertura do drawer só deve iniciar a até 30% da margem esquerda
      if (clientX > window.innerWidth * 0.3) return;
      if (alvo instanceof Element) {
        if (alvo.closest('input, textarea, select, [contenteditable="true"]')) return;
      }
    }
    const larguraDrawer = painelMenu.current?.offsetWidth || 240;
    const ehTablet = window.innerWidth >= 640;
    gestoRef.current = {
      ativo: true,
      arrastando: false,
      modo: menuAberto ? 'fechando' : 'abrindo',
      ponteiroId,
      inicioX: clientX,
      inicioY: clientY,
      larguraDrawer,
      deslocamentoAbertoPx: ehTablet ? 296 : Math.min(window.innerWidth * 0.58, 248),
      escalaAberta: ehTablet ? 0.86 : 0.82,
      fracaoAtual: 0,
    };
  };

  const moverGesto = (clientX: number, clientY: number) => {
    const g = gestoRef.current;
    if (!g.ativo) return;
    const dx = clientX - g.inicioX;
    const dy = clientY - g.inicioY;

    if (!g.arrastando) {
      if (Math.hypot(dx, dy) < 8) return;
      // Ignora rolagem vertical ou direção contrária à ação atual
      if (Math.abs(dy) > Math.abs(dx)) {
        g.ativo = false;
        return;
      }
      if (g.modo === 'fechando' && dx >= 0) {
        g.ativo = false;
        return;
      }
      if (g.modo === 'abrindo' && dx <= 0) {
        g.ativo = false;
        return;
      }
      g.arrastando = true;
      suprimirCliqueRef.current = true;
    }

    const distancia = g.modo === 'fechando' ? Math.max(0, -dx) : Math.max(0, dx);
    const fracao = Math.min(1, distancia / g.larguraDrawer);
    g.fracaoAtual = fracao;
    const abertura = g.modo === 'fechando' ? 1 - fracao : fracao;
    setArrasto({
      abertura,
      deslocamentoAbertoPx: g.deslocamentoAbertoPx,
      escalaAberta: g.escalaAberta,
    });
  };

  const finalizarGesto = () => {
    const g = gestoRef.current;
    if (!g.ativo) return;
    const estavaArrastando = g.arrastando;
    const modo = g.modo;
    const fracaoFinal = g.fracaoAtual;
    g.ativo = false;
    g.arrastando = false;
    g.fracaoAtual = 0;

    if (!estavaArrastando) return;

    setArrasto(null);
    if (modo === 'fechando') {
      // Ao fechar (direita -> esquerda): fecha se passar de 60% da largura do drawer; senão volta aberto
      if (fracaoFinal >= 0.6) {
        fecharMenu();
      }
    } else {
      // Ao abrir (esquerda -> direita): abre se passar do limiar; senão retorna fechado suavemente
      if (fracaoFinal >= 0.4) {
        abrirMenu();
      } else {
        setEmTransicao(true);
      }
    }
    window.setTimeout(() => {
      suprimirCliqueRef.current = false;
    }, 50);
  };

  useEffect(() => {
    if (menuAberto || !emTransicao) return;
    const timer = window.setTimeout(() => {
      setEmTransicao(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [menuAberto, emTransicao]);

  useEffect(() => {
    if (!menuAberto) return;
    painelMenu.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAberto(false);
        setEmTransicao(true);
        botaoMenu.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [menuAberto]);

  const papel = sessao?.papeis[0];
  const iniciais = obterIniciais(sessao?.nome);
  const drawerAtivo = menuAberto || emTransicao || arrasto !== null;
  const abertura = arrasto ? arrasto.abertura : menuAberto ? 1 : 0;

  const estiloDrawer = arrasto
    ? {
        transitionDuration: '0ms',
        translate: `${-(1 - abertura) * 2.5}rem 0`,
        scale: `${0.94 + 0.06 * abertura}`,
        opacity: abertura,
      }
    : undefined;

  const estiloSuperficie = arrasto
    ? {
        transitionDuration: '0ms',
        translate: `${abertura * arrasto.deslocamentoAbertoPx}px 0`,
        scale: `${1 - abertura * (1 - arrasto.escalaAberta)}`,
        borderRadius: `${abertura * 24}px`,
        boxShadow: `0 24px 60px rgb(4 27 66 / ${Math.round(abertura * 55)}%)`,
      }
    : undefined;

  const estiloCamadaExterna = arrasto
    ? {
        transitionDuration: '0ms',
        translate: `${(1 - abertura) * 24}px 0`,
        opacity: abertura,
      }
    : undefined;

  const estiloCamadaInterna = arrasto
    ? {
        transitionDuration: '0ms',
        translate: `${(1 - abertura) * 14}px 0`,
        opacity: abertura,
      }
    : undefined;

  const estiloConteinerInterno = arrasto
    ? {
        transitionDuration: '0ms',
        borderRadius: `${abertura * 24}px`,
      }
    : undefined;

  return (
    <div
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) iniciarGesto(t.clientX, t.clientY, e.target);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) moverGesto(t.clientX, t.clientY);
      }}
      onTouchEnd={finalizarGesto}
      onTouchCancel={finalizarGesto}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') return;
        iniciarGesto(e.clientX, e.clientY, e.target, e.pointerId);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return;
        moverGesto(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'touch') return;
        finalizarGesto();
      }}
      onPointerCancel={(e) => {
        if (e.pointerType === 'touch') return;
        finalizarGesto();
      }}
      onClickCapture={(e) => {
        if (suprimirCliqueRef.current) {
          e.preventDefault();
          e.stopPropagation();
          suprimirCliqueRef.current = false;
        }
      }}
      className={cx(
        'relative min-h-dvh max-lg:overflow-x-hidden max-lg:bg-navy-900 lg:pl-(--sidebar-width)',
        drawerAtivo && 'max-lg:h-dvh max-lg:overflow-hidden max-lg:select-none',
      )}
    >
      <a
        href="#conteudo"
        className="sr-only z-(--z-modal) rounded-md bg-white px-4 py-2 font-semibold text-navy-900 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>

      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-(--z-header) hidden w-(--sidebar-width) flex-col overflow-hidden bg-navy-900 px-4 py-6 lg:flex">
        <Brand variante="textoBranco" className="mb-8 w-full" />
        <nav aria-label={ROTULO_AREA[area]} className="flex-1">
          <Menu area={area} extras={extrasDoMenu} />
        </nav>
        <div className="relative z-10 mt-6">
          <MarcaSenai fundo="escuro" className="w-28" />
        </div>
        <PadraoGrafico
          nome="canto"
          posicao="inferior-direito"
          className="absolute right-0 bottom-0 h-40 w-full opacity-90"
        />
      </aside>

      {/* Drawer lateral em estilo perspectiva (celular e tablet): permanece montado para
          animar suavemente tanto na abertura quanto no fechamento */}
      <div
        id={menuAberto ? 'menu-movel' : undefined}
        ref={painelMenu}
        aria-hidden={!menuAberto}
        inert={!menuAberto}
        style={estiloDrawer}
        className={cx(
          'absolute inset-y-0 left-0 z-(--z-header) flex w-[56%] max-w-60 flex-col justify-between overflow-y-auto px-4 pt-4 pb-12 sm:w-68 sm:max-w-68 sm:px-6 sm:pt-5 sm:pb-12 lg:hidden',
          'transition-[translate,scale,transform,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[translate,scale,opacity]',
          menuAberto
            ? 'translate-x-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-x-10 scale-[0.94] opacity-0',
        )}
      >
        <div>
          {/* Perfil da pessoa usuária no topo do drawer */}
          <div className="mb-3 flex items-center gap-3 border-b border-white/15 pb-3">
            <div
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-700 text-sm font-bold text-white ring-2 ring-white/25 sm:size-11"
            >
              {iniciais}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{sessao?.nome}</p>
              {papel && <p className="truncate text-xs text-white/75">{ROTULO_PAPEL[papel]}</p>}
            </div>
          </div>

          <nav aria-label={ROTULO_AREA[area]}>
            <Menu
              area={area}
              variante="drawer"
              aberto={menuAberto}
              emArrasto={arrasto !== null}
              aoNavegar={fecharMenu}
              extras={extrasDoMenu}
            />
          </nav>
        </div>

        {/* Rodapé do drawer com ações e marca */}
        <div className="relative z-10 mt-3 border-t border-white/15 pt-3">
          <div className="mb-1.5">
            <BotaoInstalar />
          </div>
          <button
            type="button"
            onClick={() => void sair()}
            className="flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:shadow-[0_0_0_3px_var(--color-cyan-500)] focus-visible:outline-none"
          >
            <Icon nome="sair" />
            <span>Sair</span>
          </button>
          <div className="mt-3 px-2">
            <MarcaSenai fundo="escuro" className="w-24 opacity-90" />
          </div>
        </div>
      </div>

      {/* Superfície principal: no mobile desloca e reduz em perspectiva quando o drawer abre */}
      <div
        style={estiloSuperficie}
        className={cx(
          'relative min-h-dvh bg-bg max-lg:origin-left',
          'transition-[translate,scale,transform,border-radius,box-shadow] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[translate,scale]',
          drawerAtivo && 'max-lg:z-(--z-overlay) max-lg:h-dvh',
          menuAberto
            ? 'max-sm:translate-x-[min(58%,15.5rem)] max-sm:scale-[0.82] sm:max-lg:translate-x-74 sm:max-lg:scale-[0.86] max-lg:rounded-3xl max-lg:shadow-[0_24px_60px_rgb(4_27_66/55%)]'
            : 'max-lg:translate-x-0 max-lg:scale-100 max-lg:rounded-none max-lg:shadow-none',
        )}
      >
        {/* Cartões empilhados decorativos atrás da tela principal (efeito de camadas do drawer) */}
        <div
          aria-hidden="true"
          style={estiloCamadaExterna}
          className={cx(
            'pointer-events-none absolute inset-y-12 -left-6 -z-20 w-10 rounded-l-3xl bg-white/10 lg:hidden',
            'transition-[translate,scale,transform,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
            menuAberto ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0',
          )}
        />
        <div
          aria-hidden="true"
          style={estiloCamadaInterna}
          className={cx(
            'pointer-events-none absolute inset-y-6 -left-3.5 -z-10 w-8 rounded-l-3xl bg-white/22 lg:hidden',
            'transition-[translate,scale,transform,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
            menuAberto ? 'translate-x-0 opacity-100' : 'translate-x-3.5 opacity-0',
          )}
        />

        <div
          style={estiloConteinerInterno}
          className={cx(
            'min-h-dvh bg-bg transition-[border-radius] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
            drawerAtivo && 'max-lg:h-dvh max-lg:overflow-hidden',
            menuAberto ? 'max-lg:rounded-3xl' : 'max-lg:rounded-none',
          )}
        >
          {/* Barra superior */}
          <header className="sticky top-0 z-(--z-header) border-b border-border bg-surface/95 backdrop-blur">
            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
              <button
                ref={botaoMenu}
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-md text-navy-900 hover:bg-surface-muted focus-visible:shadow-(--focus-ring) focus-visible:outline-none lg:hidden"
                aria-expanded={menuAberto}
                aria-controls="menu-movel"
                onClick={alternarMenu}
              >
                <Icon
                  nome={menuAberto ? 'fechar' : 'menu'}
                  rotulo={menuAberto ? 'Fechar menu' : 'Abrir menu'}
                />
              </button>
              <Brand variante="positivo" className="w-40 min-w-0 lg:hidden" />
              <p className="hidden text-sm font-semibold text-text-secondary lg:block">
                {ROTULO_AREA[area]}
              </p>
              <div className="ml-auto hidden items-center gap-2 lg:flex">
                <BotaoInstalar />
                <div className="text-right">
                  <p className="text-sm font-semibold text-text">{sessao?.nome}</p>
                  {papel && <p className="text-xs text-text-secondary">{ROTULO_PAPEL[papel]}</p>}
                </div>
                <Button variante="terciario" icone="sair" onClick={() => void sair()}>
                  Sair
                </Button>
              </div>
            </div>
          </header>

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <main
            id="conteudo"
            tabIndex={-1}
            onClick={menuAberto ? fecharMenu : undefined}
            className="mx-auto w-full min-w-0 max-w-(--content-max) px-4 py-6 wrap-anywhere sm:px-6 lg:px-8"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
