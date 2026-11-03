import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { REGRAS_PILOTO } from '../domain/regras-piloto';
import type { ItemHistorico } from '../domain/regrasTipos';
import { FormRegras } from './FormRegras';
import { HistoricoRegras } from './HistoricoRegras';

describe('FormRegras (US1, FR-001, FR-002, FR-007, FR-016)', () => {
  it('acrescenta critério e grava a versão só depois da resposta, com o rótulo sugerido', async () => {
    const usuario = userEvent.setup();
    let concluir!: () => void;
    const onGravar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormRegras regras={REGRAS_PILOTO} rotuloSugerido="2026.1" onGravar={onGravar} />,
    );
    const entrega = screen.getByRole('group', { name: 'Entrega e atrasos' });
    await usuario.click(within(entrega).getByRole('button', { name: 'Adicionar critério' }));
    const nomes = within(entrega).getAllByLabelText('Nome do critério');
    await usuario.type(nomes[nomes.length - 1]!, 'Documentação');
    const maximos = within(entrega).getAllByLabelText('Pontuação máxima');
    await usuario.clear(maximos[maximos.length - 1]!);
    await usuario.type(maximos[maximos.length - 1]!, '5');
    expect(screen.getByLabelText('Nome da versão')).toHaveValue('2026.1');
    await usuario.type(screen.getByLabelText('Justificativa'), 'Critério de documentação.');
    await usuario.click(screen.getByRole('button', { name: 'Gravar versão' }));
    const [regras, rotulo, justificativa] = onGravar.mock.calls[0] as unknown as [
      typeof REGRAS_PILOTO,
      string,
      string,
    ];
    expect(rotulo).toBe('2026.1');
    expect(justificativa).toBe('Critério de documentação.');
    expect(regras.entrega.criterios.at(-1)).toEqual({
      id: 'documentacao',
      rotulo: 'Documentação',
      maximo: 5,
    });
    expect(screen.queryByText('Versão das regras gravada.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Versão das regras gravada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('mostra erro por campo e não envia; prova oficial é só leitura; critério de atraso não sai', async () => {
    const usuario = userEvent.setup();
    const onGravar = vi.fn();
    render(<FormRegras regras={REGRAS_PILOTO} rotuloSugerido="2026.1" onGravar={onGravar} />);
    expect(screen.getByText(/valores do PRD \(HU04\)/)).toBeInTheDocument();
    const entrega = screen.getByRole('group', { name: 'Entrega e atrasos' });
    expect(
      within(entrega).getByRole('button', { name: 'Remover Organização e entrega' }),
    ).toBeDisabled();
    const apresentacao = screen.getByRole('group', { name: 'Apresentação' });
    const maximo = within(apresentacao).getAllByLabelText('Pontuação máxima')[0]!;
    await usuario.clear(maximo);
    await usuario.type(maximo, '0');
    await usuario.type(screen.getByLabelText('Justificativa'), 'Teste de validação.');
    await usuario.click(screen.getByRole('button', { name: 'Gravar versão' }));
    expect(
      within(apresentacao).getByText('A pontuação máxima precisa ser maior que zero.'),
    ).toBeInTheDocument();
    expect(onGravar).not.toHaveBeenCalled();
  });

  it('exige justificativa de pelo menos 10 caracteres', async () => {
    const usuario = userEvent.setup();
    const onGravar = vi.fn();
    render(<FormRegras regras={REGRAS_PILOTO} rotuloSugerido="2026.1" onGravar={onGravar} />);
    await usuario.click(screen.getByRole('button', { name: 'Gravar versão' }));
    expect(
      screen.getByText('Informe a justificativa (mínimo de 10 caracteres).'),
    ).toBeInTheDocument();
    expect(onGravar).not.toHaveBeenCalled();
  });
});

describe('HistoricoRegras (US1, US5)', () => {
  it('lista versões e ajustes com autor, horário e justificativa', async () => {
    const itens: ItemHistorico[] = [
      {
        tipo: 'turma',
        rotulo: null,
        valeDesde: '2026-11-03T12:00:00Z',
        autor: 'Marcos',
        papel: 'mentor',
        justificativa: 'Rubrica própria da turma.',
        grupos: ['apresentacao'],
      },
      {
        tipo: 'edicao',
        rotulo: 'v1',
        valeDesde: null,
        autor: null,
        papel: null,
        justificativa: null,
        grupos: [],
      },
    ];
    const { container } = render(<HistoricoRegras itens={itens} />);
    expect(screen.getByText(/Ajuste da turma: Apresentação/)).toBeInTheDocument();
    expect(screen.getByText(/Marcos \(mentor\)/)).toBeInTheDocument();
    expect(screen.getByText('Versão v1')).toBeInTheDocument();
    expect(screen.getByText('Vale desde o início da edição')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
