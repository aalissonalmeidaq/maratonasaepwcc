import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { Relatorio } from '../domain/tipos';
import { FormRelatorio } from './FormRelatorio';

const relatorio = (linhas: Relatorio['linhas']): Relatorio => ({
  colunas: [{ id: 'equipe', rotulo: 'Equipe', tipo: 'texto' }],
  linhas,
});

const props = {
  categorias: ['Categoria A', 'Categoria B'],
  turmas: [
    { id: 't-a', nome: '3º ano A' },
    { id: 't-b', nome: '3º ano B' },
  ],
  encontros: [{ id: 'en1', rotulo: '1. Abertura' }],
};

describe('FormRelatorio (US4, FR-007, FR-010, FR-012, SC-004)', () => {
  it('coordenação: 5 relatórios, filtros e o arquivo só depois da resposta do servidor', async () => {
    const usuario = userEvent.setup();
    let responder: (r: Relatorio) => void = () => {};
    const onExportar = vi.fn(
      () =>
        new Promise<Relatorio>((resolve) => {
          responder = resolve;
        }),
    );
    const baixar = vi.fn();
    const { container } = render(
      <FormRelatorio perfil="coordenacao" {...props} onExportar={onExportar} baixar={baixar} />,
    );
    const tipo = screen.getByRole('combobox', { name: 'Relatório' });
    expect(within(tipo).getAllByRole('option')).toHaveLength(5);
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), 'Categoria A');
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Turma' }), 't-a');
    await usuario.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    expect(onExportar).toHaveBeenCalledWith('pontos', {
      categoria: 'Categoria A',
      turmaId: 't-a',
      encontroId: null,
    });
    expect(baixar).not.toHaveBeenCalled();
    responder(relatorio([{ equipe: 'Órbita' }, { equipe: 'Vetor' }]));
    expect(await screen.findByText('2 linhas exportadas.')).toBeInTheDocument();
    expect(baixar).toHaveBeenCalledTimes(1);
    const [nome, conteudo] = baixar.mock.calls[0] as [string, string];
    expect(nome).toMatch(/^maratona-pontos-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(conteudo).toBe('﻿Equipe\r\nÓrbita\r\nVetor');
    expect(
      screen.getByText(/não trazem nota individual da prova oficial, e-mail/),
    ).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('docente: sem categoria e sem pedidos de revisão', () => {
    render(<FormRelatorio perfil="docente" {...props} onExportar={vi.fn()} baixar={vi.fn()} />);
    expect(screen.queryByRole('combobox', { name: 'Categoria' })).not.toBeInTheDocument();
    const tipo = screen.getByRole('combobox', { name: 'Relatório' });
    expect(
      within(tipo)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).not.toContain('Pedidos de revisão');
  });

  it('sem registros: arquivo só com o cabeçalho e o aviso', async () => {
    const usuario = userEvent.setup();
    const baixar = vi.fn();
    render(
      <FormRelatorio
        perfil="coordenacao"
        {...props}
        onExportar={vi.fn().mockResolvedValue(relatorio([]))}
        baixar={baixar}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(
      await screen.findByText('Nenhum registro para os filtros escolhidos'),
    ).toBeInTheDocument();
    expect(baixar).toHaveBeenCalledWith(expect.any(String), '﻿Equipe');
  });

  it('recusa do servidor: mensagem e nenhum arquivo', async () => {
    const usuario = userEvent.setup();
    const baixar = vi.fn();
    render(
      <FormRelatorio
        perfil="docente"
        {...props}
        onExportar={vi.fn().mockRejectedValue(new Error('Você não atua nesta turma.'))}
        baixar={baixar}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(await screen.findByText('Você não atua nesta turma.')).toBeInTheDocument();
    expect(baixar).not.toHaveBeenCalled();
  });

  it('sem conexão ou na demonstração: exportação desabilitada com o motivo', () => {
    render(
      <FormRelatorio
        perfil="coordenacao"
        {...props}
        bloqueio="Sem conexão: a exportação exige conexão com o servidor."
        onExportar={vi.fn()}
        baixar={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });

  it('analista (spec 016): 4 relatórios, sem pedidos de revisão, com os filtros da edição inteira', () => {
    render(<FormRelatorio perfil="analista" {...props} onExportar={vi.fn()} baixar={vi.fn()} />);
    const tipo = screen.getByRole('combobox', { name: 'Relatório' });
    const opcoes = within(tipo)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opcoes).toHaveLength(4);
    expect(opcoes).not.toContain('Pedidos de revisão');
    expect(screen.queryByRole('combobox', { name: 'Categoria' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Turma' })).toHaveDisplayValue('Todas as turmas');
  });
});
