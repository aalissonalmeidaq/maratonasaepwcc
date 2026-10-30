import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { CardDestaque } from './CardDestaque';
import { BannerDestaque } from './BannerDestaque';
import { ProgressoCircular } from './ProgressoCircular';

const comRotas = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CardDestaque (prancha 09, cards e componentes digitais)', () => {
  it('é um link com título e descrição no nome acessível', async () => {
    const { container } = comRotas(
      <CardDestaque
        titulo="Ranking"
        descricao="Classificação da categoria"
        icone="ranking"
        para="/aluno/ranking"
      />,
    );
    const link = screen.getByRole('link', { name: /ranking.*classificação da categoria/i });
    expect(link).toHaveAttribute('href', '/aluno/ranking');
    for (const svg of container.querySelectorAll('svg'))
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('variante escura usa o padrão de recorte decorativo', () => {
    const { container } = comRotas(
      <CardDestaque
        titulo="Encontros"
        descricao="Agenda"
        icone="calendario"
        para="/x"
        variante="escuro"
      />,
    );
    expect(container.querySelector('a')?.className).toMatch(/text-white/);
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
  });
});

describe('BannerDestaque', () => {
  it('mantém o título como cabeçalho de nível 1 e o padrão como decoração', () => {
    const { container } = render(
      <BannerDestaque titulo="Olá, Ana!" descricao="Cada desafio é uma oportunidade de evoluir." />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Olá, Ana!' })).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ProgressoCircular', () => {
  it('expõe valor e máximo e mostra o percentual', () => {
    render(<ProgressoCircular valor={300} maximo={400} rotulo="Progresso da dupla" />);
    const barra = screen.getByRole('progressbar', { name: 'Progresso da dupla' });
    expect(barra).toHaveAttribute('aria-valuenow', '300');
    expect(barra).toHaveAttribute('aria-valuemax', '400');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('limita o preenchimento entre 0% e 100%', () => {
    render(<ProgressoCircular valor={500} maximo={400} rotulo="x" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
