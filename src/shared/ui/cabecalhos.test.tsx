import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';
import { PageHeader } from './PageHeader';

describe('ícones da marca em cabeçalhos', () => {
  it('PageHeader mostra o ícone da seção sem alterar o nome do título', () => {
    const { container } = render(<PageHeader titulo="Duplas" icone="dupla" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Duplas' })).toBeInTheDocument();
    const svg = container.querySelector<SVGSVGElement>('header svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.style.getPropertyValue('--ic-a')).toBe('var(--color-coral-500)');
  });

  it('Card mostra o ícone ao lado do título', () => {
    const { container } = render(
      <Card titulo="Comunicados" icone="noticia">
        conteúdo
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Comunicados' })).toBeInTheDocument();
    expect(container.querySelector('h2 svg, header svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sem ícone, nada muda', () => {
    const { container } = render(<PageHeader titulo="Ranking" />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
