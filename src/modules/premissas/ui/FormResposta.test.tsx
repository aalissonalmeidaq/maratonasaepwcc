import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { premissa, resposta } from '@/test/fixtures/premissas';
import { FormResposta } from './FormResposta';

function renderizar(extra: Partial<Parameters<typeof FormResposta>[0]> = {}) {
  const onResponder = vi.fn().mockResolvedValue(resposta({ id: 'nova' }));
  const r = render(
    <FormResposta
      premissa={premissa({ historico: [resposta({ id: 'r-atual' })] })}
      onResponder={onResponder}
      {...extra}
    />,
  );
  return { ...r, onResponder };
}

async function abrir() {
  await userEvent.click(screen.getByRole('button', { name: 'Responder P09' }));
}

describe('FormResposta (spec 015, US2)', () => {
  it('"Responder" abre o formulário no cartão', async () => {
    renderizar();
    expect(screen.queryByRole('group', { name: 'Decisão da unidade' })).not.toBeInTheDocument();
    await abrir();
    expect(screen.getByRole('group', { name: 'Decisão da unidade' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Confirmada' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Precisa mudar' })).toBeInTheDocument();
  });

  it('rótulo da justificativa muda em "Precisa mudar"; contador de 2.000', async () => {
    renderizar();
    await abrir();
    expect(screen.getByLabelText('Justificativa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Precisa mudar' }));
    const campo = screen.getByLabelText('O que precisa mudar e por quê');
    await userEvent.type(campo, 'Usar uma casa.');
    expect(screen.getByText('14/2.000 caracteres')).toBeInTheDocument();
    expect(
      screen.getByText(/O sistema segue a premissa em uso até a mudança ser feita/),
    ).toBeInTheDocument();
  });

  it('valida antes de enviar, com o erro ligado ao campo', async () => {
    const { onResponder } = renderizar();
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar resposta' }));
    expect(onResponder).not.toHaveBeenCalled();
    expect(screen.getByText('Escolha "Confirmada" ou "Precisa mudar".')).toBeInTheDocument();
    expect(screen.getByLabelText('Justificativa')).toHaveAccessibleDescription(
      /Justifique com 10 a 2.000 caracteres/,
    );
  });

  it('envia com a resposta-base e só confirma depois do servidor', async () => {
    let resolver: (v: unknown) => void = () => undefined;
    const onResponder = vi.fn(() => new Promise((r) => (resolver = r)));
    renderizar({ onResponder: onResponder as never });
    await abrir();
    await userEvent.click(screen.getByRole('radio', { name: 'Confirmada' }));
    await userEvent.type(
      screen.getByLabelText('Justificativa'),
      '  Conferido com o regulamento.  ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar resposta' }));
    expect(onResponder).toHaveBeenCalledWith({
      codigo: 'P09',
      decisao: 'confirmada',
      justificativa: 'Conferido com o regulamento.',
      respostaBase: 'r-atual',
    });
    expect(screen.queryByText('Resposta registrada.')).not.toBeInTheDocument();
    resolver(resposta());
    expect(await screen.findByText('Resposta registrada.')).toBeInTheDocument();
  });

  it('recusa do servidor (premissa respondida por outra pessoa) aparece como erro anunciado', async () => {
    const onResponder = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Esta premissa foi respondida por outra pessoa. Veja a resposta atual antes de registrar.',
        ),
      );
    renderizar({ onResponder });
    await abrir();
    await userEvent.click(screen.getByRole('radio', { name: 'Confirmada' }));
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Conferido com o regulamento.');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar resposta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/respondida por outra pessoa/);
  });

  it('com bloqueio (offline ou demonstração) não envia e mostra o motivo', async () => {
    const { onResponder } = renderizar({
      bloqueio: 'Sem conexão: gravações exigem conexão com o servidor.',
    });
    await abrir();
    expect(
      screen.getByText('Sem conexão: gravações exigem conexão com o servidor.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar resposta' })).toBeDisabled();
    expect(onResponder).not.toHaveBeenCalled();
  });

  it('sem violações de acessibilidade com o formulário aberto', async () => {
    const { container } = renderizar();
    await abrir();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
