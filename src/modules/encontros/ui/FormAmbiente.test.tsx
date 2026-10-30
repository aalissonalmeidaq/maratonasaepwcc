import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { FormAmbiente } from './FormAmbiente';

const ambiente = { id: 'a1', nome: 'Laboratório 1', observacoes: 'Bloco A' };

describe('FormAmbiente — edição (FR-012)', () => {
  it('abre preenchido, com foco no nome, e confirma só após o servidor', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    const onCancelar = vi.fn();
    const { container } = render(
      <FormAmbiente inicial={ambiente} onSalvar={onSalvar} onCancelar={onCancelar} />,
    );
    const nome = screen.getByLabelText('Nome do ambiente');
    expect(nome).toHaveValue('Laboratório 1');
    expect(nome).toHaveFocus();
    await user.clear(screen.getByLabelText('Observações'));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(onSalvar).toHaveBeenCalledWith({ id: 'a1', nome: 'Laboratório 1', observacoes: null });
    expect(await screen.findByRole('status')).toHaveTextContent('Ambiente atualizado.');
    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onCancelar).toHaveBeenCalled();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('cancelar não grava', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn();
    const onCancelar = vi.fn();
    render(<FormAmbiente inicial={ambiente} onSalvar={onSalvar} onCancelar={onCancelar} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('cadastro continua igual: sem id, limpa os campos após o servidor', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(<FormAmbiente onSalvar={onSalvar} />);
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome do ambiente'), 'Auditório');
    await user.click(screen.getByRole('button', { name: 'Adicionar ambiente' }));
    expect(onSalvar).toHaveBeenCalledWith({ nome: 'Auditório', observacoes: null });
    expect(await screen.findByRole('status')).toHaveTextContent('Ambiente salvo.');
    expect(screen.getByLabelText('Nome do ambiente')).toHaveValue('');
  });
});
