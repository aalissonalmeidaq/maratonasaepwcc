import { Link } from 'react-router';
import { cx } from './cx';
import { Icon, type NomeIcone } from './Icon';
import { PadraoGrafico } from './PadraoGrafico';

const FUNDO_DO_ICONE = {
  azul: 'bg-blue-600 text-white',
  ciano: 'bg-cyan-500 text-navy-950',
  amarelo: 'bg-yellow-500 text-navy-950',
  coral: 'bg-coral-500 text-navy-950',
  roxo: 'bg-purple-500 text-navy-950',
} as const;

interface CardDestaqueProps {
  titulo: string;
  descricao: string;
  icone: NomeIcone;
  para: string;
  /** Claro (padrão) ou escuro com gradiente azul-marinho e recorte da marca. */
  variante?: 'claro' | 'escuro';
  acento?: keyof typeof FUNDO_DO_ICONE;
  className?: string;
}

/**
 * Cartão de navegação da prancha "09 Acabamentos — Cards e componentes digitais": ícone em
 * círculo, título, texto de apoio e botão-seta. O cartão inteiro é o alvo do clique.
 */
export function CardDestaque({
  titulo,
  descricao,
  icone,
  para,
  variante = 'claro',
  acento = 'azul',
  className,
}: CardDestaqueProps) {
  const escuro = variante === 'escuro';
  return (
    <Link
      to={para}
      className={cx(
        'group relative isolate flex h-full min-h-36 min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-sm wrap-anywhere transition-[box-shadow,transform,border-color] duration-(--duration-normal) ease-out',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:shadow-(--focus-ring) focus-visible:outline-none motion-reduce:hover:translate-y-0',
        escuro
          ? 'border-navy-950 bg-[linear-gradient(135deg,#0B2D6B,#062457_55%,#04193F)] text-white'
          : 'border-border bg-surface text-text hover:border-blue-600',
        className,
      )}
    >
      <PadraoGrafico
        nome="canto"
        posicao={escuro ? 'superior-direito' : 'inferior-esquerdo'}
        className={cx(
          'absolute -z-10',
          escuro
            ? 'top-0 right-0 h-24 w-32 opacity-90'
            : 'bottom-0 left-0 h-9 w-14 opacity-70 transition-opacity group-hover:opacity-100',
        )}
      />
      <span
        className={cx(
          'grid size-11 shrink-0 place-items-center rounded-full shadow-sm',
          escuro ? 'bg-blue-600 text-white' : FUNDO_DO_ICONE[acento],
        )}
      >
        <Icon nome={icone} tamanho="md" />
      </span>
      <span className="mt-3 font-display text-base leading-tight font-semibold">{titulo}</span>
      <span className={cx('mt-1 mb-3 text-sm', escuro ? 'text-white/85' : 'text-text-secondary')}>
        {descricao}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'mt-auto ml-auto grid size-8 place-items-center rounded-full border transition-colors',
          escuro
            ? 'border-white/40 text-white group-hover:bg-white/15'
            : 'border-border text-blue-700 group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white',
        )}
      >
        <Icon nome="avancar" tamanho="sm" />
      </span>
    </Link>
  );
}
