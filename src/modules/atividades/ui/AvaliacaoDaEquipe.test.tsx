import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from '@/modules/pontuacao';
import { violacoesA11y } from '@/test/a11y';
import { AvaliacaoDaEquipe } from './AvaliacaoDaEquipe';

describe('AvaliacaoDaEquipe (US3, FR-013/015)', () => {
  it('mostra notas, total, desconto de atraso à parte e feedback', async () => {
    const { container } = render(
      <AvaliacaoDaEquipe
        regras={REGRAS_PILOTO}
        descontoAtraso={2}
        avaliacao={{
          notasEntrega: { compreensao: 9, aplicacao: 8, qualidade: 8, organizacao: 9 },
          notasApresentacao: { clareza: 3, explicacao: 4, respostas: 3 },
          apresentacaoNaoAvaliavel: false,
          feedback: 'Bom trabalho.',
          registradoEm: '2026-11-05T20:00:00Z',
        }}
      />,
    );
    expect(screen.getByText('Entrega prática: 34 de 40')).toBeInTheDocument();
    expect(screen.getByText(/Desconto de atraso: −2 em Organização e entrega/)).toBeInTheDocument();
    expect(screen.getByText('Apresentação: 10 de 10')).toBeInTheDocument();
    expect(screen.getByText('Bom trabalho.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem entrega e apresentação não avaliável', () => {
    render(
      <AvaliacaoDaEquipe
        regras={REGRAS_PILOTO}
        descontoAtraso={0}
        avaliacao={{
          notasEntrega: null,
          notasApresentacao: null,
          apresentacaoNaoAvaliavel: true,
          feedback: null,
          registradoEm: '2026-11-05T20:00:00Z',
        }}
      />,
    );
    expect(screen.getByText('Entrega prática: sem entrega (0)')).toBeInTheDocument();
    expect(screen.getByText('Apresentação: não avaliável (0)')).toBeInTheDocument();
  });
});
