import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { ResultadoProva } from '../domain/tipos';
import { FormResultadosProva } from './FormResultadosProva';

const linha = (
  p: Partial<ResultadoProva> & Pick<ResultadoProva, 'estudanteId' | 'estudanteNome'>,
): ResultadoProva => ({
  duplaId: 'e1',
  duplaNome: 'Equipe Órbita',
  turmaId: 't1',
  turmaNome: 'Turma A',
  realizacao: null,
  nota: null,
  notaEstado: null,
  fonte: null,
  escalaConfirmada: false,
  autorizacaoConfirmada: false,
  registradoEm: null,
  ...p,
});

const novos = [
  linha({ estudanteId: 'a', estudanteNome: 'Ana' }),
  linha({ estudanteId: 'b', estudanteNome: 'Bruno' }),
  linha({ estudanteId: 'c', estudanteNome: 'Caio', duplaId: 'e2', duplaNome: 'Equipe Vetor' }),
];

describe('FormResultadosProva (US1, FR-001 a FR-004)', () => {
  it('agrupa por equipe e envia em lote só o que foi registrado; confirma após o servidor', async () => {
    let concluir!: () => void;
    const onSalvar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(<FormResultadosProva resultados={novos} onSalvar={onSalvar} />);
    expect(screen.getByRole('group', { name: 'Equipe Órbita' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Equipe Vetor' })).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText('Realização de Ana'),
      'Realizou (confirmada)',
    );
    await userEvent.type(screen.getByLabelText('Nota oficial de Ana'), '75');
    await userEvent.type(screen.getByLabelText('Fonte da nota de Ana'), 'Planilha oficial');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana: escala 0–100 confirmada' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana: uso da nota autorizado' }));
    await userEvent.selectOptions(
      screen.getByLabelText('Realização de Bruno'),
      'Realizou (confirmada)',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Bruno: nota indisponível' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resultados' }));

    expect(onSalvar).toHaveBeenCalledWith(
      [
        {
          estudanteId: 'a',
          realizacao: 'confirmada',
          nota: 75,
          fonte: 'Planilha oficial',
          escalaConfirmada: true,
          autorizacaoConfirmada: true,
          notaIndisponivel: false,
        },
        {
          estudanteId: 'b',
          realizacao: 'confirmada',
          nota: null,
          fonte: null,
          escalaConfirmada: false,
          autorizacaoConfirmada: false,
          notaIndisponivel: true,
        },
      ],
      undefined,
    );
    expect(screen.queryByText('Resultados salvos.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Resultados salvos.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('nota só aparece para quem realizou a prova', async () => {
    render(<FormResultadosProva resultados={novos} onSalvar={vi.fn()} />);
    expect(screen.queryByLabelText('Nota oficial de Caio')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Realização de Caio'), 'Não realizou');
    expect(screen.queryByLabelText('Nota oficial de Caio')).not.toBeInTheDocument();
  });

  it('alterar um resultado já gravado exige justificativa (FR-004)', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(
      <FormResultadosProva
        resultados={[
          linha({
            estudanteId: 'a',
            estudanteNome: 'Ana',
            realizacao: 'confirmada',
            nota: 75,
            notaEstado: 'confirmada',
            fonte: 'Planilha',
            escalaConfirmada: true,
            autorizacaoConfirmada: true,
            registradoEm: '2026-11-01T10:00:00Z',
          }),
        ]}
        onSalvar={onSalvar}
        pedidoId="r1"
      />,
    );
    expect(screen.getByText(/ligada ao pedido de revisão/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Nota oficial de Ana'));
    await userEvent.type(screen.getByLabelText('Nota oficial de Ana'), '80');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resultados' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByLabelText('Justificativa da correção'),
      'Nota corrigida pela planilha.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resultados' }));
    expect(onSalvar).toHaveBeenCalledWith(
      [expect.objectContaining({ nota: 80 })],
      'Nota corrigida pela planilha.',
    );
  });

  it('recusa do servidor aparece no lugar do sucesso', async () => {
    const onSalvar = vi
      .fn()
      .mockRejectedValue(
        new Error('A edição está encerrada; os resultados não podem mais ser alterados.'),
      );
    render(<FormResultadosProva resultados={novos} onSalvar={onSalvar} />);
    await userEvent.selectOptions(screen.getByLabelText('Realização de Ana'), 'Pendente');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resultados' }));
    expect(await screen.findByText(/edição está encerrada/)).toBeInTheDocument();
    expect(screen.queryByText('Resultados salvos.')).not.toBeInTheDocument();
  });

  it('sem conexão ou na demonstração: salvar desabilitado com o motivo (FR-025)', () => {
    render(
      <FormResultadosProva
        resultados={novos}
        onSalvar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Salvar resultados' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });
});
