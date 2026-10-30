import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { FormEquipeDocente } from './FormEquipeDocente';

const disponiveis = [
  { id: 'a', nome: 'Ana Exemplo' },
  { id: 'b', nome: 'Bruno Exemplo' },
  { id: 'c', nome: 'Carla Exemplo' },
];

describe('FormEquipeDocente (FR-010)', () => {
  it('forma equipe com quem sobrou e confirma só após o servidor', async () => {
    let concluir!: () => void;
    const onFormar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormEquipeDocente disponiveis={disponiveis} permiteTrio={false} onFormar={onFormar} />,
    );
    await userEvent.click(screen.getByLabelText('Ana Exemplo'));
    await userEvent.click(screen.getByLabelText('Bruno Exemplo'));
    expect(screen.getByLabelText('Carla Exemplo')).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Alunos que sobraram na turma');
    await userEvent.click(screen.getByRole('button', { name: 'Formar equipe' }));
    expect(onFormar).toHaveBeenCalledWith({
      estudantes: ['a', 'b'],
      justificativa: 'Alunos que sobraram na turma',
    });
    expect(screen.queryByText('Equipe formada.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByRole('status')).toHaveTextContent('Equipe formada.');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('com trio permitido, aceita três alunos', async () => {
    render(<FormEquipeDocente disponiveis={disponiveis} permiteTrio onFormar={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Ana Exemplo'));
    await userEvent.click(screen.getByLabelText('Bruno Exemplo'));
    expect(screen.getByLabelText('Carla Exemplo')).toBeEnabled();
  });

  it('valida a composição antes de enviar', async () => {
    const onFormar = vi.fn();
    render(<FormEquipeDocente disponiveis={disponiveis} permiteTrio={false} onFormar={onFormar} />);
    await userEvent.click(screen.getByLabelText('Ana Exemplo'));
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Alunos que sobraram na turma');
    await userEvent.click(screen.getByRole('button', { name: 'Formar equipe' }));
    expect(screen.getByText('Escolha dois alunos (dupla) ou três (trio).')).toBeInTheDocument();
    expect(onFormar).not.toHaveBeenCalled();
  });

  it('sem alunos disponíveis, explica e não oferece o envio', () => {
    render(<FormEquipeDocente disponiveis={[]} permiteTrio={false} onFormar={vi.fn()} />);
    expect(screen.getByText('Todos os alunos da turma já estão em equipes.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Formar equipe' })).not.toBeInTheDocument();
  });

  it('bloqueado (offline, demonstração ou edição encerrada)', () => {
    render(
      <FormEquipeDocente
        disponiveis={disponiveis}
        permiteTrio={false}
        onFormar={vi.fn()}
        bloqueio="Edição encerrada: somente consulta."
      />,
    );
    expect(screen.getByRole('button', { name: 'Formar equipe' })).toBeDisabled();
  });
});

describe('FormEquipeDocente — depois da última formação', () => {
  it('mantém a confirmação quando não sobra mais ninguém', async () => {
    const { rerender } = render(
      <FormEquipeDocente
        disponiveis={disponiveis.slice(0, 2)}
        permiteTrio={false}
        onFormar={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await userEvent.click(screen.getByLabelText('Ana Exemplo'));
    await userEvent.click(screen.getByLabelText('Bruno Exemplo'));
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Alunos que sobraram na turma');
    await userEvent.click(screen.getByRole('button', { name: 'Formar equipe' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Equipe formada.');
    rerender(<FormEquipeDocente disponiveis={[]} permiteTrio={false} onFormar={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Equipe formada.');
  });
});
