import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGRAS_PILOTO, type RegrasDaEdicao } from '@/modules/pontuacao';
import { violacoesA11y } from '@/test/a11y';
import type { EquipeParaAvaliar } from '../domain/tipos';
import { FormAvaliacao } from './FormAvaliacao';
import { FormProrrogacao } from './FormProrrogacao';

// Regras diferentes das do piloto: a tela usa sempre as regras vindas do servidor (FR-025).
const regras: RegrasDaEdicao = {
  ...REGRAS_PILOTO,
  entrega: {
    ...REGRAS_PILOTO.entrega,
    criterios: [
      { id: 'compreensao', rotulo: 'Compreensão', maximo: 5 },
      { id: 'organizacao', rotulo: 'Organização', maximo: 5 },
    ],
  },
  apresentacao: { criterios: [{ id: 'clareza', rotulo: 'Clareza', maximo: 3 }] },
};

const equipe: EquipeParaAvaliar = {
  id: 'e1',
  nome: 'Equipe Órbita',
  integrantes: [],
  ultimaEntrega: {
    id: 'v1',
    versao: 1,
    protocolo: 'ENT-1',
    recebidaEm: '2026-11-05T19:40:00Z',
    atrasoMinutos: 10,
    descontoPrevisto: 2,
    autorNome: 'Ana',
    arquivoPath: null,
    arquivoNome: null,
    link: 'https://a.b',
  },
  versoes: [],
  avaliacao: null,
  prorrogacao: null,
};

describe('FormAvaliacao (US3, FR-012–015)', () => {
  it('um campo por critério das regras; desconto de atraso exibido à parte; confirma após o servidor', async () => {
    let concluir!: () => void;
    const onSalvar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormAvaliacao equipe={equipe} regras={regras} onSalvar={onSalvar} />,
    );
    expect(
      screen.getByText(/Atraso de 10 min: desconto de 2 pontos em Organização/),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Entrega: Compreensão (até 5)'), '5');
    await userEvent.type(screen.getByLabelText('Entrega: Organização (até 5)'), '4');
    await userEvent.type(screen.getByLabelText('Apresentação: Clareza (até 3)'), '3');
    await userEvent.type(screen.getByLabelText('Feedback para a equipe'), 'Boa solução.');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar avaliação' }));
    expect(onSalvar).toHaveBeenCalledWith({
      notasEntrega: { compreensao: 5, organizacao: 4 },
      notasApresentacao: { clareza: 3 },
      apresentacaoNaoAvaliavel: false,
      feedback: 'Boa solução.',
      justificativa: undefined,
    });
    expect(screen.queryByText('Avaliação registrada.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Avaliação registrada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('feedback obrigatório quando há entrega', async () => {
    const onSalvar = vi.fn();
    render(<FormAvaliacao equipe={equipe} regras={regras} onSalvar={onSalvar} />);
    await userEvent.type(screen.getByLabelText('Entrega: Compreensão (até 5)'), '5');
    await userEvent.type(screen.getByLabelText('Entrega: Organização (até 5)'), '4');
    await userEvent.click(screen.getByLabelText('Apresentação não avaliável'));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar avaliação' }));
    expect(screen.getByText('Escreva o feedback da entrega.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('sem entrega: prática zerada e apresentação pode ser não avaliável (FR-014)', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    render(
      <FormAvaliacao
        equipe={{ ...equipe, ultimaEntrega: null }}
        regras={regras}
        onSalvar={onSalvar}
      />,
    );
    expect(screen.getByText('Sem entrega: a prática fica zerada.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Entrega: Compreensão (até 5)')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Apresentação não avaliável'));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar avaliação' }));
    expect(onSalvar).toHaveBeenCalledWith({
      notasEntrega: null,
      notasApresentacao: null,
      apresentacaoNaoAvaliavel: true,
      feedback: '',
      justificativa: undefined,
    });
  });

  it('correção exige justificativa; a coordenação só corrige o que existe', async () => {
    const avaliada = {
      ...equipe,
      avaliacao: {
        notasEntrega: { compreensao: 5, organizacao: 4 },
        notasApresentacao: { clareza: 3 },
        apresentacaoNaoAvaliavel: false,
        feedback: 'Boa solução.',
        registradoEm: '2026-11-05T20:00:00Z',
      },
    };
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <FormAvaliacao equipe={avaliada} regras={regras} onSalvar={onSalvar} />,
    );
    const campo = screen.getByLabelText('Entrega: Organização (até 5)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Justificativa da correção'), 'Revisão da rubrica.');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ justificativa: 'Revisão da rubrica.' }),
    );
    unmount();
    render(<FormAvaliacao equipe={equipe} regras={regras} onSalvar={vi.fn()} somenteCorrecao />);
    expect(
      screen.getByText('A coordenação corrige avaliações já registradas.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar avaliação' })).not.toBeInTheDocument();
  });

  it('sem conexão: registro bloqueado com o motivo (FR-024, US3 cenário 6)', () => {
    render(
      <FormAvaliacao
        equipe={equipe}
        regras={regras}
        onSalvar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Registrar avaliação' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });
});

describe('FormProrrogacao (FR-007)', () => {
  it('novo prazo e justificativa; confirma após o servidor', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FormProrrogacao onSalvar={onSalvar} />);
    await userEvent.type(screen.getByLabelText('Novo prazo'), '2026-11-06T18:00');
    await userEvent.type(screen.getByLabelText('Justificativa da prorrogação'), 'curto');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar prorrogação' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Justificativa da prorrogação'),
      ' — impedimento médico.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar prorrogação' }));
    expect(onSalvar).toHaveBeenCalledWith({
      novoPrazo: new Date('2026-11-06T18:00').toISOString(),
      justificativa: 'curto — impedimento médico.',
    });
    expect(await screen.findByText('Prorrogação registrada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem conexão: bloqueado', () => {
    render(<FormProrrogacao onSalvar={vi.fn()} bloqueio="Sem conexão." />);
    expect(screen.getByRole('button', { name: 'Registrar prorrogação' })).toBeDisabled();
  });
});
