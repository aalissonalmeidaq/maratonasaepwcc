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
    const coracao = screen.getByRole('img', { name: 'amor' });
    // Contraste do coração (WCAG 1.4.11): vermelho da paleta no fundo claro, coral no escuro.
    if (fundo === 'claro') expect(coracao).toHaveClass('text-red-700');
    else expect(coracao).not.toHaveClass('text-red-700');
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
