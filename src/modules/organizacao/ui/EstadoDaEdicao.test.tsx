import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { EdicaoGerida } from '../domain/edicoes';
import { EstadoDaEdicao } from './EstadoDaEdicao';

const base: EdicaoGerida = {
  id: 'e1',
  nome: 'Maratona 2027',
  inicio: '2027-03-01',
  fim: '2027-11-30',
  estado: 'rascunho',
  regrasVersao: 'v1',
};
const pendencias = {
  ocorrenciasSemDecisao: 2,
  revisoesAbertas: 1,
  categoriasSemRanking: ['Categoria A'],
};

describe('EstadoDaEdicao (US5, FR-010–012)', () => {
  it('em preparação: ativa só depois da resposta e mostra o que falta quando recusado', async () => {
    const usuario = userEvent.setup();
    const onAtivar = vi
      .fn()
      .mockRejectedValueOnce(new Error('Para ativar, falta: ao menos uma turma vinculada.'))
      .mockResolvedValueOnce({ ativadaEm: 'agora' });
    const { container, rerender } = render(
      <EstadoDaEdicao
        edicao={base}
        onAtivar={onAtivar}
        onCarregarPendencias={vi.fn()}
        onEncerrar={vi.fn()}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Ativar edição' }));
    expect(
      await screen.findByText('Para ativar, falta: ao menos uma turma vinculada.'),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Ativar edição' }));
    expect(await screen.findByText('Edição ativada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar edição' })).not.toBeInTheDocument();
    // A lista recarregada traz a edição ativa: a confirmação continua visível.
    rerender(
      <EstadoDaEdicao
        edicao={{ ...base, estado: 'ativa' }}
        onAtivar={onAtivar}
        onCarregarPendencias={vi.fn()}
        onEncerrar={vi.fn()}
      />,
    );
    expect(screen.getByText('Edição ativada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar edição' })).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('ativa: encerrar mostra as pendências e exige justificativa', async () => {
    const usuario = userEvent.setup();
    const onEncerrar = vi.fn().mockResolvedValue({ encerradaEm: 'agora', pendencias });
    render(
      <EstadoDaEdicao
        edicao={{ ...base, estado: 'ativa' }}
        onAtivar={vi.fn()}
        onCarregarPendencias={vi.fn().mockResolvedValue(pendencias)}
        onEncerrar={onEncerrar}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Encerrar edição' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('2 ocorrências sem decisão')).toBeInTheDocument();
    expect(within(dialogo).getByText('1 pedido de revisão aberto')).toBeInTheDocument();
    expect(
      within(dialogo).getByText('Categorias sem ranking publicado: Categoria A'),
    ).toBeInTheDocument();
    expect(
      within(dialogo).getByText('Depois de encerrada, a edição só pode ser lida.'),
    ).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Encerrar' }));
    expect(
      within(dialogo).getByText('Informe a justificativa (mínimo de 10 caracteres).'),
    ).toBeInTheDocument();
    expect(onEncerrar).not.toHaveBeenCalled();
    await usuario.type(within(dialogo).getByLabelText('Justificativa'), 'Fim do ciclo de 2027.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Encerrar' }));
    expect(onEncerrar).toHaveBeenCalledWith('Fim do ciclo de 2027.');
  });

  it('encerrada: só leitura, com data e justificativa', () => {
    render(
      <EstadoDaEdicao
        edicao={{
          ...base,
          estado: 'encerrada',
          encerradaEm: '2027-12-01T12:00:00Z',
          justificativaEncerramento: 'Fim do ciclo de 2027.',
        }}
        onAtivar={vi.fn()}
        onCarregarPendencias={vi.fn()}
        onEncerrar={vi.fn()}
      />,
    );
    expect(screen.getByText(/Edição encerrada em .*: Fim do ciclo de 2027\./)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
