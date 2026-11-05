import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PainelDaCoordenacao } from '../domain/tipos';
import { PainelCoordenacao } from './PainelCoordenacao';

const painel: PainelDaCoordenacao = {
  indicadores: {
    cursos: 2,
    turmas: 3,
    equipes: 5,
    estudantes: 11,
    encontrosRealizados: 1,
    encontrosTotal: 3,
  },
  turmas: [
    {
      turmaId: 't1',
      turma: '3º ano A',
      categoria: 'Categoria A',
      componentesPendentes: 4,
      provasPendentes: 0,
      ocorrenciasSemDecisao: 1,
      revisoesAbertas: 2,
      publicacao: { estado: 'parcial', versao: 1, publicadoEm: '2026-11-01T15:00:00Z' },
    },
    {
      turmaId: 't2',
      turma: '3º ano B',
      categoria: 'Categoria B',
      componentesPendentes: 0,
      provasPendentes: 3,
      ocorrenciasSemDecisao: 0,
      revisoesAbertas: 0,
      publicacao: null,
    },
  ],
};

const renderizar = (ficticio = false) =>
  render(
    <MemoryRouter>
      <PainelCoordenacao painel={painel} edicaoNome="Edição fictícia" ficticio={ficticio} />
    </MemoryRouter>,
  );

describe('PainelCoordenacao (US3, FR-004, FR-005)', () => {
  it('indicadores e, por turma, pendências com links e a última publicação', async () => {
    const { container } = renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('11 estudantes ativos')).toBeInTheDocument();
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
    const indicadores = screen.getByRole('region', { name: 'Indicadores' });
    // Soma das pendências das turmas: 3º A (4 + 0 + 1 + 2) e 3º B (0 + 3 + 0 + 0).
    expect(within(indicadores).getByText('Em 2 turmas')).toBeInTheDocument();
    expect(
      within(within(indicadores).getByRole('region', { name: 'Pendências abertas' })).getByText(
        '10',
      ),
    ).toBeInTheDocument();
    expect(
      within(indicadores).getByRole('progressbar', { name: 'Encontros realizados' }),
    ).toHaveAttribute('aria-valuenow', '1');

    const a = screen.getByRole('region', { name: '3º ano A' });
    expect(within(a).getByText('Categoria A')).toBeInTheDocument();
    expect(within(a).getByRole('link', { name: /Componentes sem registro\s*4/ })).toHaveAttribute(
      'href',
      '/coordenacao/ranking',
    );
    expect(within(a).getByRole('link', { name: /Prova oficial pendente\s*0/ })).toHaveAttribute(
      'href',
      '/coordenacao/prova-oficial',
    );
    expect(within(a).getByRole('link', { name: /Ocorrências sem decisão\s*1/ })).toHaveAttribute(
      'href',
      '/coordenacao/ocorrencias',
    );
    expect(within(a).getByRole('link', { name: /Revisões abertas\s*2/ })).toHaveAttribute(
      'href',
      '/coordenacao/revisoes',
    );
    expect(within(a).getByText(/Versão 1/)).toBeInTheDocument();
    expect(within(a).getByText('Parcial')).toBeInTheDocument();

    const b = screen.getByRole('region', { name: '3º ano B' });
    expect(within(b).getByText('Ranking da turma ainda não publicado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute(
      'href',
      '/coordenacao/relatorios',
    );
    expect(screen.queryByText('Dados fictícios')).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('na demonstração, o selo "Dados fictícios"', () => {
    renderizar(true);
    expect(screen.getByText('Dados fictícios')).toBeInTheDocument();
  });
});
