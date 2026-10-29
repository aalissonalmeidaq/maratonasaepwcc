import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { FormDupla } from './FormDupla';

const turmas = [
  { id: 't1', nome: '3º A' },
  { id: 't2', nome: '3º B' },
];
const estudantes = [
  { id: 'a', nome: 'Ana', turmaId: 't1', duplaAtivaId: null },
  { id: 'b', nome: 'Bruno', turmaId: 't1', duplaAtivaId: null },
  { id: 'c', nome: 'Carla', turmaId: 't1', duplaAtivaId: 'd1' },
  { id: 'x', nome: 'Xavier', turmaId: 't2', duplaAtivaId: null },
];

async function preencher(i1: string, i2: string) {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText('Turma'), 't1');
  await user.type(screen.getByLabelText('Nome da dupla'), 'Dupla Alfa');
  await user.selectOptions(screen.getByLabelText('Integrante 1'), i1);
  await user.selectOptions(screen.getByLabelText('Integrante 2'), i2);
  await user.click(screen.getByRole('button', { name: 'Formar dupla' }));
}

describe('FormDupla (US3)', () => {
  it('oferece apenas alunos da turma escolhida que não estão em dupla ativa', async () => {
    const { container } = render(
      <FormDupla turmas={turmas} estudantes={estudantes} onFormar={vi.fn()} />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Turma'), 't1');
    const opcoes = within(screen.getByLabelText('Integrante 1'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione', 'Ana', 'Bruno']);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('valida antes de enviar: o mesmo estudante duas vezes não chega ao servidor', async () => {
    const onFormar = vi.fn();
    render(<FormDupla turmas={turmas} estudantes={estudantes} onFormar={onFormar} />);
    await preencher('a', 'a');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escolha dois estudantes diferentes.',
    );
    expect(onFormar).not.toHaveBeenCalled();
  });

  it('confirma somente depois da resposta do servidor', async () => {
    let concluir!: () => void;
    const onFormar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    render(<FormDupla turmas={turmas} estudantes={estudantes} onFormar={onFormar} />);
    await preencher('a', 'b');

    expect(onFormar).toHaveBeenCalledWith({
      turmaId: 't1',
      nome: 'Dupla Alfa',
      integrantes: ['a', 'b'],
    });
    expect(screen.queryByText(/dupla formada/i)).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByRole('status')).toHaveTextContent('Dupla formada.');
  });

  it('mostra o erro devolvido pelo servidor', async () => {
    const onFormar = vi
      .fn()
      .mockRejectedValue(
        new Error('Um dos estudantes já participa de outra dupla ativa nesta edição.'),
      );
    render(<FormDupla turmas={turmas} estudantes={estudantes} onFormar={onFormar} />);
    await preencher('a', 'b');
    expect(await screen.findByRole('alert')).toHaveTextContent('já participa de outra dupla ativa');
  });

  it('fica bloqueado quando não há servidor (modo demonstração)', () => {
    render(
      <FormDupla
        turmas={turmas}
        estudantes={estudantes}
        onFormar={vi.fn()}
        bloqueio="Indisponível no modo demonstração."
      />,
    );
    expect(screen.getByRole('button', { name: 'Formar dupla' })).toBeDisabled();
    expect(screen.getByText('Indisponível no modo demonstração.')).toBeInTheDocument();
  });
});
