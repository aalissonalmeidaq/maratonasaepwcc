import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { ComunicadoRecebido } from '../domain/tipos';
import { ListaComunicados } from './ListaComunicados';

const novo: ComunicadoRecebido = {
  id: 'c1',
  titulo: 'Mudança de sala',
  texto: 'Encontro 3 no laboratório 2.\nLeve o crachá.',
  publico: 'estudantes',
  turmas: [{ id: 't-a', nome: '3º ano A' }],
  autor: { nome: 'Prof.ª Ana', papel: 'docente' },
  publicadoEm: '2026-11-02T15:00:00Z',
  corrigidoEm: '2026-11-02T18:00:00Z',
  novo: true,
};
const lido: ComunicadoRecebido = {
  ...novo,
  id: 'c2',
  titulo: 'Boas-vindas',
  texto: '<script>alert(1)</script>',
  autor: { nome: 'Coordenação', papel: 'coordenacao' },
  corrigidoEm: null,
  novo: false,
};

describe('ListaComunicados (US2, FR-007, FR-008)', () => {
  it('mostra título, autor e papel, datas, texto com quebras e o selo "Novo" em texto', async () => {
    const { container } = render(
      <ListaComunicados comunicados={[novo, lido]} onMarcarLido={vi.fn()} />,
    );
    const item = screen.getByRole('article', { name: 'Mudança de sala' });
    expect(
      within(item).getByText(/Publicado em .* por Prof.ª Ana \(docente\)/),
    ).toBeInTheDocument();
    expect(within(item).getByText(/Atualizado em/)).toBeInTheDocument();
    expect(within(item).getByText('Novo')).toBeInTheDocument();
    expect(within(item).getByText(/Leve o crachá/)).toHaveClass('whitespace-pre-line');
    const outro = screen.getByRole('article', { name: 'Boas-vindas' });
    expect(within(outro).queryByText('Novo')).not.toBeInTheDocument();
    expect(within(outro).queryByText(/Atualizado em/)).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('texto com marcação aparece como texto puro', () => {
    const { container } = render(<ListaComunicados comunicados={[lido]} onMarcarLido={vi.fn()} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });

  it('marca como lido só depois da resposta do servidor', async () => {
    const usuario = userEvent.setup();
    let concluir!: () => void;
    const onMarcarLido = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    render(<ListaComunicados comunicados={[novo, lido]} onMarcarLido={onMarcarLido} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: 'Marcar como lido: Mudança de sala' }));
    expect(onMarcarLido).toHaveBeenCalledWith('c1');
    expect(screen.queryByText('Comunicado marcado como lido.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Comunicado marcado como lido.')).toBeInTheDocument();
  });

  it('vazio, demonstração e bloqueio', () => {
    const { rerender } = render(<ListaComunicados comunicados={[]} onMarcarLido={vi.fn()} />);
    expect(
      screen.getByText('Nenhum comunicado publicado para você nesta edição.'),
    ).toBeInTheDocument();
    rerender(
      <ListaComunicados
        comunicados={[novo]}
        onMarcarLido={vi.fn()}
        ficticio
        bloqueio="Indisponível no modo demonstração: nenhuma alteração é gravada."
      />,
    );
    expect(screen.getByText('Dados fictícios')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marcar como lido/ })).toBeDisabled();
  });
});
