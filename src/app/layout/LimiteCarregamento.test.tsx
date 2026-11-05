import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LimiteCarregamento } from './LimiteCarregamento';
describe('limite de carregamento (FR-008)', () => {
  it('informa falta de rede e tenta renderizar novamente ao reconectar', async () => {
    let falhar = true;
    function Conteudo() {
      if (falhar) throw new Error('Falha de rede');
      return <p>Área recuperada</p>;
    }
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(
      <LimiteCarregamento>
        <Conteudo />
      </LimiteCarregamento>,
    );
    expect(
      screen.getByText('Sem conexão: esta tela precisa de internet para carregar.'),
    ).toBeInTheDocument();
    falhar = false;
    await act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByText('Área recuperada')).toBeInTheDocument();
  });
});
