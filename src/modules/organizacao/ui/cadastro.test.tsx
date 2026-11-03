import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { CursoDoCadastro } from '../domain/cadastro';
import type { Turma } from '../domain/tipos';
import { CadastroCursosTurmas } from './CadastroCursosTurmas';
import { VincularTurmas } from './VincularTurmas';

const cadastro: CursoDoCadastro[] = [
  {
    id: 'k',
    nome: 'Informática',
    categoria: 'Categoria A',
    turmas: [
      {
        id: 'ka',
        nome: 'A',
        anoLetivo: null,
        edicoes: [{ id: 'e1', nome: 'Maratona 2026', estado: 'ativa' }],
      },
      { id: 'kb', nome: 'B', anoLetivo: 2027, edicoes: [] },
    ],
  },
  { id: 'l', nome: 'Logística', categoria: 'Categoria B', turmas: [] },
];

describe('CadastroCursosTurmas (US2, FR-004)', () => {
  it('mostra cursos, turmas e edições; apagar só aparece para quem nunca participou', async () => {
    const { container } = render(
      <CadastroCursosTurmas
        cadastro={cadastro}
        onSalvarCurso={vi.fn()}
        onSalvarTurma={vi.fn()}
        onApagar={vi.fn()}
      />,
    );
    const info = screen.getByRole('region', { name: 'Informática' });
    expect(within(info).getByText('Categoria A')).toBeInTheDocument();
    expect(within(info).getByText('Maratona 2026 — Ativa')).toBeInTheDocument();
    expect(within(info).getByText('Nenhuma edição')).toBeInTheDocument();
    expect(
      within(info).queryByRole('button', { name: 'Apagar a turma A' }),
    ).not.toBeInTheDocument();
    expect(within(info).getByRole('button', { name: 'Apagar a turma B' })).toBeInTheDocument();
    expect(
      within(info).queryByRole('button', { name: 'Apagar o curso Informática' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apagar o curso Logística' })).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('cria curso e turma pelo cadastro', async () => {
    const usuario = userEvent.setup();
    const onSalvarCurso = vi.fn().mockResolvedValue('m');
    const onSalvarTurma = vi.fn().mockResolvedValue('ma');
    render(
      <CadastroCursosTurmas
        cadastro={cadastro}
        onSalvarCurso={onSalvarCurso}
        onSalvarTurma={onSalvarTurma}
        onApagar={vi.fn()}
      />,
    );
    const novoCurso = screen.getByRole('region', { name: 'Novo curso' });
    await usuario.type(within(novoCurso).getByLabelText('Nome do curso'), 'Mecânica');
    await usuario.type(within(novoCurso).getByLabelText('Categoria do ranking'), 'Categoria C');
    await usuario.click(within(novoCurso).getByRole('button', { name: 'Adicionar curso' }));
    expect(onSalvarCurso).toHaveBeenCalledWith(null, 'Mecânica', 'Categoria C');
    const novaTurma = screen.getByRole('region', { name: 'Nova turma' });
    await usuario.selectOptions(within(novaTurma).getByLabelText('Curso'), 'l');
    await usuario.type(within(novaTurma).getByLabelText('Nome da turma'), 'A');
    await usuario.click(within(novaTurma).getByRole('button', { name: 'Adicionar turma' }));
    expect(onSalvarTurma).toHaveBeenCalledWith(null, 'l', 'A', null);
  });
});

const turmasDaEdicao: Turma[] = [
  { id: 't-a', cursoId: 'c-k', nome: 'A', anoLetivo: null, cadastroTurmaId: 'ka' },
];

describe('VincularTurmas (US2, FR-005, SC-002)', () => {
  it('vincula as turmas marcadas do cadastro e lista as vinculadas com link para gerir', async () => {
    const usuario = userEvent.setup();
    const onVincular = vi.fn().mockResolvedValue([]);
    const { container } = render(
      <MemoryRouter>
        <VincularTurmas
          cadastro={cadastro}
          turmasDaEdicao={turmasDaEdicao}
          contagens={{ 't-a': { alunos: 2, docentes: 1 } }}
          onVincular={onVincular}
          onDesvincular={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('checkbox', { name: 'A (Informática) — já vinculada' })).toBeDisabled();
    await usuario.click(screen.getByRole('checkbox', { name: 'B (Informática)' }));
    await usuario.click(screen.getByRole('button', { name: 'Vincular selecionadas' }));
    expect(onVincular).toHaveBeenCalledWith(['kb']);
    expect(await screen.findByText('Turmas vinculadas.')).toBeInTheDocument();
    expect(screen.getByText('2 alunos · 1 docente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gerir turma A' })).toHaveAttribute(
      'href',
      '/coordenacao/turmas/t-a',
    );
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('em edição ativa com correções no cadastro, oferece atualizar', async () => {
    const usuario = userEvent.setup();
    const onAtualizar = vi.fn().mockResolvedValue({ cursos: 1, turmas: 0 });
    render(
      <MemoryRouter>
        <VincularTurmas
          cadastro={cadastro}
          turmasDaEdicao={turmasDaEdicao}
          contagens={{}}
          correcoesPendentes={['Curso “Info” → “Informática”']}
          onAtualizar={onAtualizar}
          onVincular={vi.fn()}
          onDesvincular={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('O cadastro tem correções de nome ou categoria para esta edição'),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Atualizar a partir do cadastro' }));
    expect(onAtualizar).toHaveBeenCalled();
  });
});
