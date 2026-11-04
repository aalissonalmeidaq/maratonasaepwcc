import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PremiacaoDaTurma } from '../domain/tipos';
import { FormDecisaoEmpate } from './FormDecisaoEmpate';
import { PremiacaoPorTurma } from './PremiacaoPorTurma';

const empate: PremiacaoDaTurma = {
  turmaId: 't1',
  turma: '3º ano A',
  situacao: 'empate_a_decidir',
  publicacaoId: 'p1',
  itens: [
    {
      posicao: 1,
      descricao: 'Vale gastronômico',
      detalhes: null,
      equipes: [
        { id: 'e1', nome: 'Equipe Órbita' },
        { id: 'e2', nome: 'Equipe Vetor' },
      ],
      empate: true,
      semEquipePorEmpate: false,
      decisao: null,
    },
    {
      posicao: 2,
      descricao: 'Kit de estudos',
      detalhes: 'A confirmar',
      equipes: [],
      empate: false,
      semEquipePorEmpate: true,
      decisao: null,
    },
  ],
};

const aDefinir: PremiacaoDaTurma = {
  turmaId: 't2',
  turma: '3º ano B',
  situacao: 'a_definir',
  publicacaoId: null,
  itens: [{ ...empate.itens[0]!, equipes: [], empate: false }],
};

describe('PremiacaoPorTurma (spec 012, FR-018, FR-018a)', () => {
  it('um cartão por turma com a situação em texto e os prêmios', async () => {
    const { container } = render(<PremiacaoPorTurma premiacoes={[empate, aDefinir]} />);
    const a = screen.getByRole('region', { name: 'Premiação — 3º ano A' });
    expect(within(a).getByText('Empate a decidir')).toBeInTheDocument();
    expect(within(a).getByText('Vale gastronômico')).toBeInTheDocument();
    expect(within(a).getByText('Equipe Órbita, Equipe Vetor (empate)')).toBeInTheDocument();
    expect(
      within(a).getByText('Sem equipe nesta posição (empate na posição anterior)'),
    ).toBeInTheDocument();
    const b = screen.getByRole('region', { name: 'Premiação — 3º ano B' });
    expect(within(b).getByText('A definir')).toBeInTheDocument();
    expect(within(b).getByText('Aguardando a publicação definitiva')).toBeInTheDocument();
    expect(screen.getByText(/Valores, quantidade e condições dos prêmios/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('provisória marcada como não final; decisão registrada aparece no prêmio', () => {
    render(
      <PremiacaoPorTurma
        premiacoes={[
          { ...empate, situacao: 'provisorio' },
          {
            ...empate,
            turmaId: 't3',
            turma: '3º ano C',
            situacao: 'final',
            itens: [
              {
                ...empate.itens[0]!,
                equipes: [{ id: 'e1', nome: 'Equipe Órbita' }],
                decisao: {
                  decisao: 'Prêmio dividido entre as duas.',
                  premiadas: ['e1'],
                  justificativa: 'Critério da coordenação.',
                  decididoEm: '2026-11-04T12:00:00Z',
                },
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('Provisório — não final')).toBeInTheDocument();
    const c = screen.getByRole('region', { name: 'Premiação — 3º ano C' });
    expect(within(c).getByText('Final')).toBeInTheDocument();
    expect(
      within(c).getByText(/Decisão da coordenação: Prêmio dividido entre as duas\./),
    ).toBeInTheDocument();
  });

  it('o formulário de decisão aparece só no empate a decidir, quando permitido', () => {
    const renderizarDecisao = vi.fn(() => <p>Formulário de decisão</p>);
    render(
      <PremiacaoPorTurma premiacoes={[empate, aDefinir]} renderizarDecisao={renderizarDecisao} />,
    );
    expect(screen.getAllByText('Formulário de decisão')).toHaveLength(1);
    expect(renderizarDecisao).toHaveBeenCalledWith(empate, empate.itens[0]);
  });
});

describe('FormDecisaoEmpate (spec 012, FR-018b)', () => {
  it('escolhe entre as empatadas e só confirma depois do servidor', async () => {
    let concluir!: () => void;
    const onDecidir = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormDecisaoEmpate item={empate.itens[0]!} onDecidir={onDecidir} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Equipe Órbita' }));
    await userEvent.type(screen.getByLabelText('Decisão'), 'Prêmio para a Órbita.');
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Critério registrado em ata.');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar decisão' }));
    expect(onDecidir).toHaveBeenCalledWith({
      premiadas: ['e1'],
      decisao: 'Prêmio para a Órbita.',
      justificativa: 'Critério registrado em ata.',
    });
    expect(screen.queryByText(/Decisão registrada/)).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText(/Decisão registrada/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('exige ao menos uma equipe, a decisão e a justificativa', async () => {
    const onDecidir = vi.fn();
    render(<FormDecisaoEmpate item={empate.itens[0]!} onDecidir={onDecidir} />);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar decisão' }));
    expect(screen.getByText('Escolha ao menos uma equipe premiada.')).toBeInTheDocument();
    expect(screen.getByText('Descreva a decisão com 3 a 500 caracteres.')).toBeInTheDocument();
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    expect(onDecidir).not.toHaveBeenCalled();
  });

  it('na demonstração ou sem conexão, registrar fica indisponível', () => {
    render(
      <FormDecisaoEmpate
        item={empate.itens[0]!}
        onDecidir={vi.fn()}
        bloqueio="Indisponível no modo demonstração: nenhuma alteração é gravada."
      />,
    );
    expect(screen.getByRole('button', { name: 'Registrar decisão' })).toBeDisabled();
  });
});
