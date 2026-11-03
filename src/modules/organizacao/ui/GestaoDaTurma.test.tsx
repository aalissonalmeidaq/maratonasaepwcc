import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Turma, Vinculo } from '../domain/tipos';
import { GestaoDaTurma } from './GestaoDaTurma';

const turma: Turma = { id: 't-a', cursoId: 'c-k', nome: '3º ano A', anoLetivo: null };
const vinculos: Vinculo[] = [
  { id: 'v1', usuarioId: 'u-ana', nome: 'Ana', papel: 'aluno', turmaId: 't-a', ativo: true },
  { id: 'v2', usuarioId: 'u-bia', nome: 'Bia', papel: 'aluno', turmaId: 't-b', ativo: true },
  { id: 'v3', usuarioId: 'u-luc', nome: 'Lúcia', papel: 'docente', turmaId: 't-a', ativo: true },
  {
    id: 'v4',
    usuarioId: 'u-mar',
    nome: 'Mário',
    papel: 'mentor',
    turmaId: 't-a',
    derivado: true,
    ativo: true,
  },
  { id: 'v5', usuarioId: 'u-ex', nome: 'Ex-aluno', papel: 'aluno', turmaId: 't-a', ativo: false },
];

const acoes = () => ({
  onBuscar: vi.fn().mockResolvedValue([{ usuarioId: 'u-caio', nome: 'Caio' }]),
  onVincular: vi.fn().mockResolvedValue(undefined),
  onDesvincular: vi.fn().mockResolvedValue(undefined),
  onCriarConta: vi.fn().mockResolvedValue({ conviteEnviado: true }),
  onImportar: vi.fn(),
});

describe('GestaoDaTurma (US3, FR-007)', () => {
  it('lista alunos, docentes e mentores ativos da turma; mentor aparece "pelo curso"', async () => {
    const { container } = render(
      <GestaoDaTurma turma={turma} vinculos={vinculos} acessos={[]} podeGerir {...acoes()} />,
    );
    const alunos = screen.getByRole('region', { name: 'Alunos' });
    expect(within(alunos).getByText('Ana')).toBeInTheDocument();
    expect(within(alunos).queryByText('Bia')).not.toBeInTheDocument();
    expect(within(alunos).queryByText('Ex-aluno')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Docentes' })).getByText('Lúcia'),
    ).toBeInTheDocument();
    const mentores = screen.getByRole('region', { name: 'Mentores' });
    expect(within(mentores).getByText(/Mário/)).toBeInTheDocument();
    expect(within(mentores).getByText('pelo curso')).toBeInTheDocument();
    expect(within(mentores).queryByRole('button', { name: /Desvincular/ })).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('desvincula e vincula pessoa com conta pela busca, só depois da resposta', async () => {
    const usuario = userEvent.setup();
    const a = acoes();
    render(<GestaoDaTurma turma={turma} vinculos={vinculos} acessos={[]} podeGerir {...a} />);
    await usuario.click(screen.getByRole('button', { name: 'Desvincular Ana' }));
    expect(a.onDesvincular).toHaveBeenCalledWith('v1');
    await usuario.type(screen.getByLabelText('Buscar pessoa pelo nome'), 'cai');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(a.onBuscar).toHaveBeenCalledWith('cai');
    const resultado = await screen.findByRole('listitem', { name: 'Caio' });
    await usuario.selectOptions(within(resultado).getByLabelText('Papel de Caio'), 'docente');
    await usuario.click(within(resultado).getByRole('button', { name: 'Vincular Caio' }));
    expect(a.onVincular).toHaveBeenCalledWith('u-caio', 'docente');
    expect(await screen.findByText('Caio vinculado à turma.')).toBeInTheDocument();
  });

  it('sem permissão de gestão, mostra só as listas', () => {
    render(
      <GestaoDaTurma
        turma={turma}
        vinculos={vinculos}
        acessos={[]}
        podeGerir={false}
        {...acoes()}
      />,
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Desvincular/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Buscar pessoa pelo nome')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Cadastrar aluno' })).not.toBeInTheDocument();
  });
});
