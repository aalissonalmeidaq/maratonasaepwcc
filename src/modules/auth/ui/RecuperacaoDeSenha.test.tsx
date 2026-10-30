import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { EsqueciSenhaPage, RedefinirSenhaPage } from './RecuperacaoDeSenha';

const NEUTRA = 'Se o e-mail estiver cadastrado, enviamos um link válido por 1 hora.';

function emRota(elemento: React.ReactNode) {
  return render(<MemoryRouter>{elemento}</MemoryRouter>);
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('EsqueciSenhaPage (FR-014, US6 cenário 4)', () => {
  it('responde igual para qualquer e-mail, só após o servidor', async () => {
    const pedir = vi.fn().mockResolvedValue(undefined);
    const { container } = emRota(<EsqueciSenhaPage modo="supabase" pedir={pedir} />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'Ana@Exemplo.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(pedir).toHaveBeenCalledWith('ana@exemplo.invalid');
    expect(await screen.findByRole('status')).toHaveTextContent(NEUTRA);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('valida o e-mail antes de enviar', async () => {
    const pedir = vi.fn();
    emRota(<EsqueciSenhaPage modo="supabase" pedir={pedir} />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'invalido');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeVisible();
    expect(pedir).not.toHaveBeenCalled();
  });

  it('falha de conexão aparece como erro (não como enviado)', async () => {
    const pedir = vi.fn().mockRejectedValue(new Error('Sem conexão com o servidor.'));
    emRota(<EsqueciSenhaPage modo="supabase" pedir={pedir} />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');
    expect(screen.queryByText(NEUTRA)).not.toBeInTheDocument();
  });

  it('no modo demonstração fica indisponível', () => {
    const pedir = vi.fn();
    emRota(<EsqueciSenhaPage modo="demo" pedir={pedir} />);
    expect(screen.getByText('Indisponível no modo demonstração.')).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });
});

describe('RedefinirSenhaPage (FR-014)', () => {
  const deps = (sessao: boolean) => ({
    obterSessao: vi.fn().mockResolvedValue(sessao),
    redefinir: vi.fn().mockResolvedValue(undefined),
    sair: vi.fn().mockResolvedValue(undefined),
  });

  it('com a sessão de recuperação, troca a senha, encerra a sessão e leva à entrada', async () => {
    const d = deps(true);
    emRota(<RedefinirSenhaPage modo="supabase" {...d} />);
    await userEvent.type(await screen.findByLabelText('Nova senha'), 'senha-nova-123');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'senha-nova-123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(d.redefinir).toHaveBeenCalledWith('senha-nova-123');
    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada.');
    expect(d.sair).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
  });

  it('valida tamanho e confirmação', async () => {
    const d = deps(true);
    emRota(<RedefinirSenhaPage modo="supabase" {...d} />);
    await userEvent.type(await screen.findByLabelText('Nova senha'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('A senha deve ter pelo menos 10 caracteres.')).toBeVisible();
    expect(d.redefinir).not.toHaveBeenCalled();
  });

  it('link vencido (aviso do Auth na URL) orienta a pedir outro', async () => {
    window.history.replaceState(
      null,
      '',
      '/redefinir-senha#error=access_denied&error_code=otp_expired',
    );
    const d = deps(false);
    emRota(<RedefinirSenhaPage modo="supabase" {...d} />);
    expect(await screen.findByText(/link venceu ou já foi usado/i)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute(
      'href',
      '/esqueci-senha',
    );
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('sem sessão de recuperação, também orienta a pedir outro', async () => {
    emRota(<RedefinirSenhaPage modo="supabase" {...deps(false)} />);
    expect(await screen.findByText(/link venceu ou já foi usado/i)).toBeVisible();
  });

  it('no modo demonstração fica indisponível', () => {
    emRota(<RedefinirSenhaPage modo="demo" {...deps(true)} />);
    expect(screen.getByText('Indisponível no modo demonstração.')).toBeInTheDocument();
  });
});
