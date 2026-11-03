import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Edicao } from '../domain/tipos';
import { SeletorEdicao } from './SeletorEdicao';

const edicao = (id: string, nome: string, estado: Edicao['estado']): Edicao => ({
  id,
  nome,
  estado,
  inicio: null,
  fim: null,
  quantidadeEncontros: 4,
  regrasVersao: 'v',
  regras: {},
});

describe('SeletorEdicao (US7, FR-015, FR-019, SC-007)', () => {
  it('com duas ou mais edições, troca a edição em uma interação', async () => {
    const usuario = userEvent.setup();
    const onEscolher = vi.fn();
    const { container } = render(
      <SeletorEdicao
        edicoes={[
          edicao('e1', 'Maratona 2026', 'ativa'),
          edicao('e2', 'Maratona 2027', 'rascunho'),
        ]}
        escolhidaId="e1"
        onEscolher={onEscolher}
      />,
    );
    const campo = screen.getByLabelText('Edição em uso');
    expect(campo).toHaveValue('e1');
    expect(
      screen.getByRole('option', { name: 'Maratona 2027 — Em preparação' }),
    ).toBeInTheDocument();
    await usuario.selectOptions(campo, 'e2');
    expect(onEscolher).toHaveBeenCalledWith('e2');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('com uma só edição, não há seletor; em preparação, aparece o selo', () => {
    const { rerender } = render(
      <SeletorEdicao
        edicoes={[edicao('e1', 'Maratona 2026', 'ativa')]}
        escolhidaId="e1"
        onEscolher={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Edição em uso')).not.toBeInTheDocument();
    expect(screen.queryByText('Em preparação')).not.toBeInTheDocument();
    rerender(
      <SeletorEdicao
        edicoes={[edicao('e2', 'Maratona 2027', 'rascunho')]}
        escolhidaId="e2"
        onEscolher={vi.fn()}
      />,
    );
    expect(screen.getByText('Maratona 2027')).toBeInTheDocument();
    expect(screen.getByText('Em preparação')).toBeInTheDocument();
  });
});
