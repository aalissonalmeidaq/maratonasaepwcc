import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PontosDaEquipe } from '../domain/tipos';
import { PreviaPontos } from './PreviaPontos';

const equipe = (id: string, nome: string, total: number): PontosDaEquipe => ({
  duplaId: id,
  nome,
  totais: { total, entrega: 33.5, avaliacaoObjetiva: 42.5, presenca: 10, pendente: true },
  encontros: [
    {
      encontroId: 'en1',
      numero: 1,
      titulo: 'Abertura',
      pontuacao: {
        presenca: 10,
        participacao: 10,
        avaliacaoObjetiva: 22.5,
        entrega: 33.5,
        apresentacao: 5,
        descontos: 10,
        total: 71,
        pendencias: [],
      },
    },
    {
      encontroId: 'en4',
      numero: 4,
      titulo: 'Prova',
      pontuacao: {
        presenca: 0,
        participacao: 0,
        avaliacaoObjetiva: 20,
        entrega: 0,
        apresentacao: 0,
        descontos: 0,
        total: 20,
        pendencias: ['participacao', 'entrega', 'apresentacao'],
      },
    },
  ],
});

describe('PreviaPontos (US3, FR-019, FR-019a)', () => {
  it('equipe: selo "Prévia — não oficial", componentes por encontro e pendências em texto', async () => {
    const { container } = render(
      <PreviaPontos equipes={[equipe('e1', 'Equipe Órbita', 91)]} modo="equipe" />,
    );
    expect(screen.getAllByText('Prévia — não oficial').length).toBeGreaterThan(0);
    expect(screen.getByText(/91 pontos/)).toBeInTheDocument();
    const encontro1 = screen.getByRole('region', { name: '1. Abertura' });
    expect(within(encontro1).getByText('Descontos de ocorrências')).toBeInTheDocument();
    expect(within(encontro1).getByText('−10')).toBeInTheDocument();
    expect(within(encontro1).getByText('22,5')).toBeInTheDocument();
    const encontro4 = screen.getByRole('region', { name: '4. Prova' });
    expect(within(encontro4).getAllByText('Aguardando registro')).toHaveLength(3);
    expect(screen.queryByText(/nota/i)).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('turma: uma linha por equipe com total e situação, e o detalhe por encontro', async () => {
    const { container } = render(
      <PreviaPontos
        equipes={[equipe('e1', 'Equipe Órbita', 91), equipe('e2', 'Equipe Vetor', 30)]}
        modo="turma"
      />,
    );
    expect(screen.getByText('Equipe Órbita')).toBeInTheDocument();
    expect(screen.getByText('Equipe Vetor')).toBeInTheDocument();
    expect(screen.getAllByText('Com pendências')).toHaveLength(2);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem equipes: estado vazio', () => {
    render(<PreviaPontos equipes={[]} modo="turma" />);
    expect(screen.getByText('Nenhuma equipe com pontos nesta turma.')).toBeInTheDocument();
  });
  it('com a pontuação máxima da turma: "X de N pontos" (spec 011, FR-009)', () => {
    const { rerender } = render(
      <PreviaPontos
        equipes={[{ ...equipe('e1', 'Equipe Órbita', 91), maximo: 304 }]}
        modo="equipe"
      />,
    );
    expect(screen.getByText('91 de 304 pontos até agora')).toBeInTheDocument();
    rerender(
      <PreviaPontos
        equipes={[{ ...equipe('e1', 'Equipe Órbita', 91), maximo: 304 }]}
        modo="turma"
      />,
    );
    expect(screen.getByText('91 de 304 pontos')).toBeInTheDocument();
  });
});
