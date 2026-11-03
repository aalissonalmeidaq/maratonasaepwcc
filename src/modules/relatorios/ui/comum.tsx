import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { formatarData } from '@/shared/lib/formatacao';
import { Icon, cx, type NomeIcone } from '@/shared/ui';
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

/** Selo dos dados de demonstração, legível sobre o banner azul-marinho dos painéis. */
export const SeloFicticio = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-navy-950">
    <span aria-hidden="true" className="size-2 rounded-full bg-navy-950" />
    Dados fictícios
  </span>
);

/** Ação secundária no banner dos painéis (fundo escuro). */
export function AcaoDoBanner({
  para,
  icone,
  children,
}: {
  para: string;
  icone: NomeIcone;
  children: ReactNode;
}) {
  return (
    <Link
      to={para}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:bg-gray-100 focus-visible:shadow-[0_0_0_3px_var(--color-cyan-500)] focus-visible:outline-none"
    >
      <Icon nome={icone} tamanho="sm" />
      {children}
    </Link>
  );
}

const ACENTOS = {
  azul: 'bg-blue-700 text-white',
  ciano: 'bg-cyan-500 text-navy-950',
  roxo: 'bg-purple-500 text-navy-950',
  amarelo: 'bg-yellow-500 text-navy-950',
  coral: 'bg-coral-500 text-navy-950',
} as const;

/**
 * Indicador (KPI) dos painéis iniciais: nome, valor em destaque, contexto curto e, quando
 * houver, o link para a página de origem do número. É uma região nomeada pelo título.
 */
export function Indicador({
  titulo,
  icone,
  acento = 'azul',
  valor,
  children,
  link,
}: {
  titulo: string;
  icone: NomeIcone;
  acento?: keyof typeof ACENTOS;
  valor: ReactNode;
  children?: ReactNode;
  link?: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <header className="flex items-center gap-2.5">
        <span className={cx('grid size-9 shrink-0 place-items-center rounded-md', ACENTOS[acento])}>
          <Icon nome={icone} tamanho="sm" />
        </span>
        <h2 id={id} className="min-w-0 text-sm font-semibold text-text-secondary">
          {titulo}
        </h2>
      </header>
      <div className="mt-3 font-display text-2xl leading-tight font-bold text-text tabular-nums wrap-anywhere sm:text-3xl xl:text-2xl 2xl:text-3xl">
        {valor}
      </div>
      {/* Selos podem quebrar linha aqui: com zoom de texto o indicador fica estreito. */}
      {children && (
        <div className="mt-2 text-sm text-text-secondary [&>span]:max-w-full [&>span]:whitespace-normal">
          {children}
        </div>
      )}
      {link && <div className="mt-auto pt-1">{link}</div>}
    </section>
  );
}

/** Faixa de indicadores no topo do painel; colunas em rem, para o zoom de texto reduzir colunas. */
export function FaixaDeIndicadores({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Indicadores"
      className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4"
    >
      {children}
    </section>
  );
}

/** Indicador do próximo encontro: a data em destaque, com o título e o horário abaixo. */
export function IndicadorEncontro({
  encontro,
  link,
}: {
  encontro: EncontroDoPainel | null;
  link?: ReactNode;
}) {
  return (
    <Indicador
      titulo="Próximo encontro"
      icone="calendario"
      acento="roxo"
      valor={encontro ? formatarData(encontro.data) : <span className="text-lg">A definir</span>}
      link={link}
    >
      {encontro ? (
        <>
          <p className="font-semibold text-text">
            {encontro.numero}. {encontro.titulo}
          </p>
          <p>
            {formatarData(encontro.data, { weekday: 'long', day: undefined, month: undefined })}
            {encontro.inicio ? ` · ${encontro.inicio}` : ' · horário a confirmar'}
          </p>
        </>
      ) : (
        <p>Nenhum encontro futuro cadastrado.</p>
      )}
    </Indicador>
  );
}
