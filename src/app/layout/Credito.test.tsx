import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { Credito } from './Credito';

describe('Credito', () => {
  it.each([
    ['claro', false],
    ['escuro', true],
  ] as const)('fundo %s: crédito com o coração anunciado como "amor"', async (fundo, empilhado) => {
    const { container } = render(
      <div className={fundo === 'escuro' ? 'bg-navy-900' : undefined}>
        <Credito fundo={fundo} empilhado={empilhado} />
      </div>,
    );
    expect(container).toHaveTextContent('feito com por Alisson Almeida');
    expect(screen.getByRole('img', { name: 'amor' })).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
