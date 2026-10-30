import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { FormConta } from './Formularios';

const turmas = [{ id: 't1', cursoId: 'c1', nome: '3º A', anoLetivo: null }];

async function preencher(turma = true) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nome completo'), 'Pessoa Nova');
  await user.type(screen.getByLabelText('E-mail'), 'Nova@Exemplo.invalid');
  if (turma) await user.selectOptions(screen.getByLabelText('Turma'), 't1');
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
}

describe('FormConta (US6, FR-011)', () => {
  it('não pede senha: a pessoa cria a própria pelo convite', () => {
    render(<FormConta turmas={turmas} onCriar={vi.fn()} />);
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    expect(screen.getByText(/convite por e-mail/i)).toBeInTheDocument();
  });

  it('exige turma para aluno', async () => {
    const onCriar = vi.fn();
    render(<FormConta turmas={turmas} onCriar={onCriar} />);
    await preencher(false);
    expect(await screen.findByText('Selecione a turma.')).toBeInTheDocument();
    expect(onCriar).not.toHaveBeenCalled();
  });

  it('envia sem senha e confirma o convite só após o servidor', async () => {
    const onCriar = vi.fn().mockResolvedValue({ conviteEnviado: true });
    const { container } = render(<FormConta turmas={turmas} onCriar={onCriar} />);
    await preencher();
    expect(onCriar).toHaveBeenCalledWith({
      nome: 'Pessoa Nova',
      email: 'nova@exemplo.invalid',
      papel: 'aluno',
      turmaId: 't1',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Conta criada. Enviamos o convite para nova@exemplo.invalid.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('conta criada sem e-mail enviado vira alerta para reenviar (nunca sucesso silencioso)', async () => {
    const onCriar = vi.fn().mockResolvedValue({ conviteEnviado: false });
    render(<FormConta turmas={turmas} onCriar={onCriar} />);
    await preencher();
    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent('o e-mail do convite não foi enviado');
    expect(aviso).toHaveTextContent('Reenviar convite');
    expect(aviso).not.toHaveTextContent('Enviamos o convite');
  });

  it('erro do servidor aparece e mantém os dados para corrigir', async () => {
    const onCriar = vi.fn().mockRejectedValue(new Error('Já existe uma conta com esse e-mail.'));
    render(<FormConta turmas={turmas} onCriar={onCriar} />);
    await preencher();
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma conta');
    expect(screen.getByLabelText('E-mail')).toHaveValue('Nova@Exemplo.invalid');
  });
});
