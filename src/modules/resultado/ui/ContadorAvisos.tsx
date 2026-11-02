import { Link } from 'react-router';
import { Icon } from '@/shared/ui';

const rotulo = (n: number) =>
  n === 0 ? 'Avisos: nenhum não lido' : n === 1 ? '1 aviso não lido' : `${n} avisos não lidos`;

/** Contador de avisos não lidos no cabeçalho (FR-026); o número também está no rótulo acessível. */
export function ContadorAvisos({ naoLidos, caminho }: { naoLidos: number; caminho: string }) {
  return (
    <Link
      to={caminho}
      aria-label={rotulo(naoLidos)}
      className="relative inline-flex size-11 items-center justify-center rounded-md hover:bg-black/5 focus-visible:outline-2"
    >
      <Icon nome="notificacoes" />
      {naoLidos > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 min-w-5 rounded-full bg-red-700 px-1 text-center text-xs font-bold text-white"
        >
          {naoLidos > 99 ? '99+' : naoLidos}
        </span>
      )}
    </Link>
  );
}
