import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type ValorAuth } from '@/modules/auth';
import type { Sessao } from '@/modules/auth';
import { violacoesA11y } from '@/test/a11y';
import { TrocarDeArea } from './TrocarDeArea';

function renderizar(
  sessao: Sessao | null,
  areaAtual: Parameters<typeof TrocarDeArea>[0]['areaAtual'],
) {
  const auth: ValorAuth = {
    modo: 'demo',
    carregando: false,
    sessao,
    entrar: vi.fn(),
    entrarDemo: vi.fn(),
    sair: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <TrocarDeArea areaAtual={areaAtual} fundo="escuro" />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const base = { usuarioId: 'u1', nome: 'Pessoa', demo: true } as const;

describe('Trocar de área (spec 016, FR-006b)', () => {
  it('conta com gestão e coordenação vê o link da outra área', () => {
    renderizar(
      {
        ...base,
        papeis: ['coordenacao'],
        funcoes: ['gestao', 'coordenacao'],
        unidade: { id: 'un', nome: 'Unidade', ativa: true },
      },
      'gestao',
    );
    const nav = screen.getByRole('navigation', { name: 'Trocar de área' });
    expect(nav).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Coordenação' });
    expect(link).toHaveAttribute('href', '/coordenacao');
    expect(screen.queryByRole('link', { name: 'Gestão da unidade' })).not.toBeInTheDocument();
  });

  it('conta com uma área só não mostra nada', () => {
    const { container } = renderizar({ ...base, papeis: ['aluno'] }, 'aluno');
    expect(container).toBeEmptyDOMElement();
  });

  it('sem sessão não mostra nada', () => {
    const { container } = renderizar(null, 'aluno');
    expect(container).toBeEmptyDOMElement();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar({ ...base, papeis: ['docente', 'aluno'] }, 'docente');
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
