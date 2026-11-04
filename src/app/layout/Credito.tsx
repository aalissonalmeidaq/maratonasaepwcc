import { Icon, cx } from '@/shared/ui';

/**
 * Crédito de autoria, discreto, no rodapé da barra lateral e da tela de entrada. `empilhado`
 * quebra em duas linhas curtas, para não passar sobre as faixas do canto da barra lateral.
 */
export function Credito({
  fundo,
  empilhado = false,
  className,
}: {
  fundo: 'escuro' | 'claro';
  empilhado?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cx(
        'text-xs',
        empilhado ? 'flex flex-col' : 'flex items-center gap-1',
        fundo === 'escuro' ? 'text-white/70' : 'text-text-secondary',
        className,
      )}
    >
      {/* Espaços explícitos: o leitor de tela lê "feito com amor por Alisson Almeida". */}
      <span className="flex items-center gap-1">
        feito com{' '}
        {/* Coral no fundo escuro (≈4,8:1); no claro, o vermelho da paleta (o coral ficaria < 3:1). */}
        <Icon
          nome="coracao"
          tamanho="sm"
          cor={fundo === 'escuro' ? 'marca' : 'mono'}
          className={fundo === 'escuro' ? undefined : 'text-red-700'}
          rotulo="amor"
        />{' '}
      </span>{' '}
      <span>por Alisson Almeida</span>
    </p>
  );
}
