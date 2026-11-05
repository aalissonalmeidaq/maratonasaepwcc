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
  it('informa quando não há publicação', () => {
    render(<RegulamentoPublico conteudo={{ ...regulamentoPublicoFixture, edicoes: [] }} />);
    expect(screen.getByText('Nenhum regulamento publicado no momento.')).toBeInTheDocument();
  });
});
