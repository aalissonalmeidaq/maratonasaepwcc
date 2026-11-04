import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { ResultadoLote, TurmaNoRanking } from '../domain/tipos';
import { ListaTurmasRanking } from './ListaTurmasRanking';
import { PainelPublicacao } from './PainelPublicacao';
import { ResultadoDoLote } from './ResultadoDoLote';

const turmas: TurmaNoRanking[] = [
  {
    turmaId: 't1',
    turma: '3º ano A',
    categoria: 'Categoria A',
    equipes: 4,
    ultima: { id: 'p1', versao: 2, estado: 'provisorio', publicadoEm: '2026-11-01T15:00:00Z' },
    pendencias: { componentes: 3, ocorrencias: 1, revisoes: 0 },
  },
  {
    turmaId: 't2',
    turma: '3º ano B',
    categoria: 'Categoria B',
    equipes: 2,
    ultima: null,
    pendencias: { componentes: 0, ocorrencias: 0, revisoes: 0 },
  },
];

describe('ListaTurmasRanking (spec 012, FR-007)', () => {
  it('uma linha por turma com estado, pendências dos encontros realizados e seleção', async () => {
    const onSelecionar = vi.fn();
    const onAbrir = vi.fn();
    const { container } = render(
      <ListaTurmasRanking
        turmas={turmas}
        selecionadas={['t1']}
        onSelecionar={onSelecionar}
        onAbrir={onAbrir}
      />,
    );
    const lista = screen.getByRole('list', { name: 'Turmas da edição' });
    const [a, b] = within(lista).getAllByRole('listitem');
    expect(within(a!).getByText('Categoria A')).toBeInTheDocument();
    expect(within(a!).getByText('Provisório')).toBeInTheDocument();
    expect(within(a!).getByText(/versão 2/)).toBeInTheDocument();
    expect(within(a!).getByText('4 pendências')).toBeInTheDocument();
    expect(within(b!).getByText('Não publicado')).toBeInTheDocument();
    expect(within(b!).getByText('Nenhuma pendência')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Selecionar 3º ano A' })).toBeChecked();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar 3º ano B' }));
    expect(onSelecionar).toHaveBeenLastCalledWith(['t1', 't2']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todas as turmas' }));
    expect(onSelecionar).toHaveBeenLastCalledWith(['t1', 't2']);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir 3º ano B' }));
    expect(onAbrir).toHaveBeenCalledWith('t2');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('com todas marcadas, "Selecionar todas" desmarca', async () => {
    const onSelecionar = vi.fn();
    render(
      <ListaTurmasRanking
        turmas={turmas}
        selecionadas={['t1', 't2']}
        onSelecionar={onSelecionar}
        onAbrir={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todas as turmas' }));
    expect(onSelecionar).toHaveBeenLastCalledWith([]);
  });
});

describe('PainelPublicacao em lote (spec 012, FR-007a, SC-003)', () => {
  const marcadas = [
    { turmaId: 't1', turma: '3º ano A', versaoBase: 2 },
    { turmaId: 't2', turma: '3º ano B', versaoBase: null },
  ];

  it('publica as turmas marcadas e só mostra o resultado depois do servidor', async () => {
    let concluir!: (r: ResultadoLote) => void;
    const onPublicar = vi.fn(() => new Promise<ResultadoLote>((r) => (concluir = r)));
    const { container } = render(
      <PainelPublicacao turmas={marcadas.slice(1)} onPublicar={onPublicar} />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Parcial' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar 1 turma' }));
    expect(onPublicar).toHaveBeenCalledWith({ estado: 'parcial', justificativa: undefined });
    expect(
      screen.queryByRole('region', { name: 'Resultado da publicação' }),
    ).not.toBeInTheDocument();
    concluir([{ turmaId: 't2', turma: '3º ano B', publicada: true, versao: 1, motivo: null }]);
    const resultado = await screen.findByRole('region', { name: 'Resultado da publicação' });
    expect(within(resultado).getByText(/3º ano B — versão 1/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('justificativa obrigatória quando alguma turma marcada já tem publicação', async () => {
    const onPublicar = vi.fn().mockResolvedValue([]);
    render(<PainelPublicacao turmas={marcadas} onPublicar={onPublicar} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Provisório' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar 2 turmas' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    expect(onPublicar).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Prova oficial registrada.');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar 2 turmas' }));
    expect(onPublicar).toHaveBeenCalledWith({
      estado: 'provisorio',
      justificativa: 'Prova oficial registrada.',
    });
  });

  it('sem turma marcada, publicar fica indisponível com a explicação', () => {
    render(<PainelPublicacao turmas={[]} onPublicar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Publicar 0 turmas' })).toBeDisabled();
    expect(screen.getByText('Marque ao menos uma turma na lista.')).toBeInTheDocument();
  });

  it('sem conexão ou na demonstração: publicar desabilitado com o motivo', () => {
    render(
      <PainelPublicacao
        turmas={marcadas}
        onPublicar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Publicar 2 turmas' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });

  it('erro geral do servidor aparece no lugar do resultado', async () => {
    const onPublicar = vi.fn().mockRejectedValue(new Error('Estado do ranking desconhecido.'));
    render(<PainelPublicacao turmas={marcadas.slice(1)} onPublicar={onPublicar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Publicar 1 turma' }));
    expect(await screen.findByText('Estado do ranking desconhecido.')).toBeInTheDocument();
  });
});

describe('ResultadoDoLote (spec 012, FR-007a)', () => {
  it('separa publicadas e recusadas, com o motivo e o recarregar quando a versão mudou', async () => {
    const onRecarregar = vi.fn();
    const { container } = render(
      <ResultadoDoLote
        resultado={[
          {
            turmaId: 't1',
            turma: '3º ano A',
            publicada: false,
            versao: null,
            motivo:
              'A publicação definitiva foi recusada por pendências: Equipe X — revisão aberta.',
          },
          { turmaId: 't2', turma: '3º ano B', publicada: true, versao: 1, motivo: null },
          {
            turmaId: 't3',
            turma: '3º ano C',
            publicada: false,
            versao: null,
            motivo: 'O ranking desta turma mudou desde que você abriu a tela; recarregue.',
          },
        ]}
        onRecarregar={onRecarregar}
      />,
    );
    const publicadas = screen.getByRole('list', { name: 'Publicadas' });
    expect(within(publicadas).getAllByRole('listitem')).toHaveLength(1);
    const recusadas = screen.getByRole('list', { name: 'Recusadas' });
    expect(within(recusadas).getByText(/recusada por pendências/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(onRecarregar).toHaveBeenCalled();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('tudo publicado: sem lista de recusadas nem recarregar', () => {
    render(
      <ResultadoDoLote
        resultado={[{ turmaId: 't2', turma: '3º ano B', publicada: true, versao: 1, motivo: null }]}
        onRecarregar={vi.fn()}
      />,
    );
    expect(screen.queryByRole('list', { name: 'Recusadas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recarregar' })).not.toBeInTheDocument();
  });
});
