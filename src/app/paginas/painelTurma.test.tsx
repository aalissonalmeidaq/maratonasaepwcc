import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SeletorDeTurma } from './painelTurma';

// O seletor não consulta dados; evita carregar a camada de consultas (e o PWA) no teste.
vi.mock('../dados/consultas', () => ({}));

const turmas = [
  { id: 't1', cursoId: 'c', nome: '3º ano A', anoLetivo: null },
  { id: 't2', cursoId: 'c', nome: '3º ano B', anoLetivo: null },
];

const renderizar = (atual: string) =>
  render(
    <MemoryRouter>
      <SeletorDeTurma turmas={turmas} atual={atual} base="/docente/turmas" />
    </MemoryRouter>,
  );

describe('SeletorDeTurma (spec 004, casos de borda)', () => {
  it('indica a turma aberta', () => {
    renderizar('t2');
    expect(screen.getByLabelText('Trocar de turma')).toHaveValue('t2');
  });

  it('turma fora da lista: não finge outra turma selecionada', () => {
    renderizar('t-de-outra-edicao');
    const campo = screen.getByLabelText('Trocar de turma');
    expect(campo).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Escolha uma turma' })).toBeInTheDocument();
  });

  it('com uma turma só, não aparece', () => {
    render(
      <MemoryRouter>
        <SeletorDeTurma turmas={turmas.slice(0, 1)} atual="t1" base="/docente/turmas" />
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText('Trocar de turma')).not.toBeInTheDocument();
  });
});
