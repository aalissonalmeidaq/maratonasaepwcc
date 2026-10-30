import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type ValorAuth } from '@/modules/auth';
import { AlunoInicioPage } from './aluno';

// A contagem vem do servidor; aqui só interessa como o painel a apresenta (FR-016).
vi.mock('../dados/consultas', () => ({ useConvitesPendentes: () => 2 }));

describe('Painel inicial do aluno', () => {
  it('mantém o título e orienta o estudante sem dados de demonstração', () => {
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
    expect(screen.getByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument();
    expect(screen.getByText(/procure seu docente ou a coordenação/i)).toBeInTheDocument();
    expect(screen.getByText('Você tem 2 convites pendentes.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver convites de equipe' })).toHaveAttribute(
      'href',
      '/aluno/dupla',
    );
    expect(container).not.toHaveTextContent(/Supabase|Incremento 2|170,5|Ana Exemplo/);
  });
});
