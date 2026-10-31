import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { FormDesafio } from './FormDesafio';

const encontros = [
  { id: 'en1', numero: 1, titulo: 'Encontro 1' },
  { id: 'en4', numero: 4, titulo: 'Encontro 4' },
];
const turmas = [
  { id: 'ta', nome: '3º ano A' },
  { id: 'tb', nome: '3º ano B' },
];

async function preencher() {
  await userEvent.selectOptions(screen.getByLabelText('Encontro'), 'en4');
  await userEvent.type(screen.getByLabelText('Título'), 'Projeto final');
  await userEvent.type(screen.getByLabelText('Enunciado'), 'Construa a solução.');
  await userEvent.type(screen.getByLabelText('Prazo'), '2026-11-20T16:30');
  await userEvent.click(screen.getByLabelText('3º ano A'));
}

describe('FormDesafio (US1, FR-001)', () => {
  it('salva o rascunho e só confirma depois do servidor', async () => {
    let concluir!: (id: string) => void;
    const onSalvar = vi.fn(() => new Promise<string>((r) => (concluir = r)));
    const { container } = render(
      <FormDesafio encontros={encontros} turmas={turmas} onSalvar={onSalvar} />,
    );
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        encontroId: 'en4',
        titulo: 'Projeto final',
        enunciado: 'Construa a solução.',
        turmas: ['ta'],
        aceitaArquivo: true,
        aceitaLink: true,
        prazo: new Date('2026-11-20T16:30').toISOString(),
      }),
    );
    expect(screen.queryByText('Desafio salvo como rascunho.')).not.toBeInTheDocument();
    concluir('d1');
    expect(await screen.findByText('Desafio salvo como rascunho.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('valida título, prazo, turma e forma de entrega antes de enviar', async () => {
    const onSalvar = vi.fn();
    render(<FormDesafio encontros={encontros} turmas={turmas} onSalvar={onSalvar} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Ab');
    await userEvent.click(screen.getByLabelText('Aceita arquivo'));
    await userEvent.click(screen.getByLabelText('Aceita link'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(screen.getByText('Informe um título de 3 a 160 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Informe o prazo.')).toBeInTheDocument();
    expect(screen.getByText('Escolha pelo menos uma turma.')).toBeInTheDocument();
    expect(screen.getByText('Aceite arquivo, link ou ambos.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor', async () => {
    const onSalvar = vi
      .fn()
      .mockRejectedValue(new Error('O desafio já tem entregas e não pode ser editado.'));
    render(<FormDesafio encontros={encontros} turmas={turmas} onSalvar={onSalvar} />);
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('já tem entregas');
  });

  it('bloqueado sem conexão ou na demonstração', () => {
    render(
      <FormDesafio
        encontros={encontros}
        turmas={turmas}
        onSalvar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });
});
