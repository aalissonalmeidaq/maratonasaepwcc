import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { REGRAS_PILOTO } from '../domain/regras-piloto';
import { GRUPOS_DO_MENTOR, type AjustesDaTurma, type RegrasDaTurma } from '../domain/regrasTipos';
import { FormAjustesTurma } from './FormAjustesTurma';

const daTurma = (parcial: Partial<RegrasDaTurma> = {}): RegrasDaTurma => ({
  regras: REGRAS_PILOTO,
  gruposAjustados: [],
  ajusteId: null,
  versao: REGRAS_PILOTO.versao,
  maximo: 0,
  encontrosExcluidos: [],
  podeAjustar: [...GRUPOS_DO_MENTOR],
  ...parcial,
});

describe('FormAjustesTurma (US2, FR-004, FR-005, FR-010)', () => {
  it('mentor define a apresentação da turma, mantém as penalidades da coordenação e conclui só após a resposta', async () => {
    const usuario = userEvent.setup();
    let concluir!: () => void;
    const onGravar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormAjustesTurma
        dados={daTurma({ gruposAjustados: ['penalidades'], ajusteId: 'aj-1' })}
        onGravar={onGravar}
      />,
    );
    expect(screen.queryByRole('group', { name: 'Penalidades' })).not.toBeInTheDocument();
    const apresentacao = screen.getByRole('group', { name: 'Apresentação' });
    expect(within(apresentacao).getByRole('radio', { name: 'Herdar da edição' })).toBeChecked();
    await usuario.click(within(apresentacao).getByRole('radio', { name: 'Definir para a turma' }));
    await usuario.click(within(apresentacao).getByRole('button', { name: 'Adicionar critério' }));
    const nomes = within(apresentacao).getAllByLabelText('Nome do critério');
    await usuario.type(nomes[nomes.length - 1]!, 'Demonstração');
    await usuario.type(screen.getByLabelText('Justificativa'), 'Rubrica própria da turma.');
    await usuario.click(screen.getByRole('button', { name: 'Gravar regras da turma' }));
    const [grupos, justificativa] = onGravar.mock.calls[0] as unknown as [AjustesDaTurma, string];
    expect(justificativa).toBe('Rubrica própria da turma.');
    expect(Object.keys(grupos).sort()).toEqual(['apresentacao', 'penalidades']);
    expect(grupos.apresentacao?.criterios.at(-1)).toEqual({
      id: 'demonstracao',
      rotulo: 'Demonstração',
      maximo: 1,
    });
    expect(screen.queryByText('Regras da turma gravadas.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Regras da turma gravadas.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('voltar a herdar retira o grupo; exige justificativa; erro por campo não envia', async () => {
    const usuario = userEvent.setup();
    const onGravar = vi.fn(() => Promise.resolve());
    render(
      <FormAjustesTurma
        dados={daTurma({ gruposAjustados: ['apresentacao', 'questoes'], ajusteId: 'aj-1' })}
        onGravar={onGravar}
      />,
    );
    const questoes = screen.getByRole('group', { name: 'Questões' });
    const maximo = within(questoes).getByLabelText('Pontuação máxima das questões');
    await usuario.clear(maximo);
    await usuario.type(maximo, '0');
    await usuario.click(screen.getByRole('button', { name: 'Gravar regras da turma' }));
    expect(
      screen.getByText('Informe a justificativa (mínimo de 10 caracteres).'),
    ).toBeInTheDocument();
    expect(onGravar).not.toHaveBeenCalled();

    await usuario.click(within(questoes).getByRole('radio', { name: 'Herdar da edição' }));
    await usuario.click(
      within(screen.getByRole('group', { name: 'Apresentação' })).getByRole('radio', {
        name: 'Herdar da edição',
      }),
    );
    await usuario.type(screen.getByLabelText('Justificativa'), 'Volta a herdar da edição.');
    await usuario.click(screen.getByRole('button', { name: 'Gravar regras da turma' }));
    expect(onGravar).toHaveBeenCalledWith({}, 'Volta a herdar da edição.');
  });

  it('sem grupos ajustáveis mostra só a leitura', () => {
    render(<FormAjustesTurma dados={daTurma({ podeAjustar: [] })} onGravar={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: 'Gravar regras da turma' }),
    ).not.toBeInTheDocument();
  });
});
