import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type ValorAuth } from '@/modules/auth';
import type { PainelDoAluno } from '@/modules/relatorios';
import { AlunoInicioPage } from './aluno';

const painel: PainelDoAluno = {
  equipe: { id: 'd1', nome: 'Equipe Real' },
  previa: { total: 42, pendente: false },
  ranking: null,
  proximoEncontro: null,
  proximoPrazo: null,
  acoes: [],
  avisosNaoLidos: 0,
};

// Os números vêm do servidor; aqui só interessa como a página os apresenta (FR-001, FR-016).
const consulta = <T,>(data: T) => ({ isPending: false, isError: false, data });
vi.mock('../dados/consultas', () => ({
  useConvitesPendentes: () => 2,
  useEdicaoAtual: () => consulta({ id: 'ed', nome: 'Edição', estado: 'ativa' }),
  usePainelDoAluno: () => consulta(painel),
}));

describe('Painel inicial do aluno', () => {
  it('usa o painel do servidor, sem dados de demonstração', () => {
    const auth: ValorAuth = {
      modo: 'supabase',
      carregando: false,
      sessao: { usuarioId: 'e01', nome: 'Ana', papeis: ['aluno'], demo: false },
      entrar: vi.fn(),
      entrarDemo: null,
      sair: vi.fn(),
    };
    const { container } = render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <AlunoInicioPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Olá, Ana!' })).toBeInTheDocument();
    expect(screen.getByText('Equipe Equipe Real')).toBeInTheDocument();
    expect(screen.getByText('42 pontos')).toBeInTheDocument();
    expect(screen.getByText('Você tem 2 convites pendentes.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver convites de equipe' })).toHaveAttribute(
      'href',
      '/aluno/dupla',
    );
    expect(screen.queryByText('Dados fictícios')).not.toBeInTheDocument();
    // A tela inicial é um painel de indicadores; a navegação fica no menu.
    expect(screen.queryByRole('navigation', { name: 'Acesso rápido' })).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Supabase|170,5|Ana Exemplo|indisponíveis/);
  });
});
