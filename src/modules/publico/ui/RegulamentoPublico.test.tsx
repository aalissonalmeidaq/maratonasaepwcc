import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { regulamentoPublicoFixture } from '@/test/fixtures/regulamentoPublico';
import { RegulamentoPublico } from './RegulamentoPublico';
describe('regulamento público (US1)', () => {
  it('mostra apenas regras e encontros públicos e identifica o resumo em validação', () => {
    render(<RegulamentoPublico conteudo={regulamentoPublicoFixture} />);
    expect(screen.getByRole('heading', { name: 'Edição fictícia' })).toBeInTheDocument();
    expect(screen.getByText(/Resumo em validação/)).toBeInTheDocument();
    expect(screen.getByText(/horário a confirmar/i)).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });
  it('mostra a unidade da edição (spec 016) e segue legível sem ela (cópia antiga)', () => {
    const { rerender } = render(<RegulamentoPublico conteudo={regulamentoPublicoFixture} />);
    expect(screen.getByText(/Unidade: Unidade fictícia/)).toBeInTheDocument();
    const [primeira] = regulamentoPublicoFixture.edicoes;
    const antiga = { ...primeira!, unidade: undefined };
    rerender(<RegulamentoPublico conteudo={{ ...regulamentoPublicoFixture, edicoes: [antiga] }} />);
    expect(screen.queryByText(/Unidade:/)).not.toBeInTheDocument();
  });
  it('informa quando não há publicação', () => {
    render(<RegulamentoPublico conteudo={{ ...regulamentoPublicoFixture, edicoes: [] }} />);
    expect(screen.getByText('Nenhum regulamento publicado no momento.')).toBeInTheDocument();
  });
});
