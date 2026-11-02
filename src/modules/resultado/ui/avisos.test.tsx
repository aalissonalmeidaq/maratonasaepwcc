import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Aviso } from '../domain/tipos';
import { ContadorAvisos } from './ContadorAvisos';
import { ListaAvisos } from './ListaAvisos';

const avisos: Aviso[] = [
  {
    id: 'a1',
    tipo: 'ocorrencia_registrada',
    titulo: 'Nova ocorrência registrada para a sua equipe',
    referencia: {},
    criadoEm: '2026-11-01T15:00:00Z',
    lidoEm: null,
  },
  {
    id: 'a2',
    tipo: 'ranking_publicado',
    titulo: 'Ranking parcial publicado',
    referencia: {},
    criadoEm: '2026-10-31T15:00:00Z',
    lidoEm: '2026-10-31T16:00:00Z',
  },
];

describe('ContadorAvisos (FR-026)', () => {
  it('rótulo acessível com a quantidade de não lidos', async () => {
    const { container } = render(
      <MemoryRouter>
        <ContadorAvisos naoLidos={3} caminho="/aluno/avisos" />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: '3 avisos não lidos' });
    expect(link).toHaveAttribute('href', '/aluno/avisos');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('singular e nenhum aviso', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ContadorAvisos naoLidos={1} caminho="/a" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: '1 aviso não lido' })).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <ContadorAvisos naoLidos={0} caminho="/a" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Avisos: nenhum não lido' })).toBeInTheDocument();
  });
});

describe('ListaAvisos (FR-026)', () => {
  it('marca como lido só depois da resposta do servidor', async () => {
    let concluir!: () => void;
    const onMarcar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(<ListaAvisos avisos={avisos} onMarcar={onMarcar} />);
    expect(screen.getByText('Não lido')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Marcar como lido: Nova ocorrência registrada para a sua equipe',
      }),
    );
    expect(onMarcar).toHaveBeenCalledWith(['a1']);
    expect(screen.queryByText('Aviso marcado como lido.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Aviso marcado como lido.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem conexão ou na demonstração: marcar desabilitado com o motivo', () => {
    render(
      <ListaAvisos
        avisos={avisos}
        onMarcar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: /Marcar como lido/ })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });

  it('sem avisos: estado vazio', () => {
    render(<ListaAvisos avisos={[]} onMarcar={vi.fn()} />);
    expect(screen.getByText('Nenhum aviso por enquanto.')).toBeInTheDocument();
  });
});
