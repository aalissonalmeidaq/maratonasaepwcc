import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type ValorAuth } from '@/modules/auth';
import type { EdicaoDaUnidade } from '@/modules/rede';
import type { PainelDaCoordenacao } from '@/modules/relatorios';
import { violacoesA11y } from '@/test/a11y';
import { AnalistaInicioPage } from './analista';

const edicoes: EdicaoDaUnidade[] = [
  {
    id: 'e0',
    nome: 'Edição antiga',
    inicio: null,
    fim: null,
    estado: 'encerrada',
    coordenacao: [],
  },
  { id: 'e1', nome: 'Edição ativa', inicio: null, fim: null, estado: 'ativa', coordenacao: [] },
  {
    id: 'e2',
    nome: 'Edição em preparação',
    inicio: null,
    fim: null,
    estado: 'rascunho',
    coordenacao: [],
  },
];

const painel: PainelDaCoordenacao = {
  indicadores: {
    cursos: 1,
    turmas: 1,
    equipes: 2,
    estudantes: 4,
    encontrosRealizados: 1,
    encontrosTotal: 3,
  },
  turmas: [
    {
      turmaId: 't1',
      turma: '3º ano A',
      categoria: 'Categoria A',
      componentesPendentes: 1,
      provasPendentes: 0,
      ocorrenciasSemDecisao: 0,
      revisoesAbertas: 0,
      publicacao: null,
    },
  ],
};

const consulta = <T,>(data: T) => ({ isPending: false, isError: false, data });
const usePainel = vi.fn((id?: string) => ({ ...consulta(painel), id }));
let lista: EdicaoDaUnidade[] = edicoes;
// A exportação (CSV) é coberta pelos testes do FormRelatorio; aqui só importa o painel.
vi.mock('./relatorios', () => ({ Exportacao: () => null }));
vi.mock('../dados/consultas', () => ({
  useEdicoesDaUnidade: () => consulta(lista),
  usePainelDaCoordenacao: (id?: string) => usePainel(id),
}));

const auth: ValorAuth = {
  modo: 'supabase',
  carregando: false,
  sessao: { usuarioId: 'a1', nome: 'Analista', papeis: [], funcoes: ['analista'], demo: false },
  entrar: vi.fn(),
  entrarDemo: null,
  sair: vi.fn(),
};

function renderizar() {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <AnalistaInicioPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  lista = edicoes;
  usePainel.mockClear();
});

describe('início do analista (spec 016, FR-006a)', () => {
  it('abre na edição ativa e mostra o painel só para leitura, sem links de ação', () => {
    renderizar();
    expect(screen.getByLabelText('Edição')).toHaveValue('e1');
    expect(usePainel).toHaveBeenLastCalledWith('e1');
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
    expect(screen.getByText('Edição ativa', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('troca de edição pelo seletor', async () => {
    renderizar();
    await userEvent.selectOptions(screen.getByLabelText('Edição'), 'e0');
    expect(usePainel).toHaveBeenLastCalledWith('e0');
  });

  it('sem edições na unidade: mensagem, sem painel', () => {
    lista = [];
    renderizar();
    expect(screen.getByText('Nenhuma edição na unidade.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Visão geral' })).not.toBeInTheDocument();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
