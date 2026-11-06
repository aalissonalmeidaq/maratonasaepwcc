import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { EdicaoDaUnidade, MembroDaUnidade } from '../domain/tipos';
import { EdicoesDaUnidade, type AcoesDeEdicoes } from './EdicoesDaUnidade';

const edicoes: EdicaoDaUnidade[] = [
  {
    id: 'e1',
    nome: 'Maratona 2026',
    inicio: '2026-03-01',
    fim: '2026-12-01',
    estado: 'ativa',
    coordenacao: [
      { usuarioId: 'p1', nome: 'Ana Coordenação', ativa: true },
      { usuarioId: 'p2', nome: 'Bia Coordenação', ativa: true },
      { usuarioId: 'p4', nome: 'Dani Antiga', ativa: false },
    ],
  },
  {
    id: 'e2',
    nome: 'Maratona 2025',
    inicio: '2025-03-01',
    fim: '2025-12-01',
    estado: 'encerrada',
    coordenacao: [{ usuarioId: 'p1', nome: 'Ana Coordenação', ativa: true }],
  },
  { id: 'e3', nome: 'Maratona 2027', inicio: null, fim: null, estado: 'rascunho', coordenacao: [] },
];

const membro = (
  usuarioId: string,
  nome: string,
  funcoes: MembroDaUnidade['funcoes'],
  ativo = true,
): MembroDaUnidade => ({
  usuarioId,
  nome,
  email: `${usuarioId}@exemplo.invalid`,
  funcoes,
  situacaoAcesso: 'ativo',
  ativo,
});
const candidatas: MembroDaUnidade[] = [
  membro('p1', 'Ana Coordenação', ['coordenacao']),
  membro('p2', 'Bia Coordenação', ['coordenacao']),
  membro('p3', 'Caio Coordenação', ['coordenacao']),
  membro('p4', 'Dani Antiga', ['coordenacao']),
];

function acoes(extra: Partial<AcoesDeEdicoes> = {}): AcoesDeEdicoes {
  return {
    criar: vi.fn().mockResolvedValue(undefined),
    definirCoordenacao: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
}

function renderizar(a = acoes(), bloqueio?: string) {
  const r = render(
    <EdicoesDaUnidade edicoes={edicoes} candidatas={candidatas} acoes={a} bloqueio={bloqueio} />,
  );
  return { ...r, acoes: a };
}

const cartao = (nome: string) => screen.getByRole('article', { name: new RegExp(nome) });

describe('Edições da unidade (spec 016, FR-006, FR-006c)', () => {
  it('lista as edições com o estado, o período e as coordenações ativas', () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Edições' })).toBeInTheDocument();
    const e1 = cartao('Maratona 2026');
    expect(within(e1).getByText('Ativa')).toBeInTheDocument();
    expect(within(e1).getByText('Ana Coordenação')).toBeInTheDocument();
    expect(within(e1).getByText('Bia Coordenação')).toBeInTheDocument();
    expect(within(e1).queryByText('Dani Antiga')).not.toBeInTheDocument();
    expect(
      within(cartao('Maratona 2027')).getByText('Edição sem coordenação ativa'),
    ).toBeInTheDocument();
    expect(within(cartao('Maratona 2025')).getByText('Encerrada')).toBeInTheDocument();
  });

  it('criar edição: valida o nome, o período e a coordenação escolhida', async () => {
    const { acoes: a } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Criar edição' }));
    expect(a.criar).not.toHaveBeenCalled();
    expect(screen.getByText('Informe um nome de 3 a 160 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Escolha quem coordena a edição.')).toBeInTheDocument();
  });

  it('criar edição envia a chave, o período e a coordenação; confirma só depois do servidor', async () => {
    let resolver: () => void = () => undefined;
    const a = acoes({ criar: vi.fn(() => new Promise<void>((r) => (resolver = r))) as never });
    renderizar(a);
    await userEvent.type(screen.getByLabelText('Nome da edição'), '  Maratona 2028 ');
    await userEvent.type(screen.getByLabelText('Início'), '2028-03-01');
    await userEvent.type(screen.getByLabelText('Fim'), '2028-12-01');
    await userEvent.selectOptions(screen.getByLabelText('Coordenação da edição'), 'p3');
    await userEvent.click(screen.getByRole('button', { name: 'Criar edição' }));
    expect(a.criar).toHaveBeenCalledWith({
      chave: expect.any(String),
      nome: 'Maratona 2028',
      inicio: '2028-03-01',
      fim: '2028-12-01',
      coordenacaoId: 'p3',
    });
    expect(screen.queryByText('Edição criada em preparação.')).not.toBeInTheDocument();
    resolver();
    expect(await screen.findByText('Edição criada em preparação.')).toBeInTheDocument();
  });

  it('só quem tem função de coordenação ativa pode ser escolhida', () => {
    renderizar();
    const opcoes = within(screen.getByLabelText('Coordenação da edição'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opcoes).toEqual([
      'Escolha…',
      'Ana Coordenação',
      'Bia Coordenação',
      'Caio Coordenação',
      'Dani Antiga',
    ]);
  });

  it('recusa do servidor aparece como erro anunciado', async () => {
    renderizar(
      acoes({
        criar: vi
          .fn()
          .mockRejectedValue(
            new Error('A pessoa indicada não tem a função de coordenação na unidade.'),
          ),
      }),
    );
    await userEvent.type(screen.getByLabelText('Nome da edição'), 'Maratona 2028');
    await userEvent.selectOptions(screen.getByLabelText('Coordenação da edição'), 'p3');
    await userEvent.click(screen.getByRole('button', { name: 'Criar edição' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('não tem a função de coordenação');
  });

  it('acrescentar coordenação oferece só quem ainda não coordena a edição', async () => {
    const { acoes: a } = renderizar();
    const e1 = cartao('Maratona 2026');
    await userEvent.click(within(e1).getByRole('button', { name: /Acrescentar coordenação/ }));
    const opcoes = within(within(e1).getByLabelText('Nova coordenação'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opcoes).toEqual(['Escolha…', 'Caio Coordenação', 'Dani Antiga']);
    await userEvent.selectOptions(within(e1).getByLabelText('Nova coordenação'), 'p3');
    await userEvent.click(within(e1).getByRole('button', { name: 'Acrescentar' }));
    expect(a.definirCoordenacao).toHaveBeenCalledWith('e1', 'p3', true, null);
    expect(await within(e1).findByText('Coordenação acrescentada.')).toBeInTheDocument();
  });

  it('retirar coordenação pede justificativa e mostra a recusa da última no diálogo', async () => {
    const a = acoes({
      definirCoordenacao: vi.fn().mockRejectedValue(new Error('Indique outra coordenação antes.')),
    });
    renderizar(a);
    await userEvent.click(
      within(cartao('Maratona 2026')).getByRole('button', { name: /Retirar Ana Coordenação/ }),
    );
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText('Justificativa'), 'Troca da coordenação.');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Retirar coordenação' }));
    expect(a.definirCoordenacao).toHaveBeenCalledWith('e1', 'p1', false, 'Troca da coordenação.');
    expect(
      await within(screen.getByRole('dialog')).findByText('Indique outra coordenação antes.'),
    ).toBeInTheDocument();
  });

  it('edição encerrada não muda de coordenação', () => {
    renderizar();
    expect(within(cartao('Maratona 2025')).queryByRole('button')).not.toBeInTheDocument();
    expect(
      within(cartao('Maratona 2025')).getByText(/não muda de coordenação/i),
    ).toBeInTheDocument();
  });

  it('com bloqueio, as ações ficam desabilitadas com o motivo', () => {
    renderizar(acoes(), 'Indisponível no modo demonstração: nenhuma alteração é gravada.');
    expect(
      screen.getByText('Indisponível no modo demonstração: nenhuma alteração é gravada.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar edição' })).toBeDisabled();
    expect(
      within(cartao('Maratona 2026')).getByRole('button', { name: /Acrescentar coordenação/ }),
    ).toBeDisabled();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
