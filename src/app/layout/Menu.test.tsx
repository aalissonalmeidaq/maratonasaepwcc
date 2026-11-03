import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { MENUS } from '../navegacao';
import { Menu } from './Menu';

describe('menu lateral em categorias (spec 011, US6, FR-017)', () => {
  it.each(['sidebar', 'drawer'] as const)(
    '%s: Início no topo, cada categoria como lista com título e item atual destacado',
    async (variante) => {
      const { container } = render(
        <MemoryRouter initialEntries={['/coordenacao/presenca']}>
          <nav aria-label="Menu principal">
            <Menu area="coordenacao" variante={variante} />
          </nav>
        </MemoryRouter>,
      );
      const nav = screen.getByRole('navigation', { name: 'Menu principal' });
      expect(within(nav).getAllByRole('link')[0]).toHaveAccessibleName('Início');
      // Só a categoria da página atual começa aberta.
      for (const grupo of MENUS.coordenacao.grupos) {
        const botao = within(nav).getByRole('button', { name: grupo.titulo });
        const atual = grupo.titulo === 'Durante os encontros';
        expect(botao).toHaveAttribute('aria-expanded', String(atual));
        if (!atual) expect(within(nav).queryByRole('list', { name: grupo.titulo })).toBeNull();
      }
      for (const grupo of MENUS.coordenacao.grupos) {
        await userEvent.click(within(nav).getByRole('button', { name: grupo.titulo }));
        const lista = within(nav).getByRole('list', { name: grupo.titulo });
        expect(
          within(lista)
            .getAllByRole('link')
            .map((l) => l.textContent),
        ).toEqual(grupo.itens.map((i) => i.rotulo));
      }
      await userEvent.click(within(nav).getByRole('button', { name: 'Durante os encontros' }));
      const durante = within(nav).getByRole('list', { name: 'Durante os encontros' });
      expect(within(durante).getByRole('link', { name: 'Presença' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(await violacoesA11y(container)).toEqual([]);
    },
  );

  it('começa recolhido no Início e mantém só uma categoria aberta por vez', async () => {
    render(
      <MemoryRouter initialEntries={['/coordenacao']}>
        <nav aria-label="Menu principal">
          <Menu area="coordenacao" />
        </nav>
      </MemoryRouter>,
    );
    const [primeiro, segundo] = MENUS.coordenacao.grupos;
    const botoes = screen.getAllByRole('button');
    for (const b of botoes) expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('list', { name: /./ })).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: primeiro!.titulo }));
    expect(screen.getByRole('list', { name: primeiro!.titulo })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: segundo!.titulo }));
    expect(screen.getByRole('list', { name: segundo!.titulo })).toBeVisible();
    expect(screen.queryByRole('list', { name: primeiro!.titulo })).toBeNull();
    expect(screen.getByRole('button', { name: primeiro!.titulo })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await userEvent.click(screen.getByRole('button', { name: segundo!.titulo }));
    expect(screen.queryByRole('list', { name: segundo!.titulo })).toBeNull();
  });

  it('categoria recolhida mostra o contador dos itens (ex.: convites pendentes)', async () => {
    render(
      <MemoryRouter initialEntries={['/aluno']}>
        <Menu area="aluno" extras={{ '/aluno/dupla': <span>1 convite pendente</span> }} />
      </MemoryRouter>,
    );
    const categoria = screen.getByRole('button', { name: /Minha participação/ });
    expect(categoria).toHaveAccessibleName(/^Minha participação\s*1 convite pendente$/);
    await userEvent.click(categoria);
    expect(categoria).toHaveAccessibleName('Minha participação');
    expect(screen.getByRole('link', { name: /Minha equipe/ })).toHaveTextContent(
      'Minha equipe1 convite pendente',
    );
  });
});
