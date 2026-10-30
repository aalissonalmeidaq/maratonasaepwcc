import type { ReactNode } from 'react';
import { PadraoGrafico } from './PadraoGrafico';

interface BannerDestaqueProps {
  titulo: string;
  descricao?: ReactNode;
  /** Conteúdo complementar à direita (ex.: progresso). */
  lateral?: ReactNode;
}

/**
 * "Composição de destaque" (prancha 08): fundo azul-marinho com recortes diagonais da marca
 * no canto, título da página em destaque. O padrão é decorativo.
 */
export function BannerDestaque({ titulo, descricao, lateral }: BannerDestaqueProps) {
  return (
    <header className="relative isolate mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0B2D6B,#062457_55%,#04193F)] px-5 py-6 text-white shadow-md sm:px-8 sm:py-8">
      <PadraoGrafico
        nome="canto"
        className="absolute top-0 right-0 -z-10 h-full w-2/3 opacity-90 sm:w-1/2"
      />
      <PadraoGrafico nome="textura" className="absolute inset-0 -z-20 h-full w-full opacity-40" />
      <div className="flex flex-col flex-wrap gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl flex-1 wrap-anywhere">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{titulo}</h1>
          {descricao && <p className="mt-2 text-white/85">{descricao}</p>}
        </div>
        {lateral && (
          <div className="w-full min-w-0 rounded-xl bg-navy-950/70 p-4 backdrop-blur-sm sm:w-auto sm:max-w-sm">
            {lateral}
          </div>
        )}
      </div>
    </header>
  );
}
