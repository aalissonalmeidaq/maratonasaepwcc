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
 * Marca SENAI Ceará: arquivo colorido fornecido para fundo claro e branco para fundo escuro.
 * Preserva os SVGs originais, sem filtros ou alteração das cores.
 */
export function MarcaSenai({
  fundo = 'claro',
  className,
}: {
  fundo?: 'claro' | 'escuro';
  className?: string;
}) {
  return (
    <img
      src={fundo === 'escuro' ? '/brand/senai-ceara-branco.svg' : '/brand/senai-ceara-colorido.svg'}
      alt="SENAI Ceará"
      className={cx('h-auto select-none', className)}
      draggable={false}
    />
  );
}
