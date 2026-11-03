import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Vinculo } from '../domain/tipos';
import { CoordenacaoDaEdicao } from './CoordenacaoDaEdicao';

const v = (id: string, usuarioId: string, nome: string, ativo = true): Vinculo => ({
  id,
  usuarioId,
  nome,
  papel: 'coordenacao',
  turmaId: null,
  ativo,
});

describe('CoordenacaoDaEdicao (US6, FR-014)', () => {
  it('sem botão de desativar para si mesma; desativa outra e adiciona pela busca', async () => {
    const usuario = userEvent.setup();
    const onDesativar = vi.fn().mockResolvedValue(undefined);
    const onAtribuir = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <CoordenacaoDaEdicao
        vinculos={[
          v('1', 'eu', 'Eu Mesma'),
          v('2', 'outra', 'Outra Pessoa'),
          v('3', 'ex', 'Antiga', false),
        ]}
        usuarioAtualId="eu"
        onBuscar={vi.fn().mockResolvedValue([{ usuarioId: 'nova', nome: 'Nova Pessoa' }])}
        onAtribuir={onAtribuir}
        onDesativar={onDesativar}
      />,
    );
    expect(screen.queryByText('Antiga')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar Eu Mesma' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Desativar Outra Pessoa' }));
    expect(onDesativar).toHaveBeenCalledWith('outra');
    await usuario.type(screen.getByLabelText('Buscar pessoa pelo nome'), 'nov');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    await usuario.click(
      await screen.findByRole('button', { name: 'Adicionar Nova Pessoa à coordenação' }),
    );
    expect(onAtribuir).toHaveBeenCalledWith('nova');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('a última coordenação ativa não tem botão de desativar', () => {
    render(
      <CoordenacaoDaEdicao
        vinculos={[v('1', 'eu', 'Eu Mesma'), v('2', 'outra', 'Outra Pessoa', false)]}
        usuarioAtualId="alguem"
        onBuscar={vi.fn()}
        onAtribuir={vi.fn()}
        onDesativar={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Desativar/ })).not.toBeInTheDocument();
  });
});
