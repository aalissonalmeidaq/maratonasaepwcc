import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Curso, Turma, Vinculo } from '../domain/tipos';
import { MentoresDoCurso } from './MentoresDoCurso';

const cursos: Curso[] = [
  { id: 'c-k', edicaoId: 'e', nome: 'Informática', categoria: 'A' },
  { id: 'c-l', edicaoId: 'e', nome: 'Logística', categoria: 'B' },
];
const turmas: Turma[] = [
  { id: 't-a', cursoId: 'c-k', nome: 'A', anoLetivo: null },
  { id: 't-b', cursoId: 'c-k', nome: 'B', anoLetivo: null },
];
const vinculos: Vinculo[] = [
  {
    id: 'm1',
    usuarioId: 'u-mar',
    nome: 'Mário',
    papel: 'mentor',
    turmaId: null,
    cursoId: 'c-k',
    ativo: true,
  },
  {
    id: 'm2',
    usuarioId: 'u-mar',
    nome: 'Mário',
    papel: 'mentor',
    turmaId: 't-a',
    derivado: true,
    ativo: true,
  },
  {
    id: 'm3',
    usuarioId: 'u-ex',
    nome: 'Antigo',
    papel: 'mentor',
    turmaId: null,
    cursoId: 'c-k',
    ativo: false,
  },
];

describe('MentoresDoCurso (US4, FR-008)', () => {
  it('mostra os mentores ativos por curso com a explicação; curso sem turma não aparece', async () => {
    const { container } = render(
      <MentoresDoCurso
        cursos={cursos}
        turmas={turmas}
        vinculos={vinculos}
        onBuscar={vi.fn()}
        onVincular={vi.fn()}
        onDesvincular={vi.fn()}
      />,
    );
    const info = screen.getByRole('region', { name: 'Informática' });
    expect(within(info).getByText('Mário')).toBeInTheDocument();
    expect(within(info).queryByText('Antigo')).not.toBeInTheDocument();
    expect(
      within(info).getByText('O mentor atua em todas as turmas deste curso nesta edição.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Logística' })).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('vincula pela busca e desvincula do curso', async () => {
    const usuario = userEvent.setup();
    const onBuscar = vi.fn().mockResolvedValue([{ usuarioId: 'u-ze', nome: 'Zé' }]);
    const onVincular = vi.fn().mockResolvedValue(undefined);
    const onDesvincular = vi.fn().mockResolvedValue(undefined);
    render(
      <MentoresDoCurso
        cursos={cursos}
        turmas={turmas}
        vinculos={vinculos}
        onBuscar={onBuscar}
        onVincular={onVincular}
        onDesvincular={onDesvincular}
      />,
    );
    const info = screen.getByRole('region', { name: 'Informática' });
    await usuario.click(within(info).getByRole('button', { name: 'Desvincular Mário do curso' }));
    expect(onDesvincular).toHaveBeenCalledWith('c-k', 'u-mar');
    await usuario.type(within(info).getByLabelText('Buscar mentor pelo nome'), 'z');
    await usuario.click(within(info).getByRole('button', { name: 'Buscar' }));
    await usuario.click(await within(info).findByRole('button', { name: 'Vincular Zé ao curso' }));
    expect(onVincular).toHaveBeenCalledWith('c-k', 'u-ze');
    expect(await within(info).findByText('Zé vinculado ao curso.')).toBeInTheDocument();
  });
});
