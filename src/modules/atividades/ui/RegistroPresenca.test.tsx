import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGRAS_PILOTO } from '@/modules/pontuacao';
import { violacoesA11y } from '@/test/a11y';
import type { PresencaDaTurma } from '../domain/tipos';
import { FormParticipacao } from './FormParticipacao';
import { RegistroPresenca } from './RegistroPresenca';

const dados: PresencaDaTurma = {
  regras: REGRAS_PILOTO,
  equipes: [
    {
      id: 'e1',
      nome: 'Equipe Órbita',
      integrantes: [
        { estudanteId: 'a', nome: 'Ana' },
        { estudanteId: 'b', nome: 'Bruno' },
      ],
    },
  ],
  alunos: [
    { estudanteId: 'a', nome: 'Ana', duplaId: 'e1', presente: null, observacao: null },
    { estudanteId: 'b', nome: 'Bruno', duplaId: 'e1', presente: null, observacao: null },
    { estudanteId: 'c', nome: 'Caio', duplaId: null, presente: null, observacao: null },
  ],
  participacoes: [],
};

describe('RegistroPresenca (US2, FR-009/011, SC-003)', () => {
  it('agrupa por equipe, marca todos e envia o lote de uma vez; confirma só após o servidor', async () => {
    let concluir!: () => void;
    const onSalvar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(<RegistroPresenca dados={dados} onSalvar={onSalvar} />);
    expect(screen.getByRole('group', { name: 'Equipe Órbita' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Sem equipe' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todos presentes' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Caio presente' }));
    await userEvent.type(screen.getByLabelText('Observação de Ana'), 'Chegou atrasada.');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar presenças' }));
    expect(onSalvar).toHaveBeenCalledOnce();
    expect(onSalvar).toHaveBeenCalledWith(
      [
        { estudanteId: 'a', presente: true, observacao: 'Chegou atrasada.' },
        { estudanteId: 'b', presente: true, observacao: '' },
        { estudanteId: 'c', presente: false, observacao: '' },
      ],
      undefined,
    );
    expect(screen.queryByText('Presenças salvas.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Presenças salvas.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('alterar registro existente exige justificativa', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(
      <RegistroPresenca
        dados={{
          ...dados,
          alunos: dados.alunos.map((a) => ({ ...a, presente: true })),
        }}
        onSalvar={onSalvar}
      />,
    );
    expect(screen.queryByLabelText('Justificativa da correção')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Bruno presente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar presenças' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Justificativa da correção'), 'Bruno saiu antes.');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar presenças' }));
    expect(onSalvar).toHaveBeenCalledWith(expect.any(Array), 'Bruno saiu antes.');
  });

  it('sem conexão: salvar fica desabilitado com o motivo (FR-024)', () => {
    render(
      <RegistroPresenca
        dados={dados}
        onSalvar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Salvar presenças' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });
});

describe('FormParticipacao (US2, FR-010, FR-025)', () => {
  const criterios = [
    { id: 'envolvimento', rotulo: 'Envolvimento', maximo: 6 },
    { id: 'colaboracao', rotulo: 'Colaboração', maximo: 2 },
  ];

  it('um campo por critério com o máximo das regras do servidor', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <FormParticipacao equipe={dados.equipes[0]!} criterios={criterios} onSalvar={onSalvar} />,
    );
    await userEvent.type(screen.getByLabelText('Envolvimento (até 6)'), '6');
    await userEvent.type(screen.getByLabelText('Colaboração (até 2)'), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar participação' }));
    expect(onSalvar).toHaveBeenCalledWith({ envolvimento: 6, colaboracao: 1.5 }, undefined);
    expect(await screen.findByText('Participação salva.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('valida o limite e exige justificativa ao corrigir', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(
      <FormParticipacao
        equipe={dados.equipes[0]!}
        criterios={criterios}
        inicial={{ envolvimento: 5, colaboracao: 2 }}
        onSalvar={onSalvar}
      />,
    );
    const campo = screen.getByLabelText('Colaboração (até 2)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar participação' }));
    expect(screen.getByText('A nota de "Colaboração" deve estar entre 0 e 2.')).toBeInTheDocument();
    await userEvent.clear(campo);
    await userEvent.type(campo, '1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar participação' }));
    expect(
      within(screen.getByRole('form', { name: 'Participação da Equipe Órbita' })).getByText(
        'Informe uma justificativa com pelo menos 10 caracteres.',
      ),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('sem conexão: bloqueado com o motivo', () => {
    render(
      <FormParticipacao
        equipe={dados.equipes[0]!}
        criterios={criterios}
        onSalvar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Salvar participação' })).toBeDisabled();
  });
});
