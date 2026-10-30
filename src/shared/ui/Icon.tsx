import type { CSSProperties } from 'react';
import { ICONES, type Acento, type IdIcone } from './icones/dados';

/**
 * Ícones próprios da Maratona SAEP (src/shared/ui/icones/dados.ts), vetorizados a partir da
 * prancha oficial. Arquivos .svg avulsos em docs/icones/svg (gerados por `npm run icones`).
 */
export type NomeIcone = IdIcone;

const TAMANHOS = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

const TOKEN_DO_ACENTO: Record<Acento, string> = {
  azul: 'var(--color-blue-500)',
  amarelo: 'var(--color-yellow-500)',
  coral: 'var(--color-coral-500)',
  ciano: 'var(--color-cyan-500)',
  roxo: 'var(--color-purple-500)',
};

interface IconProps {
  nome: NomeIcone;
  tamanho?: keyof typeof TAMANHOS;
  /** Quando informado, o ícone é anunciado; caso contrário é decorativo. */
  rotulo?: string;
  /**
   * `mono` (padrão): todo o desenho herda a cor do texto — use sobre fundos coloridos, menus,
   * botões e alertas. `marca`: contorno na cor do texto e destaque na cor de apoio da prancha.
   */
  cor?: 'mono' | 'marca';
  className?: string;
}

export function Icon({ nome, tamanho = 'md', rotulo, cor = 'mono', className }: IconProps) {
  const icone = ICONES[nome];
  const px = TAMANHOS[tamanho];
  const estilo = {
    '--ic-a': cor === 'marca' ? TOKEN_DO_ACENTO[icone.acento] : 'currentColor',
  } as CSSProperties;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={className}
      style={estilo}
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
      // Conteúdo estático definido no próprio código-fonte (nunca dados de usuário).
      dangerouslySetInnerHTML={{ __html: icone.svg }}
    />
  );
}
