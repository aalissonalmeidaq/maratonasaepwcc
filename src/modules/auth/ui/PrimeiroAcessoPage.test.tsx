import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { PrimeiroAcessoPage } from './PrimeiroAcessoPage';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

function abrir(props: Parameters<typeof PrimeiroAcessoPage>[0], hash = `#t=${TOKEN}`) {
  window.history.replaceState(null, '', `/primeiro-acesso${hash}`);
  return render(
    <MemoryRouter>
      <PrimeiroAcessoPage {...props} />
    </MemoryRouter>,
  );
}

async function preencher(senha: string, confirmacao = senha) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nova senha'), senha);
  await user.type(screen.getByLabelText('Confirmar senha'), confirmacao);
  await user.click(screen.getByRole('button', { name: 'Criar senha' }));
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('PrimeiroAcessoPage (FR-011, US6 cenário 3)', () => {
  it('lê o token do link e o tira da barra de endereço', () => {
    abrir({ modo: 'supabase', definirSenha: vi.fn() });
    expect(screen.getByRole('heading', { level: 1, name: 'Crie sua senha' })).toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  it('valida tamanho e confirmação antes de enviar', async () => {
    const definirSenha = vi.fn();
    abrir({ modo: 'supabase', definirSenha });
    await preencher('curta');
    expect(await screen.findByText('A senha deve ter pelo menos 10 caracteres.')).toBeVisible();
    await userEvent.clear(screen.getByLabelText('Nova senha'));
    await userEvent.clear(screen.getByLabelText('Confirmar senha'));
    await preencher('senha-boa-123', 'senha-boa-124');
    expect(await screen.findByText('As senhas não são iguais.')).toBeVisible();
    expect(definirSenha).not.toHaveBeenCalled();
  });

  it('confirma só após o servidor e leva à entrada com o e-mail', async () => {
    const definirSenha = vi.fn().mockResolvedValue({ email: 'ana@exemplo.invalid' });
    const { container } = abrir({ modo: 'supabase', definirSenha });
    await preencher('senha-boa-123');
    expect(definirSenha).toHaveBeenCalledWith(TOKEN, 'senha-boa-123');
    expect(await screen.findByRole('status')).toHaveTextContent('Senha criada');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar?email=ana%40exemplo.invalid',
    );
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('mostra a recusa do servidor e oferece "Esqueci minha senha"', async () => {
    const definirSenha = vi
      .fn()
      .mockRejectedValue(new Error('Link inválido ou vencido. Peça um novo à coordenação.'));
    abrir({ modo: 'supabase', definirSenha });
    await preencher('senha-boa-123');
    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido ou vencido');
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute(
      'href',
      '/esqueci-senha',
    );
  });

  it('sem token no link: orienta e não mostra o formulário', () => {
    abrir({ modo: 'supabase', definirSenha: vi.fn() }, '');
    expect(screen.getByText(/link está incompleto/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('no modo demonstração fica indisponível e não chama o servidor', () => {
    const definirSenha = vi.fn();
    abrir({ modo: 'demo', definirSenha });
    expect(screen.getByText('Indisponível no modo demonstração.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(definirSenha).not.toHaveBeenCalled();
  });
});
