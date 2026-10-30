import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { FormCurso, FormTurma } from './Formularios';

const curso = { id: 'c1', edicaoId: 'e1', nome: 'Curso A', categoria: 'Categoria A' };
const cursos = [curso, { id: 'c2', edicaoId: 'e1', nome: 'Curso B', categoria: 'Categoria B' }];
const turma = { id: 't1', cursoId: 'c1', nome: '3º A', anoLetivo: 2026 };

describe('FormCurso — edição (FR-001)', () => {
  it('abre preenchido, com foco no primeiro campo, e confirma só após o servidor', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    const onCancelar = vi.fn();
    const { container } = render(
      <FormCurso inicial={curso} onSalvar={onSalvar} onCancelar={onCancelar} />,
    );
    const nome = screen.getByLabelText('Nome do curso');
    expect(nome).toHaveValue('Curso A');
    expect(nome).toHaveFocus();
    expect(screen.getByLabelText('Categoria do ranking')).toHaveValue('Categoria A');

    await user.clear(nome);
    await user.type(nome, '  Curso A2 ');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(onSalvar).toHaveBeenCalledWith({ id: 'c1', nome: 'Curso A2', categoria: 'Categoria A' });
    expect(await screen.findByRole('status')).toHaveTextContent('Curso atualizado.');
    // Os valores salvos continuam visíveis; a saída da edição passa a se chamar "Concluir".
    expect(nome).toHaveValue('Curso A2');
    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onCancelar).toHaveBeenCalled();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('erro do servidor aparece e não há confirmação', async () => {
    const user = userEvent.setup();
    const onSalvar = vi
      .fn()
      .mockRejectedValue(new Error('Já existe um curso com esse nome nesta edição.'));
    render(<FormCurso inicial={curso} onSalvar={onSalvar} onCancelar={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um curso');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('cancelar não grava nada', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn();
    const onCancelar = vi.fn();
    render(<FormCurso inicial={curso} onSalvar={onSalvar} onCancelar={onCancelar} />);
    await user.type(screen.getByLabelText('Nome do curso'), ' alterado');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('sem curso inicial continua sendo cadastro, sem id e sem cancelar', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(<FormCurso onSalvar={onSalvar} />);
    expect(screen.getByLabelText('Nome do curso')).not.toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome do curso'), 'Curso C');
    await user.type(screen.getByLabelText('Categoria do ranking'), 'Categoria C');
    await user.click(screen.getByRole('button', { name: 'Adicionar curso' }));
    expect(onSalvar).toHaveBeenCalledWith({ nome: 'Curso C', categoria: 'Categoria C' });
  });
});

describe('FormTurma — edição (FR-001)', () => {
  it('abre preenchida e envia id, curso, nome e ano', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(<FormTurma cursos={cursos} inicial={turma} onSalvar={onSalvar} onCancelar={vi.fn()} />);
    expect(screen.getByLabelText('Curso')).toHaveValue('c1');
    expect(screen.getByLabelText('Nome da turma')).toHaveValue('3º A');
    expect(screen.getByLabelText('Ano letivo')).toHaveValue(2026);
    expect(screen.getByLabelText('Curso')).toHaveFocus();

    await user.selectOptions(screen.getByLabelText('Curso'), 'c2');
    await user.clear(screen.getByLabelText('Ano letivo'));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(onSalvar).toHaveBeenCalledWith({
      id: 't1',
      cursoId: 'c2',
      nome: '3º A',
      anoLetivo: null,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Turma atualizada.');
  });

  it('valida o nome também na edição', async () => {
    const user = userEvent.setup();
    const onSalvar = vi.fn();
    render(<FormTurma cursos={cursos} inicial={turma} onSalvar={onSalvar} onCancelar={vi.fn()} />);
    await user.clear(screen.getByLabelText('Nome da turma'));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Informe o nome da turma.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
