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
 * Área reservada para a marca SENAI Ceará. PENDENTE: o arquivo oficial não foi fornecido;
 * a marca não deve ser redesenhada nem presumida (ver docs/decisoes-e-pendencias.md).
 */
export function MarcaSenaiProvisoria({ fundo = 'claro' }: { fundo?: 'claro' | 'escuro' }) {
  return (
    <div
      className={cx(
        'rounded-md border border-dashed px-3 py-2 text-center text-xs font-medium',
        fundo === 'escuro'
          ? 'border-white/50 bg-navy-900 text-white/80'
          : 'border-gray-500 bg-surface text-gray-700',
      )}
    >
      Área da marca SENAI Ceará
      <br />
      (arquivo oficial pendente)
    </div>
  );
}
