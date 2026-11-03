import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { EncontrosDaTurma } from './EncontrosDaTurma';
import { PontuacaoMaxima } from './PontuacaoMaxima';

const encontros = [
  { id: 'e1', numero: 1, titulo: 'Abertura' },
  { id: 'e2', numero: 2, titulo: 'Banco de dados' },
  { id: 'e3', numero: 3, titulo: 'Interfaces' },
];

describe('EncontrosDaTurma (US3, FR-008)', () => {
  it('marca todos por padrão, bloqueia o encontro com lançamentos e grava só após a resposta', async () => {
    const usuario = userEvent.setup();
    let concluir!: () => void;
    const onGravar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <EncontrosDaTurma
        encontros={encontros}
        excluidos={[]}
        bloqueados={[{ encontroId: 'e1', motivo: 'Já tem presenças desta turma.' }]}
        onGravar={onGravar}
      />,
    );
    const primeiro = screen.getByRole('checkbox', { name: /1\. Abertura/ });
    expect(primeiro).toBeChecked();
    expect(primeiro).toBeDisabled();
    expect(screen.getByText('Já tem presenças desta turma.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('checkbox', { name: /3\. Interfaces/ }));
    await usuario.click(screen.getByRole('button', { name: 'Gravar encontros da turma' }));
    expect(onGravar).toHaveBeenCalledWith(['e3']);
    expect(screen.queryByText('Encontros da turma gravados.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Encontros da turma gravados.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('mostra desmarcados os encontros fora da turma', () => {
    render(
      <EncontrosDaTurma
        encontros={encontros}
        excluidos={['e2']}
        bloqueados={[]}
        onGravar={vi.fn()}
      />,
    );
    expect(screen.getByRole('checkbox', { name: /2\. Banco de dados/ })).not.toBeChecked();
  });
});

describe('PontuacaoMaxima (US3, FR-009)', () => {
  it('mostra a pontuação máxima e a quantidade de encontros', async () => {
    const { container } = render(<PontuacaoMaxima maximo={304} encontros={3} />);
    expect(
      screen.getByText('Pontuação máxima da turma: 304 pontos (3 encontros)'),
    ).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
