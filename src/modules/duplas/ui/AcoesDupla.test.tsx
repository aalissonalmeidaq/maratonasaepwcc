import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { AcoesDupla } from './AcoesDupla';

const dupla = {
  id: 'd1',
  nome: null,
  integrantes: [
    { estudanteId: 'a', nome: 'Ana Exemplo' },
    { estudanteId: 'b', nome: 'Bruno Exemplo', integranteInativo: true },
  ],
};
const trio = {
  ...dupla,
  integrantes: [...dupla.integrantes, { estudanteId: 'c', nome: 'Carla Exemplo' }],
};
const disponiveis = [{ id: 'x', nome: 'Xavier Exemplo' }];

const acoes = () => ({
  onSubstituir: vi.fn().mockResolvedValue(undefined),
  onIncluir: vi.fn().mockResolvedValue(undefined),
  onRemover: vi.fn().mockResolvedValue(undefined),
  onDesfazer: vi.fn().mockResolvedValue(undefined),
});

const opcoes = () => screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent);

describe('AcoesDupla (US4)', () => {
  it('dupla sem trio permitido: substituir ou desfazer, sem remoção isolada (FR-012)', async () => {
    const { container } = render(
      <AcoesDupla dupla={dupla} disponiveis={disponiveis} permiteTrio={false} {...acoes()} />,
    );
    expect(opcoes()).toEqual(['Substituir integrante', 'Desfazer equipe']);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('dupla em turma que permite trio: inclui aluno sem equipe com justificativa', async () => {
    const a = acoes();
    let concluir!: () => void;
    a.onIncluir.mockImplementation(() => new Promise<void>((r) => (concluir = r)));
    render(<AcoesDupla dupla={dupla} disponiveis={disponiveis} permiteTrio {...a} />);
    expect(opcoes()).toEqual(['Substituir integrante', 'Incluir integrante', 'Desfazer equipe']);
    await userEvent.click(screen.getByLabelText('Incluir integrante'));
    await userEvent.selectOptions(screen.getByLabelText('Entra'), 'x');
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Aluno que ficou sem equipe');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar inclusão' }));
    expect(a.onIncluir).toHaveBeenCalledWith({
      estudante: 'x',
      justificativa: 'Aluno que ficou sem equipe',
    });
    expect(screen.queryByText('Integrante incluído.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByRole('status')).toHaveTextContent('Integrante incluído.');
  });

  it('trio: permite remover um integrante e não oferece inclusão', async () => {
    const a = acoes();
    render(<AcoesDupla dupla={trio} disponiveis={disponiveis} permiteTrio {...a} />);
    expect(opcoes()).toEqual(['Substituir integrante', 'Remover integrante', 'Desfazer equipe']);
    await userEvent.click(screen.getByLabelText('Remover integrante'));
    await userEvent.selectOptions(screen.getByLabelText('Sai'), 'c');
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Saída do trio aprovada');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar remoção' }));
    expect(a.onRemover).toHaveBeenCalledWith({
      estudante: 'c',
      justificativa: 'Saída do trio aprovada',
    });
  });

  it('sem justificativa suficiente, nada chega ao servidor', async () => {
    const a = acoes();
    render(<AcoesDupla dupla={dupla} disponiveis={disponiveis} permiteTrio={false} {...a} />);
    await userEvent.selectOptions(screen.getByLabelText('Sai'), 'a');
    await userEvent.selectOptions(screen.getByLabelText('Entra'), 'x');
    await userEvent.type(screen.getByLabelText('Justificativa'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar substituição' }));
    expect(screen.getByText(/pelo menos 10 caracteres/)).toBeInTheDocument();
    expect(a.onSubstituir).not.toHaveBeenCalled();
  });

  it('docente/mentor renomeiam equipe que já escolheu o nome (FR-008)', async () => {
    const onRenomear = vi.fn().mockResolvedValue(undefined);
    render(
      <AcoesDupla
        dupla={{ ...dupla, nome: 'Equipe Órbita' }}
        disponiveis={disponiveis}
        permiteTrio={false}
        onRenomear={onRenomear}
        {...acoes()}
      />,
    );
    expect(opcoes()).toEqual(['Substituir integrante', 'Renomear equipe', 'Desfazer equipe']);
    await userEvent.click(screen.getByLabelText('Renomear equipe'));
    await userEvent.type(screen.getByLabelText('Novo nome'), 'Equipe Vetor');
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Nome inadequado para o evento');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar novo nome' }));
    expect(onRenomear).toHaveBeenCalledWith({
      nome: 'Equipe Vetor',
      justificativa: 'Nome inadequado para o evento',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Equipe renomeada.');
  });

  it('sem nome escolhido pela equipe, a gestão não oferece renomear', () => {
    render(
      <AcoesDupla
        dupla={dupla}
        disponiveis={disponiveis}
        permiteTrio={false}
        onRenomear={vi.fn()}
        {...acoes()}
      />,
    );
    expect(screen.queryByLabelText('Renomear equipe')).not.toBeInTheDocument();
  });

  it('coordenação não renomeia (sem a ação de renomear)', () => {
    render(
      <AcoesDupla
        dupla={{ ...dupla, nome: 'Equipe Órbita' }}
        disponiveis={disponiveis}
        permiteTrio={false}
        {...acoes()}
      />,
    );
    expect(screen.queryByLabelText('Renomear equipe')).not.toBeInTheDocument();
  });

  it('sinaliza integrante inativo para a gestão decidir (FR-011)', () => {
    render(<AcoesDupla dupla={dupla} disponiveis={disponiveis} permiteTrio={false} {...acoes()} />);
    expect(
      screen.getByRole('option', { name: 'Bruno Exemplo (integrante inativo)' }),
    ).toBeInTheDocument();
  });
});
