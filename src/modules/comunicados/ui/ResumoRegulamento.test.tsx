import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from '@/modules/pontuacao';
import { violacoesA11y } from '@/test/a11y';
import { ResumoRegulamento } from './ResumoRegulamento';

describe('ResumoRegulamento (US4, FR-014)', () => {
  it('mostra os valores da edição, a versão e o aviso de que o regulamento oficial prevalece', async () => {
    const { container } = render(<ResumoRegulamento regras={REGRAS_PILOTO} versao="piloto-x" />);
    expect(screen.getByText(/Regras da edição — versão piloto-x/)).toBeInTheDocument();
    expect(
      screen.getByText('Resumo em validação: o regulamento oficial aprovado prevalece.'),
    ).toBeInTheDocument();
    const pontuacao = screen.getByRole('region', { name: 'Pontuação por encontro' });
    expect(within(pontuacao).getByText('Questões:')).toBeInTheDocument();
    expect(within(pontuacao).getByText('Acertos ÷ total × 30.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('valor ausente aparece como "a definir"', () => {
    render(<ResumoRegulamento regras={{ presenca: { pontosPorIntegrante: 5 } }} versao="v" />);
    const presenca = screen.getByText('Presença:').closest('li');
    expect(presenca).toHaveTextContent('Presença: a definir');
  });

  it('marca o que foi definido para a turma e mostra a pontuação máxima (spec 011)', async () => {
    const { container } = render(
      <ResumoRegulamento
        regras={REGRAS_PILOTO}
        versao="v"
        gruposAjustados={['apresentacao']}
        maximo={304}
      />,
    );
    const apresentacao = screen.getByText('Apresentação:').closest('li');
    expect(apresentacao).toHaveTextContent('definido para a sua turma');
    expect(screen.getByText('Presença:').closest('li')).not.toHaveTextContent(
      'definido para a sua turma',
    );
    expect(screen.getByText('304 pontos nos encontros da turma.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
