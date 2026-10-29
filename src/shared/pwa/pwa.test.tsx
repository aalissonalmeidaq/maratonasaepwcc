import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvisoAtualizacaoView } from './AvisoAtualizacao';
import { StatusConexao } from './StatusConexao';

function definirOnline(valor: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(valor);
  act(() => {
    window.dispatchEvent(new Event(valor ? 'online' : 'offline'));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StatusConexao', () => {
  it('não mostra nada quando há conexão', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<StatusConexao />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('anuncia quando a conexão cai e some quando volta', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<StatusConexao />);
    definirOnline(false);
    expect(screen.getByRole('status')).toHaveTextContent(/você está sem conexão/i);
    expect(screen.getByRole('status')).toHaveTextContent(/envios e registros exigem conexão/i);
    definirOnline(true);
    expect(screen.queryByText(/você está sem conexão/i)).not.toBeInTheDocument();
  });
});

describe('AvisoAtualizacao', () => {
  it('oferece atualizar sem recarregar sozinho', async () => {
    const onAtualizar = vi.fn();
    const onDispensar = vi.fn();
    render(
      <AvisoAtualizacaoView precisaAtualizar onAtualizar={onAtualizar} onDispensar={onDispensar} />,
    );
    expect(screen.getByText(/nova versão disponível/i)).toBeInTheDocument();
    expect(onAtualizar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /atualizar agora/i }));
    expect(onAtualizar).toHaveBeenCalledOnce();
  });

  it('não aparece sem nova versão', () => {
    render(
      <AvisoAtualizacaoView precisaAtualizar={false} onAtualizar={vi.fn()} onDispensar={vi.fn()} />,
    );
    expect(screen.queryByText(/nova versão/i)).not.toBeInTheDocument();
  });
});
