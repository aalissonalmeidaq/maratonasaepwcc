import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { NomeEquipe } from './NomeEquipe';

describe('NomeEquipe (US3, FR-008)', () => {
  it('avisa que a escolha é única e confirma só após o servidor', async () => {
    let concluir!: () => void;
    const onDefinir = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(<NomeEquipe onDefinir={onDefinir} />);
    expect(screen.getByText(/só pode ser escolhido uma vez/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nome da equipe'), '  Equipe Órbita ');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(onDefinir).toHaveBeenCalledWith('Equipe Órbita');
    expect(screen.queryByText('Nome da equipe salvo.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByRole('status')).toHaveTextContent('Nome da equipe salvo.');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('valida o tamanho antes de enviar', async () => {
    const onDefinir = vi.fn();
    render(<NomeEquipe onDefinir={onDefinir} />);
    await userEvent.type(screen.getByLabelText('Nome da equipe'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(screen.getByText('Informe um nome de 2 a 80 caracteres.')).toBeInTheDocument();
    expect(onDefinir).not.toHaveBeenCalled();
  });

  it('mostra o conflito de nome devolvido pelo servidor', async () => {
    const onDefinir = vi
      .fn()
      .mockRejectedValue(new Error('Já existe uma equipe com este nome na turma.'));
    render(<NomeEquipe onDefinir={onDefinir} />);
    await userEvent.type(screen.getByLabelText('Nome da equipe'), 'Equipe Vetor');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma equipe com este nome',
    );
  });

  it('bloqueado (offline, demonstração ou edição encerrada)', () => {
    render(<NomeEquipe onDefinir={vi.fn()} bloqueio="Edição encerrada: somente consulta." />);
    expect(screen.getByRole('button', { name: 'Salvar nome' })).toBeDisabled();
  });
});
