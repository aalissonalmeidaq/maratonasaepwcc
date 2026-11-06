import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { premissa, resposta } from '@/test/fixtures/premissas';
import { AvisoDePremissas } from './master';

let premissas = [premissa({ codigo: 'P09' }), premissa({ codigo: 'P10' })];
vi.mock('../dados/consultas', () => ({
  useBloqueioDeEscrita: () => ({}),
  useGravar: () => (f: () => unknown) => f,
  useMasters: () => ({ isPending: false, isError: false, data: [] }),
  useUnidades: () => ({ isPending: false, isError: false, data: [] }),
  usePremissas: () => ({
    isPending: false,
    isError: false,
    data: { podeResponder: true, premissas },
  }),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AvisoDePremissas />
    </MemoryRouter>,
  );
}

describe('início do master: premissas aguardando resposta (spec 015, FR-005; spec 016, FR-013)', () => {
  it('mostra quantas aguardam e leva à tela', () => {
    renderizar();
    expect(screen.getByText('Premissas aguardando resposta: 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver premissas' })).toHaveAttribute(
      'href',
      '/master/premissas',
    );
  });

  it('some quando nenhuma aguarda resposta', () => {
    premissas = [premissa({ codigo: 'P09', historico: [resposta()] })];
    const { container } = renderizar();
    expect(container).toBeEmptyDOMElement();
  });
});
