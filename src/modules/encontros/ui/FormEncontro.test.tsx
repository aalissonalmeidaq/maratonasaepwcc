import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormEncontro } from './FormEncontro';

const props = {
  quantidadeEncontros: 4,
  numerosExistentes: [1],
  ambientes: [{ id: 'amb1', nome: 'Laboratório 1', observacoes: null }],
};

async function preencher(campos: { numero: string; inicio: string; fim: string }) {
  const user = userEvent.setup();
  const numero = screen.getByLabelText('Número');
  await user.clear(numero);
  await user.type(numero, campos.numero);
  await user.type(screen.getByLabelText('Título'), 'Encontro de teste');
  await user.type(screen.getByLabelText('Data'), '2026-11-12');
  await user.type(screen.getByLabelText('Início'), campos.inicio);
  await user.type(screen.getByLabelText('Término'), campos.fim);
  await user.selectOptions(screen.getByLabelText('Ambiente'), 'amb1');
  await user.click(screen.getByRole('button', { name: 'Salvar encontro' }));
}

describe('FormEncontro (US4)', () => {
  it('recusa término antes do início sem enviar ao servidor', async () => {
    const onSalvar = vi.fn();
    render(<FormEncontro {...props} onSalvar={onSalvar} />);
    await preencher({ numero: '2', inicio: '17:00', fim: '13:30' });
    expect(await screen.findByText('O término deve ser depois do início.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('recusa número acima do configurado na edição', async () => {
    const onSalvar = vi.fn();
    render(<FormEncontro {...props} onSalvar={onSalvar} />);
    await preencher({ numero: '5', inicio: '13:30', fim: '17:00' });
    expect(
      await screen.findByText(/Ajuste a configuração antes de criar o encontro 5/),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('envia dados válidos e confirma após o servidor', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(<FormEncontro {...props} onSalvar={onSalvar} />);
    await preencher({ numero: '2', inicio: '13:30', fim: '17:00' });
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        numero: 2,
        titulo: 'Encontro de teste',
        data: '2026-11-12',
        inicio: '13:30',
        fim: '17:00',
        ambienteId: 'amb1',
        avaliacaoObjetiva: 'questoes',
        estado: 'agendado',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Encontro salvo.');
  });
});
