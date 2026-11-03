import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { FormComunicado } from './FormComunicado';

const turmas = [
  { id: 't-a', nome: '3º ano A' },
  { id: 't-b', nome: '3º ano B' },
];

describe('FormComunicado (US1, FR-001, FR-002, FR-017)', () => {
  it('publica só depois da resposta do servidor, com o público e as turmas escolhidos', async () => {
    const usuario = userEvent.setup();
    let concluir!: () => void;
    const onSalvar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormComunicado perfil="docente" turmas={turmas} onSalvar={onSalvar} />,
    );
    expect(
      screen.getByText(/Não inclua dados pessoais de estudantes no texto/),
    ).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Título'), 'Mudança de sala');
    await usuario.type(screen.getByLabelText('Texto'), 'Laboratório 2.');
    expect(screen.getByText('14 de 5.000 caracteres')).toBeInTheDocument();
    await usuario.click(screen.getByRole('radio', { name: 'Estudantes' }));
    await usuario.click(screen.getByRole('checkbox', { name: '3º ano A' }));
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(onSalvar).toHaveBeenCalledWith(
      {
        titulo: 'Mudança de sala',
        texto: 'Laboratório 2.',
        publico: 'estudantes',
        turmaIds: ['t-a'],
      },
      true,
    );
    expect(screen.queryByText('Comunicado publicado.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Comunicado publicado.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('guarda rascunho com a mensagem própria', async () => {
    const usuario = userEvent.setup();
    const onSalvar = vi.fn(() => Promise.resolve());
    render(<FormComunicado perfil="coordenacao" turmas={turmas} onSalvar={onSalvar} />);
    await usuario.type(screen.getByLabelText('Título'), 'Aviso geral');
    await usuario.type(screen.getByLabelText('Texto'), 'Para todos.');
    await usuario.click(screen.getByRole('radio', { name: 'Todos' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar rascunho' }));
    expect(onSalvar).toHaveBeenCalledWith(
      { titulo: 'Aviso geral', texto: 'Para todos.', publico: 'todos', turmaIds: [] },
      false,
    );
    expect(await screen.findByText('Rascunho guardado.')).toBeInTheDocument();
  });

  it('mostra as mensagens de campo e não envia (docente sem turma)', async () => {
    const usuario = userEvent.setup();
    const onSalvar = vi.fn();
    render(<FormComunicado perfil="docente" turmas={turmas} onSalvar={onSalvar} />);
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(screen.getByText('Informe o título.')).toBeInTheDocument();
    expect(screen.getByText('Escreva o texto.')).toBeInTheDocument();
    expect(screen.getByText('Escolha o público.')).toBeInTheDocument();
    expect(screen.getByText('Escolha pelo menos uma turma.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('a coordenação vê que sem turma o comunicado vale para a edição inteira', () => {
    render(<FormComunicado perfil="coordenacao" turmas={turmas} onSalvar={vi.fn()} />);
    expect(screen.getByText(/Sem turma marcada, vale para a edição inteira/)).toBeInTheDocument();
  });

  it('recusa do servidor aparece e nada é dado como publicado', async () => {
    const usuario = userEvent.setup();
    const onSalvar = vi.fn(() =>
      Promise.reject(new Error('Você só publica para as turmas em que atua.')),
    );
    render(
      <FormComunicado
        perfil="docente"
        turmas={turmas}
        onSalvar={onSalvar}
        inicial={{ titulo: 'T', texto: 'X', publico: 'estudantes', turmaIds: ['t-b'] }}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(
      await screen.findByText('Você só publica para as turmas em que atua.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Comunicado publicado.')).not.toBeInTheDocument();
  });

  it('sem conexão ou na demonstração: botões desabilitados com o motivo', () => {
    render(
      <FormComunicado
        perfil="coordenacao"
        turmas={turmas}
        onSalvar={vi.fn()}
        bloqueio="Indisponível no modo demonstração: nenhuma alteração é gravada."
      />,
    );
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar rascunho' })).toBeDisabled();
    expect(screen.getByText(/modo demonstração/)).toBeInTheDocument();
  });
});
