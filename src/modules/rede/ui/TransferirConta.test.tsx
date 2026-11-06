import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { MembroDaUnidade, Unidade } from '../domain/tipos';
import { TransferirConta } from './TransferirConta';

const origem: Unidade = {
  id: 'un-a',
  nome: 'Unidade A',
  ativa: true,
  desativadaEm: null,
  justificativaDesativacao: null,
  gestao: [],
};
const destinoB: Unidade = { ...origem, id: 'un-b', nome: 'Unidade B' };
const desativada: Unidade = { ...origem, id: 'un-c', nome: 'Unidade C', ativa: false };
const membros: MembroDaUnidade[] = [
  {
    usuarioId: 'p1',
    nome: 'Ana Docente',
    email: 'ana@exemplo.invalid',
    funcoes: ['docente', 'mentor'],
    situacaoAcesso: 'ativo',
    ativo: true,
  },
  {
    usuarioId: 'p2',
    nome: 'Beto Inativo',
    email: 'beto@exemplo.invalid',
    funcoes: [],
    situacaoAcesso: 'ativo',
    ativo: false,
  },
];

function renderizar(transferir = vi.fn().mockResolvedValue(undefined), bloqueio?: string) {
  const saida = render(
    <TransferirConta
      unidade={origem}
      membros={membros}
      destinos={[origem, destinoB, desativada]}
      transferir={transferir}
      bloqueio={bloqueio}
    />,
  );
  return { transferir, ...saida };
}

describe('transferência de conta (spec 019)', () => {
  it('lista a equipe com funções e oferece "Transferir" só para contas ativas', () => {
    renderizar();
    const lista = screen.getByRole('list', { name: 'Equipe de Unidade A' });
    expect(within(lista).getByText(/ana@exemplo\.invalid/)).toBeInTheDocument();
    expect(within(lista).getByText(/Docente, Mentor SAEP/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferir Ana Docente/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Transferir Beto Inativo/ }),
    ).not.toBeInTheDocument();
  });

  it('o destino lista só unidades ativas, sem a de origem', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Transferir Ana Docente/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Transferir Ana Docente' });
    const opcoes = within(dialogo)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opcoes).toContain('Unidade B');
    expect(opcoes).not.toContain('Unidade A');
    expect(opcoes).not.toContain('Unidade C');
  });

  it('valida antes de enviar e só mostra sucesso depois da resposta do servidor', async () => {
    const { transferir } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Transferir Ana Docente/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Transferir Ana Docente' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Transferir' }));
    expect(transferir).not.toHaveBeenCalled();
    expect(within(dialogo).getByText('Escolha a unidade de destino.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Justifique com 10 a 2.000 caracteres.')).toBeInTheDocument();

    await userEvent.selectOptions(within(dialogo).getByLabelText('Unidade de destino'), 'un-b');
    await userEvent.type(
      within(dialogo).getByLabelText('Justificativa'),
      '  Mudança de unidade da docente.  ',
    );
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Transferir' }));
    expect(transferir).toHaveBeenCalledWith({
      usuarioId: 'p1',
      unidadeDestinoId: 'un-b',
      justificativa: 'Mudança de unidade da docente.',
    });
    expect(
      await screen.findByText(
        'Conta transferida. A gestão da unidade de destino define as funções.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a recusa do servidor aparece dentro do diálogo e os dados digitados ficam', async () => {
    const transferir = vi.fn().mockRejectedValue(new Error('Indique outra gestão antes.'));
    renderizar(transferir);
    await userEvent.click(screen.getByRole('button', { name: /Transferir Ana Docente/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Transferir Ana Docente' });
    await userEvent.selectOptions(within(dialogo).getByLabelText('Unidade de destino'), 'un-b');
    await userEvent.type(within(dialogo).getByLabelText('Justificativa'), 'Mudança de unidade.');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Transferir' }));
    expect(await within(dialogo).findByText('Indique outra gestão antes.')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Justificativa')).toHaveValue('Mudança de unidade.');
    expect(screen.queryByText(/Conta transferida/)).not.toBeInTheDocument();
  });

  it('bloqueio de escrita desabilita o botão', () => {
    renderizar(undefined, 'Sem conexão.');
    expect(screen.getByRole('button', { name: /Transferir Ana Docente/ })).toBeDisabled();
  });

  it('sem violações de acessibilidade com o diálogo aberto', async () => {
    const { container } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Transferir Ana Docente/ }));
    expect(await violacoesA11y(container.ownerDocument.body)).toEqual([]);
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
