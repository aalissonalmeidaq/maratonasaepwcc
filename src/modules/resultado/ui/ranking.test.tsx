import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PendenciasDaCategoria, PublicacaoRanking, VersaoPublicada } from '../domain/tipos';
import { HistoricoPublicacoes } from './HistoricoPublicacoes';
import { PainelPublicacao } from './PainelPublicacao';
import { TabelaRanking } from './TabelaRanking';

const pontuacao = {
  presenca: 10,
  participacao: 10,
  avaliacaoObjetiva: 20,
  entrega: 30,
  apresentacao: 10,
  descontos: 0,
  total: 80,
  pendencias: [],
};

const publicacao: PublicacaoRanking = {
  id: 'p1',
  categoria: 'Categoria A',
  versao: 2,
  estado: 'provisorio',
  publicadoEm: '2026-11-01T15:00:00Z',
  revisaoAte: '2026-11-02T15:00:00Z',
  posicoes: [
    {
      duplaId: 'e1',
      nome: 'Equipe Órbita',
      posicao: 1,
      compartilhada: true,
      total: 80,
      pendente: false,
      minha: true,
      detalhe: [{ encontroId: 'en1', numero: 1, titulo: 'Abertura', pontuacao }],
    },
    {
      duplaId: 'e2',
      nome: 'Equipe Vetor',
      posicao: 1,
      compartilhada: true,
      total: 80,
      pendente: true,
      minha: false,
    },
    {
      duplaId: 'e3',
      nome: 'Equipe Pixel',
      posicao: 3,
      compartilhada: false,
      total: 40,
      pendente: false,
      minha: false,
    },
  ],
};

describe('TabelaRanking (US4, FR-016, FR-019)', () => {
  it('estado e empate em texto, própria equipe destacada e detalhe só onde veio do servidor', async () => {
    const { container } = render(<TabelaRanking publicacao={publicacao} />);
    expect(screen.getByText('Provisório')).toBeInTheDocument();
    expect(screen.getByText(/Versão 2/)).toBeInTheDocument();
    const tabela = within(screen.getByRole('table'));
    expect(tabela.getAllByText('(empate)')).toHaveLength(2);
    expect(tabela.getByText('(sua equipe)')).toBeInTheDocument();
    expect(tabela.getByText('Lançamentos pendentes')).toBeInTheDocument();
    const detalhe = screen.getByRole('region', { name: 'Detalhe — Equipe Órbita' });
    expect(within(detalhe).getByText('1. Abertura')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Detalhe — Equipe Vetor' }),
    ).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem publicação: estado vazio', () => {
    render(<TabelaRanking publicacao={null} />);
    expect(screen.getByText('O ranking ainda não foi publicado.')).toBeInTheDocument();
  });
});

const semPendencias: PendenciasDaCategoria = { componentes: [], ocorrencias: [], revisoes: [] };
const comPendencias: PendenciasDaCategoria = {
  componentes: [
    {
      duplaId: 'e2',
      duplaNome: 'Equipe Vetor',
      encontroNumero: 4,
      componente: 'avaliacaoObjetiva',
    },
  ],
  ocorrencias: [{ id: 'o1', duplaNome: 'Equipe Pixel', estado: 'registrada' }],
  revisoes: [],
};

describe('PainelPublicacao (US4, FR-015, FR-017, FR-018, SC-004)', () => {
  it('publica em até 3 interações e só confirma após o servidor', async () => {
    let concluir!: () => void;
    const onPublicar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <PainelPublicacao pendencias={semPendencias} versaoAtual={null} onPublicar={onPublicar} />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Parcial' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar ranking' }));
    expect(onPublicar).toHaveBeenCalledWith({ estado: 'parcial', justificativa: undefined });
    expect(screen.queryByText(/Ranking publicado/)).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText(/Ranking publicado/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('a partir da versão 2 exige justificativa; lista as pendências e o definitivo fica indisponível', async () => {
    const onPublicar = vi.fn().mockResolvedValue(undefined);
    render(<PainelPublicacao pendencias={comPendencias} versaoAtual={1} onPublicar={onPublicar} />);
    expect(
      screen.getByText(/Equipe Vetor — encontro 4: questões\/prova oficial/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Equipe Pixel — ocorrência sem decisão/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Definitivo/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'Provisório' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar ranking' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    expect(onPublicar).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByLabelText('Justificativa da nova versão'),
      'Prova oficial registrada.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Publicar ranking' }));
    expect(onPublicar).toHaveBeenCalledWith({
      estado: 'provisorio',
      justificativa: 'Prova oficial registrada.',
    });
  });

  it('recusa do servidor aparece no lugar do sucesso', async () => {
    const onPublicar = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'A publicação definitiva foi recusada por pendências: Equipe Vetor — revisão aberta.',
        ),
      );
    render(
      <PainelPublicacao pendencias={semPendencias} versaoAtual={null} onPublicar={onPublicar} />,
    );
    await userEvent.click(screen.getByRole('radio', { name: /Definitivo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar ranking' }));
    expect(await screen.findByText(/recusada por pendências/)).toBeInTheDocument();
  });

  it('sem conexão ou na demonstração: publicar desabilitado com o motivo (FR-025)', () => {
    render(
      <PainelPublicacao
        pendencias={semPendencias}
        versaoAtual={null}
        onPublicar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Publicar ranking' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });
});

describe('HistoricoPublicacoes (FR-018)', () => {
  it('lista as versões com autor e justificativa', async () => {
    const versoes: VersaoPublicada[] = [
      {
        id: 'p2',
        versao: 2,
        estado: 'provisorio',
        publicadoEm: '2026-11-01T15:00:00Z',
        publicadoPorNome: 'Coordenação',
        justificativa: 'Prova oficial registrada.',
        revisaoAte: '2026-11-02T15:00:00Z',
      },
      {
        id: 'p1',
        versao: 1,
        estado: 'parcial',
        publicadoEm: '2026-10-30T15:00:00Z',
        publicadoPorNome: 'Coordenação',
        justificativa: null,
        revisaoAte: null,
      },
    ];
    const { container } = render(<HistoricoPublicacoes versoes={versoes} />);
    const tabela = within(screen.getByRole('table'));
    expect(tabela.getByText('Prova oficial registrada.')).toBeInTheDocument();
    expect(tabela.getAllByText('Coordenação')).toHaveLength(2);
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
