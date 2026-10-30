import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { MENUS } from '../navegacao';
import { Atalhos } from './Atalhos';

describe('Atalhos do painel inicial', () => {
  it.each(['aluno', 'docente', 'coordenacao'] as const)(
    'área %s: um atalho por item do menu (exceto Início), com ícone colorido decorativo',
    async (area) => {
      const { container } = render(
        <MemoryRouter>
          <Atalhos area={area} />
        </MemoryRouter>,
      );
      const nav = screen.getByRole('navigation', { name: 'Acesso rápido' });
      const links = within(nav).getAllByRole('link');
      const esperados = MENUS[area].filter((i) => i.caminho !== `/${area}`);
      expect(links.map((l) => l.textContent)).toEqual(esperados.map((i) => i.rotulo));
      expect(links.map((l) => l.getAttribute('href'))).toEqual(esperados.map((i) => i.caminho));
      for (const svg of container.querySelectorAll('svg')) {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg.style.getPropertyValue('--ic-a')).not.toBe('currentColor');
      }
      expect(await violacoesA11y(container)).toEqual([]);
    },
  );
});
