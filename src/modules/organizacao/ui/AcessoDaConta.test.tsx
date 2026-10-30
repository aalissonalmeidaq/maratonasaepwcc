import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { SituacaoDeAcesso } from '../domain/tipos';
import { AcoesDeAcesso, SituacaoDeAcessoBadge } from './AcessoDaConta';
import { textoDaSituacao } from './situacaoDeAcesso';

const pendente: SituacaoDeAcesso = {
  usuarioId: 'u1',
  email: 'ana@exemplo.invalid',
  acessoAtivo: false,
  conviteExpiraEm: '2026-11-06T12:00:00Z',
};
const ativo: SituacaoDeAcesso = { ...pendente, acessoAtivo: true, conviteExpiraEm: null };

describe('situação de acesso (FR-011, US6 cenário 6)', () => {
  it('mostra a situação por texto, não só por cor', () => {
    render(
      <>
        <SituacaoDeAcessoBadge situacao={pendente} />
        <SituacaoDeAcessoBadge situacao={ativo} />
      </>,
    );
    expect(screen.getByText('Aguardando primeiro acesso')).toBeInTheDocument();
    expect(screen.getByText('Acesso ativo')).toBeInTheDocument();
    expect(screen.getByText(/convite vence em 06\/11/i)).toBeInTheDocument();
  });

  it('o texto da situação entra na busca da tabela', () => {
    expect(textoDaSituacao(pendente)).toContain('Aguardando primeiro acesso');
    expect(textoDaSituacao(ativo)).toBe('Acesso ativo');
    expect(textoDaSituacao(undefined)).toBe('');
  });

  it('conta com acesso ativo não oferece reenvio', () => {
    render(<AcoesDeAcesso situacao={ativo} nome="Ana" onReenviar={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reenvia o convite e confirma só após o servidor', async () => {
    const onReenviar = vi.fn().mockResolvedValue({ conviteEnviado: true });
    const { container } = render(
      <AcoesDeAcesso situacao={pendente} nome="Ana" onReenviar={onReenviar} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar convite para Ana' }));
    expect(onReenviar).toHaveBeenCalledWith(undefined);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Convite reenviado para ana@exemplo.invalid.',
    );
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('corrige o e-mail e reenvia; e-mail inválido não é enviado', async () => {
    const user = userEvent.setup();
    const onReenviar = vi.fn().mockResolvedValue({ conviteEnviado: true });
    render(<AcoesDeAcesso situacao={pendente} nome="Ana" onReenviar={onReenviar} />);
    await user.click(screen.getByRole('button', { name: 'Corrigir e-mail de Ana' }));
    const campo = screen.getByLabelText('Novo e-mail de Ana');
    expect(campo).toHaveValue('ana@exemplo.invalid');
    expect(campo).toHaveFocus();

    await user.clear(campo);
    await user.type(campo, 'invalido');
    await user.click(screen.getByRole('button', { name: 'Salvar e reenviar' }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeVisible();
    expect(onReenviar).not.toHaveBeenCalled();

    await user.clear(campo);
    await user.type(campo, 'Ana.Nova@Exemplo.invalid');
    await user.click(screen.getByRole('button', { name: 'Salvar e reenviar' }));
    expect(onReenviar).toHaveBeenCalledWith('ana.nova@exemplo.invalid');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Convite reenviado para ana.nova@exemplo.invalid.',
    );
    expect(screen.queryByLabelText('Novo e-mail de Ana')).not.toBeInTheDocument();
  });

  it('e-mail não enviado vira alerta; erro do servidor aparece', async () => {
    const onReenviar = vi
      .fn()
      .mockResolvedValueOnce({ conviteEnviado: false })
      .mockRejectedValueOnce(new Error('Já existe uma conta com esse e-mail.'));
    render(<AcoesDeAcesso situacao={pendente} nome="Ana" onReenviar={onReenviar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar convite para Ana' }));
    expect(await screen.findByRole('status')).toHaveTextContent('não foi enviado');
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar convite para Ana' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma conta');
  });

  it('bloqueado (demonstração ou sem conexão): ações indisponíveis', () => {
    render(
      <AcoesDeAcesso
        situacao={pendente}
        nome="Ana"
        bloqueio="Indisponível no modo demonstração."
        onReenviar={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Reenviar convite para Ana' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Corrigir e-mail de Ana' })).toBeDisabled();
  });
});
