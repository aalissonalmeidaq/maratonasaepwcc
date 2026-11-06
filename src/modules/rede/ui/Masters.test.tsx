import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { MasterDaRede } from '../domain/tipos';
import { Masters, type AcoesDeMasters } from './Masters';

const masters: MasterDaRede[] = [
  {
    usuarioId: 'm0',
    nome: 'Eu Master',
    email: 'eu@exemplo.invalid',
    situacaoAcesso: 'ativo',
    ativo: true,
  },
  {
    usuarioId: 'm1',
    nome: 'Bia Master',
    email: 'bia@exemplo.invalid',
    situacaoAcesso: 'aguardando',
    ativo: true,
  },
  {
    usuarioId: 'm2',
    nome: 'Caio Master',
    email: 'caio@exemplo.invalid',
    situacaoAcesso: 'ativo',
    ativo: false,
  },
];

function acoes(extra: Partial<AcoesDeMasters> = {}): AcoesDeMasters {
  return {
    convidar: vi.fn().mockResolvedValue({ conviteEnviado: true }),
    definirMaster: vi.fn().mockResolvedValue(undefined),
    reenviarConvite: vi.fn().mockResolvedValue({ conviteEnviado: true }),
    ...extra,
  };
}

function renderizar(a = acoes(), bloqueio?: string) {
  const r = render(<Masters masters={masters} usuarioAtualId="m0" acoes={a} bloqueio={bloqueio} />);
  return { ...r, acoes: a };
}

const linha = (nome: string) => screen.getByRole('listitem', { name: new RegExp(nome) });

describe('Masters (spec 016, FR-002)', () => {
  it('lista os masters com a situação do acesso e marca a própria conta', () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Masters' })).toBeInTheDocument();
    expect(within(linha('Eu Master')).getByText(/você/i)).toBeInTheDocument();
    expect(within(linha('Bia Master')).getByText(/Convite pendente/)).toBeInTheDocument();
    expect(within(linha('Caio Master')).getByText('Desativado')).toBeInTheDocument();
  });

  it('ninguém desativa o próprio acesso: a própria conta não tem o botão', () => {
    renderizar();
    expect(
      within(linha('Eu Master')).queryByRole('button', { name: /Desativar/ }),
    ).not.toBeInTheDocument();
    expect(
      within(linha('Bia Master')).getByRole('button', { name: /Desativar/ }),
    ).toBeInTheDocument();
  });

  it('convidar: valida, envia em minúsculas e confirma só depois do servidor', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Convidar master' }));
    expect(a.convidar).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o nome (2 a 160 caracteres).')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nome'), 'Dani Master');
    await userEvent.type(screen.getByLabelText('E-mail'), 'DANI@exemplo.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Convidar master' }));
    expect(a.convidar).toHaveBeenCalledWith({ nome: 'Dani Master', email: 'dani@exemplo.invalid' });
    expect(
      await screen.findByText('Convite enviado para dani@exemplo.invalid.'),
    ).toBeInTheDocument();
  });

  it('convite que não saiu aparece como alerta', async () => {
    renderizar(acoes({ convidar: vi.fn().mockResolvedValue({ conviteEnviado: false }) }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Dani Master');
    await userEvent.type(screen.getByLabelText('E-mail'), 'dani@exemplo.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Convidar master' }));
    expect(await screen.findByText(/o convite não saiu/i)).toBeInTheDocument();
  });

  it('recusa do servidor aparece como erro anunciado', async () => {
    renderizar(
      acoes({
        convidar: vi.fn().mockRejectedValue(new Error('Já existe uma conta com esse e-mail.')),
      }),
    );
    await userEvent.type(screen.getByLabelText('Nome'), 'Dani Master');
    await userEvent.type(screen.getByLabelText('E-mail'), 'dani@exemplo.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Convidar master' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma conta com esse e-mail.',
    );
  });

  it('desativar outro master pede justificativa', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(within(linha('Bia Master')).getByRole('button', { name: /Desativar/ }));
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText('Justificativa'), 'Saída da rede master.');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar master' }));
    expect(a.definirMaster).toHaveBeenCalledWith('m1', false, 'Saída da rede master.');
  });

  it('reativar não pede justificativa', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(within(linha('Caio Master')).getByRole('button', { name: /Reativar/ }));
    expect(a.definirMaster).toHaveBeenCalledWith('m2', true, null);
  });

  it('reenviar convite só para quem não fez o primeiro acesso', async () => {
    const { acoes: a } = renderizar();
    expect(
      within(linha('Caio Master')).queryByRole('button', { name: /Reenviar/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(linha('Bia Master')).getByRole('button', { name: /Reenviar/ }));
    expect(a.reenviarConvite).toHaveBeenCalledWith('m1');
    expect(
      await screen.findByText('Convite reenviado para bia@exemplo.invalid.'),
    ).toBeInTheDocument();
  });

  it('com bloqueio, as ações ficam desabilitadas com o motivo', () => {
    renderizar(acoes(), 'Sem conexão: gravações exigem conexão com o servidor.');
    expect(
      screen.getByText('Sem conexão: gravações exigem conexão com o servidor.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convidar master' })).toBeDisabled();
    expect(within(linha('Bia Master')).getByRole('button', { name: /Desativar/ })).toBeDisabled();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
