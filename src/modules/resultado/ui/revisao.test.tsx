import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PedidoRevisao } from '../domain/tipos';
import { FormPedidoRevisao } from './FormPedidoRevisao';
import { FormRespostaRevisao } from './FormRespostaRevisao';
import { ListaRevisoes } from './ListaRevisoes';

const SEM_CONEXAO = 'Sem conexão: gravações exigem conexão com o servidor.';

describe('FormPedidoRevisao (US5, FR-020)', () => {
  it('publicação: componente e encontro; chave de envio; confirma só após o servidor', async () => {
    let concluir!: () => void;
    const onPedir = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(
      <FormPedidoRevisao
        objeto="publicacao"
        prazo="2026-11-02T15:00:00Z"
        encontros={[{ id: 'en1', rotulo: '1. Abertura' }]}
        onPedir={onPedir}
      />,
    );
    expect(screen.getByText(/até/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Componente'), 'Presença');
    await userEvent.selectOptions(screen.getByLabelText('Encontro (opcional)'), '1. Abertura');
    await userEvent.type(
      screen.getByLabelText('Motivo do pedido'),
      'A presença do encontro 1 não foi registrada.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pedir revisão' }));
    expect(onPedir).toHaveBeenCalledWith({
      chave: expect.stringMatching(/^[0-9a-f-]{36}$/),
      componente: 'presenca',
      encontroId: 'en1',
      justificativa: 'A presença do encontro 1 não foi registrada.',
    });
    expect(screen.queryByText(/Pedido enviado/)).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText(/Pedido enviado/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('ocorrência: sem componente; exige o motivo', async () => {
    const onPedir = vi.fn();
    render(
      <FormPedidoRevisao objeto="ocorrencia" prazo="2026-11-02T15:00:00Z" onPedir={onPedir} />,
    );
    expect(screen.queryByLabelText('Componente')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pedir revisão' }));
    expect(screen.getByText('Explique o pedido com pelo menos 10 caracteres.')).toBeInTheDocument();
    expect(onPedir).not.toHaveBeenCalled();
  });

  it('sem conexão: pedido desabilitado com o motivo (FR-025)', () => {
    render(
      <FormPedidoRevisao
        objeto="ocorrencia"
        prazo="2026-11-02T15:00:00Z"
        onPedir={vi.fn()}
        bloqueio={SEM_CONEXAO}
      />,
    );
    expect(screen.getByRole('button', { name: 'Pedir revisão' })).toBeDisabled();
    expect(screen.getByText(SEM_CONEXAO)).toBeInTheDocument();
  });
});

const pedido: PedidoRevisao = {
  id: 'r1',
  duplaId: 'e1',
  duplaNome: 'Equipe Órbita',
  objeto: 'publicacao',
  ocorrenciaId: null,
  publicacaoId: 'p2',
  publicacaoVersao: 2,
  componente: 'presenca',
  encontroId: 'en1',
  encontroNumero: 1,
  justificativa: 'A presença do encontro 1 não foi registrada.',
  estado: 'aberto',
  resposta: null,
  respondidoEm: null,
  criadoEm: '2026-11-01T16:00:00Z',
  autorNome: 'Ana',
  correcoes: [
    { tabela: 'presencas', ocorridoEm: '2026-11-01T17:00:00Z', justificativa: 'Lista assinada.' },
  ],
};

describe('ListaRevisoes (US5, FR-021, FR-022)', () => {
  it('objeto, estado em texto, correções ligadas e atalho para a correção de origem', async () => {
    const { container } = render(
      <MemoryRouter>
        <ListaRevisoes
          pedidos={[
            pedido,
            {
              ...pedido,
              id: 'r2',
              estado: 'deferido',
              resposta: 'Corrigido.',
              respondidoEm: '2026-11-01T18:00:00Z',
            },
          ]}
          linkCorrecao={(p) => `/coordenacao/presenca?pedido=${p.id}`}
        />
      </MemoryRouter>,
    );
    const itens = screen.getAllByRole('listitem').filter((li) => li.querySelector('h3'));
    expect(within(itens[0]!).getByText('Aberto')).toBeInTheDocument();
    expect(within(itens[0]!).getByText(/Presença — encontro 1 \(versão 2\)/)).toBeInTheDocument();
    expect(within(itens[0]!).getByText(/Lista assinada/)).toBeInTheDocument();
    expect(within(itens[0]!).getByRole('link', { name: 'Corrigir presença' })).toHaveAttribute(
      'href',
      '/coordenacao/presenca?pedido=r1',
    );
    expect(within(itens[1]!).getByText('Deferido')).toBeInTheDocument();
    expect(within(itens[1]!).getByText('Corrigido.')).toBeInTheDocument();
    expect(within(itens[1]!).queryByRole('link')).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem pedidos: estado vazio', () => {
    render(<ListaRevisoes pedidos={[]} />);
    expect(screen.getByText('Nenhum pedido de revisão.')).toBeInTheDocument();
  });
});

describe('FormRespostaRevisao (FR-021)', () => {
  it('defere ou indefere com justificativa; confirma após o servidor', async () => {
    const onResponder = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<FormRespostaRevisao onResponder={onResponder} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Indeferir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Responder pedido' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Justificativa da resposta'),
      'Registro conferido e mantido.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Responder pedido' }));
    expect(onResponder).toHaveBeenCalledWith({
      resposta: 'indeferido',
      justificativa: 'Registro conferido e mantido.',
    });
    expect(await screen.findByText('Resposta registrada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem conexão: resposta desabilitada', () => {
    render(<FormRespostaRevisao onResponder={vi.fn()} bloqueio={SEM_CONEXAO} />);
    expect(screen.getByRole('button', { name: 'Responder pedido' })).toBeDisabled();
  });
});
