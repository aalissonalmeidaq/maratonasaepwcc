import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { EdicaoDaUnidade, MembroDaUnidade } from '@/modules/rede';
import { violacoesA11y } from '@/test/a11y';
import { GestaoInicioPage } from './gestao';

const membro = (
  usuarioId: string,
  funcoes: MembroDaUnidade['funcoes'],
  ativo = true,
): MembroDaUnidade => ({
  usuarioId,
  nome: `Pessoa ${usuarioId}`,
  email: `${usuarioId}@exemplo.invalid`,
  funcoes,
  situacaoAcesso: 'ativo',
  ativo,
});

const equipe: MembroDaUnidade[] = [
  membro('g', ['gestao']),
  membro('c1', ['coordenacao']),
  membro('c2', ['coordenacao']),
  membro('c3', ['coordenacao'], false),
  membro('d1', ['docente', 'mentor']),
  membro('a1', ['analista']),
];

const edicoes: EdicaoDaUnidade[] = [
  {
    id: 'e1',
    nome: 'Edição ativa',
    inicio: null,
    fim: null,
    estado: 'ativa',
    coordenacao: [{ usuarioId: 'c1', nome: 'Pessoa c1', ativa: true }],
  },
  {
    id: 'e2',
    nome: 'Edição sem dono',
    inicio: null,
    fim: null,
    estado: 'rascunho',
    coordenacao: [{ usuarioId: 'c3', nome: 'Pessoa c3', ativa: false }],
  },
  {
    id: 'e3',
    nome: 'Edição antiga',
    inicio: null,
    fim: null,
    estado: 'encerrada',
    coordenacao: [],
  },
];

const consulta = <T,>(data: T) => ({ isPending: false, isError: false, data });
vi.mock('../dados/consultas', () => ({
  useEquipeDaUnidade: () => consulta(equipe),
  useEdicoesDaUnidade: () => consulta(edicoes),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <GestaoInicioPage />
    </MemoryRouter>,
  );
}

describe('início da gestão (spec 016)', () => {
  it('resumo da equipe: só contas ativas, por função', () => {
    renderizar();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Gestão da unidade' }),
    ).toBeInTheDocument();
    const valor = (rotulo: string) => screen.getByText(rotulo).closest('div');
    expect(valor('Coordenação')).toHaveTextContent('2');
    expect(valor('Docentes')).toHaveTextContent('1');
    expect(valor('Mentores')).toHaveTextContent('1');
    expect(valor('Analistas')).toHaveTextContent('1');
  });

  it('resumo das edições por estado', () => {
    renderizar();
    const valor = (rotulo: string) => screen.getByText(rotulo).closest('div');
    expect(valor('Ativas')).toHaveTextContent('1');
    expect(valor('Em preparação')).toHaveTextContent('1');
    expect(valor('Encerradas')).toHaveTextContent('1');
  });

  it('avisa das edições sem coordenação ativa, com link para resolver', () => {
    renderizar();
    const lista = screen.getByRole('list', { name: 'Edições sem coordenação ativa' });
    expect(lista).toHaveTextContent('Edição sem dono');
    expect(lista).not.toHaveTextContent('Edição ativa');
    expect(lista).not.toHaveTextContent('Edição antiga');
    expect(screen.getByRole('link', { name: 'Indicar a coordenação' })).toHaveAttribute(
      'href',
      '/gestao/edicoes',
    );
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
