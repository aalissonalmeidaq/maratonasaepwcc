import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PainelDoAluno } from '../domain/tipos';
import { PainelAluno } from './PainelAluno';

const base: PainelDoAluno = {
  equipe: { id: 'd1', nome: 'Dupla Órbita' },
  previa: { total: 81.5, pendente: true },
  ranking: {
    estado: 'parcial',
    versao: 1,
    posicao: 2,
    compartilhada: true,
    publicadoEm: '2026-11-01T15:00:00Z',
  },
  proximoEncontro: {
    id: 'en2',
    numero: 2,
    titulo: 'Desafio prático',
    data: '2026-11-09',
    inicio: '13:30',
  },
  proximoPrazo: { tipo: 'lista', id: 'l1', titulo: 'Lista L1', prazo: '2026-11-03T15:00:00Z' },
  acoes: [
    {
      tipo: 'manifestacao',
      titulo: 'Manifestação sobre a ocorrência do encontro 1',
      prazo: '2026-11-03T12:00:00Z',
      caminho: '/aluno/ocorrencias',
    },
  ],
  avisosNaoLidos: 1,
};

const renderizar = (painel: PainelDoAluno, ficticio = false) =>
  render(
    <MemoryRouter>
      <PainelAluno painel={painel} nome="Ana Exemplo" ficticio={ficticio} />
    </MemoryRouter>,
  );

const cartao = (nome: string) => screen.getByRole('region', { name: nome });

describe('PainelAluno (US1, FR-002, FR-006)', () => {
  it('mostra os cartões com prévia, posição, encontro, prazo, ações e avisos', async () => {
    const { container } = renderizar(base);
    expect(screen.getByRole('heading', { level: 1, name: 'Olá, Ana!' })).toBeInTheDocument();
    expect(screen.getByText('Equipe Dupla Órbita')).toBeInTheDocument();

    const pontos = cartao('Pontos');
    expect(within(pontos).getByText('81,5 pontos')).toBeInTheDocument();
    expect(within(pontos).getByText('Prévia — não oficial')).toBeInTheDocument();
    expect(within(pontos).getByText(/lançamentos pendentes/)).toBeInTheDocument();
    expect(within(pontos).getByRole('link', { name: 'Ver pontuação' })).toHaveAttribute(
      'href',
      '/aluno/pontuacao',
    );

    const posicao = cartao('Posição');
    expect(within(posicao).getByText('2º lugar (empatada)')).toBeInTheDocument();
    expect(within(posicao).getByText('Parcial')).toBeInTheDocument();

    expect(within(cartao('Próximo encontro')).getByText('2. Desafio prático')).toBeInTheDocument();
    expect(within(cartao('Próximo prazo')).getByText('Lista L1')).toBeInTheDocument();
    expect(within(cartao('Próximo prazo')).getByRole('link')).toHaveAttribute(
      'href',
      '/aluno/desafios',
    );

    const acao = within(cartao('Ações pendentes')).getByRole('link', {
      name: 'Manifestação sobre a ocorrência do encontro 1',
    });
    expect(acao).toHaveAttribute('href', '/aluno/ocorrencias');
    expect(within(cartao('Avisos')).getByText('1 aviso não lido')).toBeInTheDocument();
    expect(screen.queryByText('Dados fictícios')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/nota/i);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem publicação: "Ranking ainda não publicado"; sem ações: estado vazio', () => {
    renderizar({ ...base, ranking: null, acoes: [], proximoPrazo: null, avisosNaoLidos: 0 });
    expect(within(cartao('Posição')).getByText('Ranking ainda não publicado')).toBeInTheDocument();
    expect(
      within(cartao('Ações pendentes')).getByText('Nenhuma ação pendente.'),
    ).toBeInTheDocument();
    expect(within(cartao('Próximo prazo')).getByText('Nenhum prazo aberto.')).toBeInTheDocument();
    expect(within(cartao('Avisos')).getByText('Nenhum aviso não lido')).toBeInTheDocument();
  });

  it('sem equipe: convite para formar equipe, sem pontos nem posição', async () => {
    const { container } = renderizar({
      ...base,
      equipe: null,
      previa: null,
      ranking: null,
      acoes: [],
    });
    expect(screen.getByText('Você ainda não tem equipe.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Formar equipe' })).toHaveAttribute(
      'href',
      '/aluno/dupla',
    );
    expect(screen.queryByRole('region', { name: 'Pontos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Posição' })).not.toBeInTheDocument();
    expect(cartao('Próximo encontro')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('na demonstração, o selo "Dados fictícios"', () => {
    renderizar(base, true);
    expect(screen.getByText('Dados fictícios')).toBeInTheDocument();
  });
});
