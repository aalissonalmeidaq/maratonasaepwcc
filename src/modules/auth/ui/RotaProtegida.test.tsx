import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Papel } from '@/modules/acesso';
import type { Sessao } from '../domain/sessao';
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

function contextoDaSessao(extra: Partial<Sessao>): ValorAuth {
  return {
    ...contexto([]),
    sessao: { usuarioId: 'u1', nome: 'Pessoa Fictícia', papeis: [], demo: true, ...extra },
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
          <Route element={<RotaProtegida area="master" />}>
            <Route path="/master" element={<p>Rede do master</p>} />
          </Route>
          <Route element={<RotaProtegida area="gestao" />}>
            <Route path="/gestao" element={<p>Gestão da unidade</p>} />
          </Route>
          <Route path="/unidade-desativada" element={<p>Unidade desativada</p>} />
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

describe('RotaProtegida: master, gestão e unidade desativada (spec 016)', () => {
  it('master abre a rede e a raiz o leva a ela', () => {
    renderizar(contextoDaSessao({ master: true, unidade: null }), '/master');
    expect(screen.getByText('Rede do master')).toBeInTheDocument();
  });

  it('a raiz leva o master ao painel da rede', () => {
    renderizar(contextoDaSessao({ master: true, unidade: null }), '/');
    expect(screen.getByText('Rede do master')).toBeInTheDocument();
  });

  it('coordenação não abre a rede do master nem a gestão', () => {
    const coordenacao = contextoDaSessao({
      papeis: ['coordenacao'],
      funcoes: ['coordenacao'],
      unidade: { id: 'un', nome: 'Unidade', ativa: true },
    });
    renderizar(coordenacao, '/master');
    expect(screen.getByRole('heading', { name: /acesso não autorizado/i })).toBeInTheDocument();
    expect(screen.queryByText('Rede do master')).not.toBeInTheDocument();
  });

  it('gestão abre a área da gestão por função, sem papel em edição', () => {
    renderizar(
      contextoDaSessao({
        funcoes: ['gestao'],
        unidade: { id: 'un', nome: 'Unidade', ativa: true },
      }),
      '/gestao',
    );
    expect(screen.getByText('Gestão da unidade')).toBeInTheDocument();
  });

  it('conta de unidade desativada vai para a página própria, em qualquer área', () => {
    const desativada = contextoDaSessao({
      papeis: ['coordenacao'],
      unidade: { id: 'un', nome: 'Unidade', ativa: false },
    });
    renderizar(desativada, '/coordenacao');
    expect(screen.queryByText('Dados da coordenação')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir para o meu painel/i })).toHaveAttribute(
      'href',
      '/unidade-desativada',
    );
  });

  it('a raiz leva a conta de unidade desativada à página própria', () => {
    renderizar(
      contextoDaSessao({ papeis: ['aluno'], unidade: { id: 'un', nome: 'Unidade', ativa: false } }),
      '/',
    );
    expect(screen.getByText('Unidade desativada')).toBeInTheDocument();
  });
});
