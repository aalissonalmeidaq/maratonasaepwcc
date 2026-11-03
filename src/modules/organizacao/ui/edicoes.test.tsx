import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { EdicaoGerida } from '../domain/edicoes';
import { FormDadosDaEdicao, FormEdicao } from './FormEdicao';
import { ListaEdicoes } from './ListaEdicoes';

const edicoes: EdicaoGerida[] = [
  {
    id: 'e1',
    nome: 'Maratona 2026',
    inicio: '2026-03-02',
    fim: '2026-11-27',
    estado: 'ativa',
    regrasVersao: 'v1',
  },
  {
    id: 'e2',
    nome: 'Maratona 2027',
    inicio: null,
    fim: null,
    estado: 'rascunho',
    regrasVersao: 'v1',
  },
  {
    id: 'e3',
    nome: 'Maratona 2025',
    inicio: '2025-03-03',
    fim: '2025-11-28',
    estado: 'encerrada',
    regrasVersao: 'v0',
  },
];

describe('ListaEdicoes (US1, FR-018)', () => {
  it('mostra nome, selo de estado em texto, período e versão das regras', async () => {
    const onEscolher = vi.fn();
    const { container } = render(
      <ListaEdicoes edicoes={edicoes} escolhidaId="e1" onEscolher={onEscolher} />,
    );
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('Em preparação')).toBeInTheDocument();
    expect(screen.getByText('Encerrada')).toBeInTheDocument();
    expect(screen.getByText(/Período a definir/)).toBeInTheDocument();
    expect(screen.getAllByText(/Regras: v1/)).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Gerir: Maratona 2027' }));
    expect(onEscolher).toHaveBeenCalledWith('e2');
    expect(screen.getByRole('button', { name: 'Gerir: Maratona 2026' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(await violacoesA11y(container)).toEqual([]);
  });
});

describe('FormEdicao (US1, FR-001)', () => {
  it('cria só depois da resposta do servidor, com a base escolhida e a mesma chave no reenvio', async () => {
    const usuario = userEvent.setup();
    let concluir!: () => void;
    const onCriar = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Sem conexão com o servidor. Nada foi gravado; tente novamente.'),
      )
      .mockImplementationOnce(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormEdicao basesPossiveis={edicoes.slice(0, 1)} onCriar={onCriar} />,
    );
    await usuario.type(screen.getByLabelText('Nome'), '  Maratona 2028 ');
    await usuario.type(screen.getByLabelText('Início'), '2028-03-01');
    await usuario.click(screen.getByRole('radio', { name: 'Copiar de uma edição que coordeno' }));
    await usuario.selectOptions(screen.getByLabelText('Edição de origem'), 'e1');
    await usuario.click(screen.getByRole('button', { name: 'Criar edição' }));
    expect(await screen.findByText(/Nada foi gravado/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Criar edição' }));
    expect(onCriar).toHaveBeenCalledTimes(2);
    const [chave1, dados, base] = onCriar.mock.calls[0]!;
    expect(onCriar.mock.calls[1]![0]).toBe(chave1);
    expect(dados).toEqual({ nome: 'Maratona 2028', inicio: '2028-03-01', fim: null });
    expect(base).toBe('e1');
    expect(screen.queryByText('Edição criada.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Edição criada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('valida nome e período antes de enviar; base padrão são as regras do piloto', async () => {
    const usuario = userEvent.setup();
    const onCriar = vi.fn().mockResolvedValue('nova');
    render(<FormEdicao basesPossiveis={[]} onCriar={onCriar} />);
    expect(screen.getByRole('radio', { name: 'Regras do piloto (a confirmar)' })).toBeChecked();
    await usuario.type(screen.getByLabelText('Nome'), 'ab');
    await usuario.type(screen.getByLabelText('Início'), '2028-05-02');
    await usuario.type(screen.getByLabelText('Fim'), '2028-05-01');
    await usuario.click(screen.getByRole('button', { name: 'Criar edição' }));
    expect(screen.getByText('Informe um nome de 3 a 160 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('O fim não pode ser antes do início.')).toBeInTheDocument();
    expect(onCriar).not.toHaveBeenCalled();
  });
});

describe('FormDadosDaEdicao (US1, FR-003)', () => {
  it('salva nome e período só depois da resposta; edição encerrada fica só leitura', async () => {
    const usuario = userEvent.setup();
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    const { container, rerender } = render(
      <FormDadosDaEdicao edicao={edicoes[0]!} onSalvar={onSalvar} />,
    );
    const nome = screen.getByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.type(nome, 'Maratona 2026 (revista)');
    await usuario.click(screen.getByRole('button', { name: 'Salvar dados' }));
    expect(onSalvar).toHaveBeenCalledWith({
      nome: 'Maratona 2026 (revista)',
      inicio: '2026-03-02',
      fim: '2026-11-27',
    });
    expect(await screen.findByText('Dados da edição salvos.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
    rerender(<FormDadosDaEdicao edicao={edicoes[2]!} onSalvar={onSalvar} />);
    expect(screen.getByLabelText('Nome')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar dados' })).not.toBeInTheDocument();
  });
});
