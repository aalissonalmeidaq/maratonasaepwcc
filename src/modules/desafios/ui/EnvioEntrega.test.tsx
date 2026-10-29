import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnvioEntrega } from './EnvioEntrega';

afterEach(() => {
  vi.restoreAllMocks();
});

const LINK = 'https://exemplo.invalid/projeto-da-dupla';

async function preencherEEnviar() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/link da entrega/i), LINK);
  await user.click(screen.getByRole('button', { name: /enviar entrega/i }));
  return user;
}

describe('EnvioEntrega (HU02, constituição VII)', () => {
  it('exibe protocolo e horário somente após a confirmação do servidor', async () => {
    let confirmar!: (v: { protocolo: string; recebidoEm: string }) => void;
    const enviar = vi.fn(
      () =>
        new Promise<{ protocolo: string; recebidoEm: string }>((r) => {
          confirmar = r;
        }),
    );
    render(<EnvioEntrega enviar={enviar} />);
    await preencherEEnviar();

    expect(enviar).toHaveBeenCalledWith({ link: LINK });
    expect(screen.getByRole('button', { name: /enviar entrega/i })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText(/protocolo/i)).not.toBeInTheDocument();

    confirmar({ protocolo: 'ENT-0001', recebidoEm: '2026-11-05T10:31:00-03:00' });
    expect(await screen.findByRole('status')).toHaveTextContent(/entrega recebida pelo servidor/i);
    expect(screen.getByText(/ENT-0001/)).toBeInTheDocument();
  });

  it('falha de rede não gera confirmação e explica o que fazer', async () => {
    const enviar = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    render(<EnvioEntrega enviar={enviar} />);
    await preencherEEnviar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi recebida/i);
    expect(screen.queryByText(/protocolo/i)).not.toBeInTheDocument();
  });

  it('valida o link antes de enviar', async () => {
    const enviar = vi.fn();
    render(<EnvioEntrega enviar={enviar} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/link da entrega/i), 'nao-e-um-link');
    await user.click(screen.getByRole('button', { name: /enviar entrega/i }));

    expect(await screen.findByText(/informe um link válido/i)).toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('sem conexão, bloqueia o envio e informa que requer conexão', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<EnvioEntrega enviar={vi.fn()} />);
    expect(screen.getByRole('button', { name: /enviar entrega/i })).toBeDisabled();
    expect(screen.getByText(/requer conexão/i)).toBeInTheDocument();
  });

  it('sem serviço de envio disponível (modo demonstração), não simula sucesso', () => {
    render(<EnvioEntrega enviar={null} />);
    expect(screen.getByRole('button', { name: /enviar entrega/i })).toBeDisabled();
    expect(screen.getByText(/indisponível no modo demonstração/i)).toBeInTheDocument();
  });
});
