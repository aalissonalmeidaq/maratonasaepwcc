import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from '@/modules/pontuacao';
import { violacoesA11y } from '@/test/a11y';
import type { EncontroDaEquipe } from '../domain/tipos';
import { PontuacaoDoEncontro } from './PontuacaoDoEncontro';

const encontro: EncontroDaEquipe = {
  encontroId: 'en1',
  numero: 1,
  titulo: 'Abertura',
  avaliacaoObjetiva: 'questoes',
  presencas: [
    { estudanteId: 'a', presente: true },
    { estudanteId: 'b', presente: false },
  ],
  participacao: { envolvimento: 4, colaboracao: 3, organizacao: 3 },
  desafios: [
    {
      desafioId: 'd1',
      temEntrega: true,
      atrasoMinutos: 0,
      prorrogada: false,
      avaliacao: null,
    },
  ],
  listas: [{ listaId: 'l1', encerrada: true, acertos: 6, total: 12 }],
};

describe('PontuacaoDoEncontro (US5, FR-021)', () => {
  it('pontos por componente, "Aguardando registro" e selo Parcial', async () => {
    const { container } = render(
      <PontuacaoDoEncontro encontro={encontro} regras={REGRAS_PILOTO} />,
    );
    expect(screen.getByRole('region', { name: '1. Abertura' })).toBeInTheDocument();
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText('Presença').nextElementSibling).toHaveTextContent('5 / 10');
    expect(screen.getByText('Participação').nextElementSibling).toHaveTextContent('10 / 10');
    expect(screen.getByText('Questões / prova oficial').nextElementSibling).toHaveTextContent(
      '15 / 30',
    );
    expect(screen.getByText('Entrega prática').nextElementSibling).toHaveTextContent(
      'Aguardando registro',
    );
    expect(screen.getByText('Apresentação').nextElementSibling).toHaveTextContent(
      'Aguardando registro',
    );
    expect(screen.getByText('Total parcial').nextElementSibling).toHaveTextContent('30 / 100');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('mostra o feedback da avaliação registrada', () => {
    render(
      <PontuacaoDoEncontro
        regras={REGRAS_PILOTO}
        encontro={{
          ...encontro,
          desafios: [
            {
              ...encontro.desafios[0]!,
              avaliacao: {
                notasEntrega: { compreensao: 9, aplicacao: 8, qualidade: 8, organizacao: 9 },
                notasApresentacao: { clareza: 3, explicacao: 4, respostas: 3 },
                apresentacaoNaoAvaliavel: false,
                feedback: 'Ótimo trabalho.',
                registradoEm: '2026-11-05T20:00:00Z',
              },
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('Entrega prática').nextElementSibling).toHaveTextContent('34 / 40');
    expect(screen.getByText('Ótimo trabalho.')).toBeInTheDocument();
  });
});
