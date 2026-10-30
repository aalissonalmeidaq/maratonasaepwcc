import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type ValorAuth } from '@/modules/auth';
import { violacoesA11y } from '@/test/a11y';
import { EntradaPage } from './comum';

function renderizar(modo: ValorAuth['modo']) {
  const valor: ValorAuth = {
    modo,
    carregando: false,
    sessao: null,
    entrar: vi.fn(),
    entrarDemo: modo === 'demo' ? vi.fn() : null,
    sair: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={valor}>
      <MemoryRouter>
        <EntradaPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Tela de entrada', () => {
  it('destaca a marca da Maratona e a do SENAI Ceará', () => {
    renderizar('supabase');
    expect(
      screen.getAllByRole('img', { name: 'Maratona de Competências SAEP' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: 'SENAI Ceará' }).length).toBeGreaterThan(0);
  });

  it('no modo demonstração, cada perfil fictício indica papel e nome', async () => {
    const { container } = renderizar('demo');
    const lista = screen.getByRole('list', { name: 'Perfis de demonstração' });
    const botoes = within(lista).getAllByRole('button');
    expect(botoes).toHaveLength(3);
    expect(botoes[0]).toHaveAccessibleName(/coordenação/i);
    expect(botoes[1]).toHaveAccessibleName(/docente.*lúcia/i);
    expect(botoes[2]).toHaveAccessibleName(/aluno.*ana exemplo/i);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('formulário real permite mostrar e ocultar a senha', async () => {
    const user = userEvent.setup();
    renderizar('supabase');
    const senha = screen.getByLabelText('Senha');
    expect(senha).toHaveAttribute('type', 'password');
    const alternar = screen.getByRole('button', { name: 'Mostrar senha' });
    await user.click(alternar);
    expect(senha).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('oferece ajuda para quem não consegue entrar', () => {
    renderizar('supabase');
    expect(screen.getByText(/procure a coordenação/i)).toBeInTheDocument();
  });
});
