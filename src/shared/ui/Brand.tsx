import { cx } from './cx';

const ARQUIVOS = {
  positivo: '/brand/maratona-horizontal.svg',
  branca: '/brand/maratona-horizontal-branca.svg',
  /** Símbolo e "SAEP" coloridos, texto branco: versão preferida em fundo azul-marinho. */
  textoBranco: '/brand/maratona-horizontal-texto-branco.svg',
  vertical: '/brand/maratona-vertical.svg',
  simbolo: '/brand/maratona-simbolo.svg',
} as const;

interface BrandProps {
  /**
   * `positivo` em fundo claro; `textoBranco` em fundo escuro; `branca` (monocromática) quando a
   * cor não for possível. Arquivos oficiais de docs/referencias, sem alteração.
   */
  variante?: keyof typeof ARQUIVOS;
  className?: string;
}

export function Brand({ variante = 'positivo', className }: BrandProps) {
  return (
    <img
      src={ARQUIVOS[variante]}
      alt="Maratona de Competências SAEP"
      className={cx('h-auto select-none', className)}
      draggable={false}
    />
  );
}

/**
 * Marca SENAI Ceará. Em fundo escuro usa o arquivo oficial totalmente branco (fornecido pela
 * unidade em 2026-10-29). PENDENTE: versão colorida para fundo claro — até lá, área provisória
 * identificada; a marca não deve ser redesenhada nem presumida.
 */
export function MarcaSenai({
  fundo = 'claro',
  className,
}: {
  fundo?: 'claro' | 'escuro';
  className?: string;
}) {
  if (fundo === 'escuro') {
    return (
      <img
        src="/brand/senai-ceara-branco.svg"
        alt="SENAI Ceará"
        className={cx('h-auto select-none', className)}
        draggable={false}
      />
    );
  }
  return (
    <div className="rounded-md border border-dashed border-gray-500 bg-surface px-3 py-2 text-center text-xs font-medium text-gray-700">
      Área da marca SENAI Ceará
      <br />
      (versão colorida pendente — arquivo oficial pendente)
    </div>
  );
}
