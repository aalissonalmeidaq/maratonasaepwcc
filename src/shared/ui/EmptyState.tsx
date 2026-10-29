import type { ReactNode } from 'react';
import { Icon, type NomeIcone } from './Icon';

interface EmptyStateProps {
  titulo: string;
  descricao?: string;
  icone?: NomeIcone;
  acao?: ReactNode;
}

export function EmptyState({ titulo, descricao, icone = 'info', acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-surface-muted px-4 py-8 text-center">
      <span className="text-blue-700">
        <Icon nome={icone} tamanho="lg" />
      </span>
      <p className="font-semibold text-text">{titulo}</p>
      {descricao && <p className="max-w-prose text-sm text-text-secondary">{descricao}</p>}
      {acao}
    </div>
  );
}
