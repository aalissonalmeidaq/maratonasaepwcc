import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { MembroDaUnidade } from '../domain/tipos';
import { EquipeDaUnidade, type AcoesDaEquipe } from './EquipeDaUnidade';

const equipe: MembroDaUnidade[] = [
  {
    usuarioId: 'g0',
    nome: 'Eu Gestão',
    email: 'eu@exemplo.invalid',
    funcoes: ['gestao', 'coordenacao'],
    situacaoAcesso: 'ativo',
    ativo: true,
  },
  {
    usuarioId: 'g1',
    nome: 'Outra Gestão',
    email: 'outra@exemplo.invalid',
    funcoes: ['gestao'],
    situacaoAcesso: 'ativo',
    ativo: true,
  },
  {
    usuarioId: 'p1',
    nome: 'Ana Coordenação',
    email: 'ana@exemplo.invalid',
    funcoes: ['coordenacao'],
    situacaoAcesso: 'ativo',
    ativo: true,
  },
  {
    usuarioId: 'p2',
    nome: 'Bia Docente',
    email: 'bia@exemplo.invalid',
    funcoes: ['docente', 'mentor'],
    situacaoAcesso: 'aguardando',
    ativo: true,
  },
  {
    usuarioId: 'p3',
    nome: 'Caio Analista',
    email: 'caio@exemplo.invalid',
    funcoes: ['analista'],
    situacaoAcesso: 'ativo',
    ativo: false,
  },
];

function acoes(extra: Partial<AcoesDaEquipe> = {}): AcoesDaEquipe {
  return {
    cadastrar: vi.fn().mockResolvedValue({ conviteEnviado: true }),
    definirFuncoes: vi.fn().mockResolvedValue(undefined),
    desativar: vi.fn().mockResolvedValue(undefined),
    reativar: vi.fn().mockResolvedValue(undefined),
    reenviarConvite: vi.fn().mockResolvedValue({ conviteEnviado: true }),
    ...extra,
  };
}

function renderizar(a = acoes(), bloqueio?: string) {
  const r = render(
    <EquipeDaUnidade equipe={equipe} usuarioAtualId="g0" acoes={a} bloqueio={bloqueio} />,
  );
  return { ...r, acoes: a };
}

const linha = (nome: string) => screen.getByRole('listitem', { name: new RegExp(nome) });

describe('Equipe da unidade (spec 016, US2)', () => {
  it('lista a equipe com as funções e a situação do acesso', () => {
    renderizar();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Equipe da unidade' }),
    ).toBeInTheDocument();
    const bia = linha('Bia Docente');
    expect(within(bia).getByText('Docente')).toBeInTheDocument();
    expect(within(bia).getByText('Mentor SAEP')).toBeInTheDocument();
    expect(within(bia).getByText(/Convite pendente/)).toBeInTheDocument();
    expect(within(linha('Caio Analista')).getByText('Desativada')).toBeInTheDocument();
  });

  it('contas de gestão e a própria conta não têm ações; avisa que só o master altera a gestão', () => {
    renderizar();
    expect(within(linha('Outra Gestão')).queryByRole('button')).not.toBeInTheDocument();
    expect(within(linha('Outra Gestão')).getByText(/só o master altera/i)).toBeInTheDocument();
    expect(within(linha('Eu Gestão')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('filtra por nome e por função; mostra o total', async () => {
    renderizar();
    await userEvent.type(screen.getByLabelText('Buscar por nome'), 'bia');
    expect(screen.queryByRole('listitem', { name: /Ana Coordenação/ })).not.toBeInTheDocument();
    expect(linha('Bia Docente')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Buscar por nome'));
    await userEvent.selectOptions(screen.getByLabelText('Função'), 'analista');
    expect(screen.getByText('1 pessoa')).toBeInTheDocument();
    expect(linha('Caio Analista')).toBeInTheDocument();
  });

  it('cadastrar: exige ao menos uma função e valida a conta', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(a.cadastrar).not.toHaveBeenCalled();
    expect(screen.getByText('Escolha ao menos uma função.')).toBeInTheDocument();
    expect(screen.getByText('Informe o nome (2 a 160 caracteres).')).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
  });

  it('cadastrar envia em minúsculas, com as funções, e confirma só depois do servidor', async () => {
    let resolver: (v: { conviteEnviado: boolean }) => void = () => undefined;
    const a = acoes({ cadastrar: vi.fn(() => new Promise((r) => (resolver = r))) as never });
    renderizar(a);
    const cadastro = screen.getByRole('region', { name: 'Cadastrar pessoa' });
    await userEvent.type(within(cadastro).getByLabelText('Nome'), 'Dani Docente');
    await userEvent.type(within(cadastro).getByLabelText('E-mail'), 'DANI@exemplo.invalid');
    await userEvent.click(within(cadastro).getByRole('checkbox', { name: 'Docente' }));
    await userEvent.click(within(cadastro).getByRole('checkbox', { name: 'Mentor SAEP' }));
    await userEvent.click(within(cadastro).getByRole('button', { name: 'Cadastrar pessoa' }));
    expect(a.cadastrar).toHaveBeenCalledWith({
      nome: 'Dani Docente',
      email: 'dani@exemplo.invalid',
      funcoes: ['docente', 'mentor'],
    });
    expect(screen.queryByText(/Convite enviado/)).not.toBeInTheDocument();
    resolver({ conviteEnviado: true });
    expect(
      await screen.findByText('Convite enviado para dani@exemplo.invalid.'),
    ).toBeInTheDocument();
  });

  it('a gestão não aparece entre as funções do cadastro (só o master concede)', () => {
    renderizar();
    const cadastro = screen.getByRole('region', { name: 'Cadastrar pessoa' });
    expect(within(cadastro).queryByRole('checkbox', { name: 'Gestão' })).not.toBeInTheDocument();
  });

  it('alterar funções: parte das funções atuais e pede justificativa', async () => {
    const { acoes: a } = renderizar();
    const bia = linha('Bia Docente');
    await userEvent.click(within(bia).getByRole('button', { name: /Alterar funções/ }));
    expect(within(bia).getByRole('checkbox', { name: 'Docente' })).toBeChecked();
    expect(within(bia).getByRole('checkbox', { name: 'Mentor SAEP' })).toBeChecked();
    await userEvent.click(within(bia).getByRole('checkbox', { name: 'Mentor SAEP' }));
    await userEvent.click(within(bia).getByRole('button', { name: 'Salvar funções' }));
    expect(a.definirFuncoes).not.toHaveBeenCalled();
    expect(within(bia).getByText('Justifique com pelo menos 10 caracteres.')).toBeInTheDocument();
    await userEvent.type(within(bia).getByLabelText('Justificativa'), 'Deixa a mentoria do curso.');
    await userEvent.click(within(bia).getByRole('button', { name: 'Salvar funções' }));
    expect(a.definirFuncoes).toHaveBeenCalledWith('p2', ['docente'], 'Deixa a mentoria do curso.');
  });

  it('a recusa do servidor ao alterar funções aparece na própria linha', async () => {
    renderizar(
      acoes({
        definirFuncoes: vi.fn().mockRejectedValue(new Error('Indique outra coordenação antes.')),
      }),
    );
    const ana = linha('Ana Coordenação');
    await userEvent.click(within(ana).getByRole('button', { name: /Alterar funções/ }));
    await userEvent.click(within(ana).getByRole('checkbox', { name: 'Coordenação' }));
    await userEvent.click(within(ana).getByRole('checkbox', { name: 'Docente' }));
    await userEvent.type(within(ana).getByLabelText('Justificativa'), 'Passa a ser docente.');
    await userEvent.click(within(ana).getByRole('button', { name: 'Salvar funções' }));
    expect(await within(ana).findByRole('alert')).toHaveTextContent(
      'Indique outra coordenação antes.',
    );
  });

  it('desativar pede justificativa e mostra a recusa da última coordenação no diálogo', async () => {
    const a = acoes({
      desativar: vi.fn().mockRejectedValue(new Error('Indique outra coordenação antes.')),
    });
    renderizar(a);
    await userEvent.click(
      within(linha('Ana Coordenação')).getByRole('button', { name: /Desativar/ }),
    );
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(
      within(dialogo).getByLabelText('Justificativa'),
      'Saída da equipe da unidade.',
    );
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar conta' }));
    expect(a.desativar).toHaveBeenCalledWith('p1', 'Saída da equipe da unidade.');
    expect(
      await within(screen.getByRole('dialog')).findByText('Indique outra coordenação antes.'),
    ).toBeInTheDocument();
  });

  it('reativar não pede justificativa', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(within(linha('Caio Analista')).getByRole('button', { name: /Reativar/ }));
    expect(a.reativar).toHaveBeenCalledWith('p3');
  });

  it('reenviar convite só para quem ainda não fez o primeiro acesso', async () => {
    const { acoes: a } = renderizar();
    expect(
      within(linha('Ana Coordenação')).queryByRole('button', { name: /Reenviar/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(linha('Bia Docente')).getByRole('button', { name: /Reenviar/ }));
    expect(a.reenviarConvite).toHaveBeenCalledWith('p2');
    expect(
      await within(linha('Bia Docente')).findByText('Convite reenviado para bia@exemplo.invalid.'),
    ).toBeInTheDocument();
  });

  it('com bloqueio, as ações ficam desabilitadas com o motivo', () => {
    renderizar(acoes(), 'Sem conexão: gravações exigem conexão com o servidor.');
    expect(
      screen.getByText('Sem conexão: gravações exigem conexão com o servidor.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar pessoa' })).toBeDisabled();
    expect(
      within(linha('Ana Coordenação')).getByRole('button', { name: /Desativar/ }),
    ).toBeDisabled();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
