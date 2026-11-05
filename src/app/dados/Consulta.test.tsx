import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { Consulta } from './Consulta';
vi.mock('@/shared/pwa/useOnline', () => ({ useOnline: () => false }));
function Tela() {
  const consulta = useQuery({
    queryKey: ['teste'],
    queryFn: () => Promise.resolve('dados'),
    enabled: false,
  });
  return <Consulta consulta={consulta}>{(d) => <p>{d}</p>}</Consulta>;
}
describe('consulta offline (FR-008)', () => {
  it('não deixa spinner infinito sem dados e mantém dados já carregados', () => {
    const cliente = new QueryClient();
    const { unmount } = render(
      <QueryClientProvider client={cliente}>
        <Tela />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText('Sem conexão: esta tela precisa de internet para carregar.'),
    ).toBeInTheDocument();
    unmount();
    cliente.setQueryData(['teste'], 'dados');
    render(
      <QueryClientProvider client={cliente}>
        <Tela />
      </QueryClientProvider>,
    );
    expect(screen.getByText('dados')).toBeInTheDocument();
  });
});
