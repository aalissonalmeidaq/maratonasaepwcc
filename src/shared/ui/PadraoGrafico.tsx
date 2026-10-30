import { useId } from 'react';
import { cx } from './cx';
import { PADROES, type IdPadrao } from './padroes/dados';

type Posicao = 'superior-direito' | 'superior-esquerdo' | 'inferior-direito' | 'inferior-esquerdo';

const ESPELHO: Record<Posicao, string> = {
  'superior-direito': '',
  'superior-esquerdo': '-scale-x-100',
  'inferior-direito': '-scale-y-100',
  'inferior-esquerdo': '-scale-x-100 -scale-y-100',
};

interface PadraoGraficoProps {
  nome: IdPadrao;
  /** Para composições de canto: em qual canto o recorte nasce. */
  posicao?: Posicao;
  className?: string;
}

/**
 * Padrão gráfico decorativo da marca (prancha 08). Sempre oculto para leitores de tela e
 * sem interação; o posicionamento e o tamanho ficam a cargo de `className`.
 */
export function PadraoGrafico({
  nome,
  posicao = 'superior-direito',
  className,
}: PadraoGraficoProps) {
  const prefixo = `pg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const padrao = PADROES[nome];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={padrao.viewBox}
      preserveAspectRatio={padrao.ajuste}
      aria-hidden="true"
      focusable="false"
      className={cx('pointer-events-none select-none', ESPELHO[posicao], className)}
      // Conteúdo estático gerado pelo próprio código-fonte (nunca dados de usuário).
      dangerouslySetInnerHTML={{ __html: padrao.gerar(prefixo) }}
    />
  );
}
