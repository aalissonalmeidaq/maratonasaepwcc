import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormConta } from './Formularios';

const turmas = [{ id: 't1', cursoId: 'c1', nome: '3º A', anoLetivo: null }];

async function preencher(senha: string, turma = true) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nome completo'), 'Pessoa Nova');
  await user.type(screen.getByLabelText('E-mail'), 'nova@exemplo.invalid');
  await user.type(screen.getByLabelText('Senha provisória'), senha);
  if (turma) await user.selectOptions(screen.getByLabelText('Turma'), 't1');
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
}

describe('FormConta (US6)', () => {
  it('exige senha provisória com pelo menos 10 caracteres', async () => {
    const onCriar = vi.fn();
    render(<FormConta turmas={turmas} onCriar={onCriar} />);
    await preencher('curta');
    expect(await screen.findByText(/pelo menos 10 caracteres/)).toBeInTheDocument();
    expect(onCriar).not.toHaveBeenCalled();
  });

  it('exige turma para aluno', async () => {
    const onCriar = vi.fn();
    render(<FormConta turmas={turmas} onCriar={onCriar} />);
    await preencher('provisoria-123', false);
    expect(await screen.findByText('Selecione a turma.')).toBeInTheDocument();
    expect(onCriar).not.toHaveBeenCalled();
  });

  it('envia e confirma somente após o servidor, sem manter a senha na tela', async () => {
    const onCriar = vi.fn().mockResolvedValue(undefined);
    render(<FormConta turmas={turmas} onCriar={onCriar} />);
    await preencher('provisoria-123');
    expect(onCriar).toHaveBeenCalledWith({
      nome: 'Pessoa Nova',
      email: 'nova@exemplo.invalid',
      senhaProvisoria: 'provisoria-123',
      papel: 'aluno',
      turmaId: 't1',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Conta criada');
    expect(screen.getByLabelText('Senha provisória')).toHaveValue('');
  });
});
