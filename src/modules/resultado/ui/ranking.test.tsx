import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PendenciasDoRanking, PublicacaoRanking, VersaoPublicada } from '../domain/tipos';
import { ListaPendencias } from './ListaPendencias';
import { HistoricoPublicacoes } from './HistoricoPublicacoes';
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
  turmaId: 't1',
  turma: '3º ano A',
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
    expect(screen.getByRole('table', { name: 'Classificação — 3º ano A' })).toBeInTheDocument();
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

  it('sem publicação: estado vazio da turma', () => {
    render(<TabelaRanking publicacao={null} />);
    expect(screen.getByText('Ranking da turma ainda não publicado')).toBeInTheDocument();
  });

  it('publicação por categoria anterior: legenda com a categoria', () => {
    render(<TabelaRanking publicacao={{ ...publicacao, turmaId: null, turma: null }} />);
    expect(
      screen.getByRole('table', { name: 'Classificação — Categoria A (anterior)' }),
    ).toBeInTheDocument();
  });
});

const semPendencias: PendenciasDoRanking = { componentes: [], ocorrencias: [], revisoes: [] };
const comPendencias: PendenciasDoRanking = {
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

describe('ListaPendencias (FR-004, FR-017 da spec 007)', () => {
  it('lista componentes, ocorrências e revisões que impedem a definitiva', async () => {
    const { container } = render(<ListaPendencias pendencias={comPendencias} />);
    expect(screen.getByText(/2 pendências impedem o definitivo/)).toBeInTheDocument();
    expect(
      screen.getByText(/Equipe Vetor — encontro 4: questões\/prova oficial/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Equipe Pixel — ocorrência sem decisão/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem pendências: a turma pode ser publicada como definitiva', () => {
    render(<ListaPendencias pendencias={semPendencias} />);
    expect(screen.getByText('Nenhuma pendência na turma.')).toBeInTheDocument();
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
