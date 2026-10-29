import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Papel } from '@/modules/acesso';
import { AuthContext, type ValorAuth } from './AuthContext';
import { RedirecionarParaPainel, RotaProtegida } from './RotaProtegida';

function contexto(papeis: Papel[] | null, carregando = false): ValorAuth {
  return {
    modo: 'demo',
    carregando,
    sessao: papeis && { usuarioId: 'u1', nome: 'Pessoa Fictícia', papeis, demo: true },
    entrar: vi.fn(),
    entrarDemo: vi.fn(),
    sair: vi.fn(),
  };
}

function renderizar(valor: ValorAuth, url: string) {
  return render(
    <AuthContext.Provider value={valor}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/entrar" element={<p>Tela de entrada</p>} />
          <Route path="/" element={<RedirecionarParaPainel />} />
          <Route element={<RotaProtegida area="coordenacao" />}>
            <Route path="/coordenacao" element={<p>Dados da coordenação</p>} />
          </Route>
          <Route element={<RotaProtegida area="aluno" />}>
            <Route path="/aluno" element={<p>Painel do aluno</p>} />
          </Route>
          <Route element={<RotaProtegida area="docente" />}>
            <Route path="/docente" element={<p>Painel docente</p>} />
          </Route>
          <Route path="/aguardando-permissao" element={<p>Aguardando permissão</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RotaProtegida (US1)', () => {
  it('pessoa não autenticada é levada à tela de entrada', () => {
    renderizar(contexto(null), '/coordenacao');
    expect(screen.getByText('Tela de entrada')).toBeInTheDocument();
    expect(screen.queryByText('Dados da coordenação')).not.toBeInTheDocument();
  });

  it('aluno não vê dados da coordenação e recebe link para o próprio painel', () => {
    renderizar(contexto(['aluno']), '/coordenacao');
    expect(screen.getByRole('heading', { name: /acesso não autorizado/i })).toBeInTheDocument();
    expect(screen.queryByText('Dados da coordenação')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir para o meu painel/i })).toHaveAttribute(
      'href',
      '/aluno',
    );
  });

  it('enquanto a sessão carrega, não mostra conteúdo protegido', () => {
    renderizar(contexto(null, true), '/coordenacao');
    expect(screen.getByText(/verificando acesso/i)).toBeInTheDocument();
    expect(screen.queryByText('Dados da coordenação')).not.toBeInTheDocument();
  });

  it('perfil autorizado acessa a área', () => {
    renderizar(contexto(['mentor']), '/docente');
    expect(screen.getByText('Painel docente')).toBeInTheDocument();
  });

  it('a raiz redireciona para o painel do perfil', () => {
    renderizar(contexto(['coordenacao']), '/');
    expect(screen.getByText('Dados da coordenação')).toBeInTheDocument();
  });

  it('apoio sem permissão atribuída aguarda a coordenação', () => {
    renderizar(contexto(['apoio']), '/');
    expect(screen.getByText('Aguardando permissão')).toBeInTheDocument();
  });
});
