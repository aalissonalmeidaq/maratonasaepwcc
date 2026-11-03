import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PainelDaGestao } from '../domain/tipos';
import { PainelGestao } from './PainelGestao';

const painel: PainelDaGestao = {
  proximoEncontro: {
    id: 'en2',
    numero: 2,
    titulo: 'Desafio prático',
    data: '2026-11-09',
    inicio: null,
  },
  turmas: [
    {
      id: 't-a',
      nome: '3º ano A',
      categoria: 'Categoria A',
      equipes: 4,
      equipesPendentes: 2,
      pendencias: [
        {
          tipo: 'presenca',
          encontroNumero: 1,
          descricao: 'Presença não registrada: 3 estudantes',
          caminho: '/docente/presenca',
        },
        {
          tipo: 'avaliacao',
          encontroNumero: 1,
          descricao: 'Entrega sem avaliação — Dupla Órbita, Desafio 1',
          caminho: '/docente/avaliacoes',
        },
      ],
    },
    {
      id: 't-b',
      nome: '3º ano B',
      categoria: 'Categoria B',
      equipes: 2,
      equipesPendentes: 0,
      pendencias: [],
    },
  ],
};

const renderizar = (p: PainelDaGestao, ficticio = false) =>
  render(
    <MemoryRouter>
      <PainelGestao painel={p} nome="Lúcia" ficticio={ficticio} />
    </MemoryRouter>,
  );

describe('PainelGestao (US2, FR-003, FR-005)', () => {
  it('por turma: equipes com pendência e a lista de pendências com links de ação', async () => {
    const { container } = renderizar(painel);
    expect(screen.getByRole('heading', { level: 1, name: 'Olá, Lúcia!' })).toBeInTheDocument();
    // Indicadores do topo, somados das turmas em que a pessoa atua.
    const indicadores = screen.getByRole('region', { name: 'Indicadores' });
    expect(
      within(within(indicadores).getByRole('region', { name: 'Turmas' })).getByText('2'),
    ).toBeInTheDocument();
    expect(
      within(within(indicadores).getByRole('region', { name: 'Equipes com pendência' })).getByText(
        '2 de 6',
      ),
    ).toBeInTheDocument();
    expect(
      within(within(indicadores).getByRole('region', { name: 'Pendências de registro' })).getByText(
        '2',
      ),
    ).toBeInTheDocument();
    // Cada turma leva direto ao painel dela (SC-001 da spec 004, sem passar por atalhos).
    expect(
      within(screen.getByRole('region', { name: '3º ano A' })).getByRole('link', {
        name: 'Abrir painel da turma 3º ano A',
      }),
    ).toHaveAttribute('href', '/docente/turmas/t-a');
    expect(
      within(screen.getByRole('region', { name: 'Próximo encontro' })).getByText(
        '2. Desafio prático',
      ),
    ).toBeInTheDocument();

    const turmaA = screen.getByRole('region', { name: '3º ano A' });
    expect(within(turmaA).getByText('2 de 4 equipes com pendência')).toBeInTheDocument();
    expect(
      within(turmaA).getByRole('link', { name: /Presença não registrada: 3 estudantes/ }),
    ).toHaveAttribute('href', '/docente/presenca');
    expect(within(turmaA).getByRole('link', { name: /Entrega sem avaliação/ })).toHaveAttribute(
      'href',
      '/docente/avaliacoes',
    );
    expect(within(turmaA).getAllByText('Encontro 1')).toHaveLength(2);

    const turmaB = screen.getByRole('region', { name: '3º ano B' });
    expect(
      within(turmaB).getByText('Nenhuma pendência nos encontros realizados'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute(
      'href',
      '/docente/relatorios',
    );
    expect(container).not.toHaveTextContent(/nota/i);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem turmas vinculadas: orientação; na demonstração, "Dados fictícios"', () => {
    renderizar({ proximoEncontro: null, turmas: [] }, true);
    expect(screen.getByText('Nenhuma turma vinculada ao seu perfil.')).toBeInTheDocument();
    expect(screen.getByText('Dados fictícios')).toBeInTheDocument();
  });
});
