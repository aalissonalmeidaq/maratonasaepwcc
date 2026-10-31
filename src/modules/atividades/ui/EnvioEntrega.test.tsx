import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGRAS_PILOTO } from '@/modules/pontuacao';
import { violacoesA11y } from '@/test/a11y';
import type { Comprovante, DesafioDaEquipe } from '../domain/tipos';
import { EnvioEntrega } from './EnvioEntrega';

const AGORA = new Date('2026-11-05T15:00:00-03:00');

const desafio: DesafioDaEquipe = {
  id: 'd1',
  edicaoId: 'ed',
  encontroId: 'en4',
  titulo: 'Projeto final',
  enunciado: 'Construa.',
  recursosPermitidos: '',
  politicaIa: '',
  prazo: '2026-11-05T16:30:00-03:00',
  aceitaArquivo: true,
  aceitaLink: true,
  estado: 'publicado',
  turmas: ['ta'],
  duplaId: 'e1',
  prazoEfetivo: '2026-11-05T16:30:00-03:00',
  encerrado: false,
  entregas: [],
  avaliacao: null,
};

const comprovante: Comprovante = {
  protocolo: 'ENT-20261105-ABC123',
  recebidaEm: '2026-11-05T18:00:00Z',
  versao: 1,
  atrasoMinutos: 0,
  descontoPrevisto: 0,
};

const pdf = () => new File(['%PDF'], 'trabalho.pdf', { type: 'application/pdf' });

function renderizar(props: Partial<Parameters<typeof EnvioEntrega>[0]> = {}) {
  return render(
    <EnvioEntrega
      desafio={desafio}
      regras={REGRAS_PILOTO}
      agora={() => AGORA}
      enviar={vi.fn().mockResolvedValue(comprovante)}
      {...props}
    />,
  );
}

describe('EnvioEntrega (US1, FR-003/004, SC-002)', () => {
  it('envia o arquivo e só mostra o comprovante depois do servidor', async () => {
    let concluir!: (c: Comprovante) => void;
    const enviar = vi.fn(() => new Promise<Comprovante>((r) => (concluir = r)));
    const { container } = renderizar({ enviar });
    await userEvent.upload(screen.getByLabelText('Arquivo da entrega'), pdf());
    await userEvent.click(screen.getByRole('button', { name: 'Enviar entrega' }));
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ arquivo: expect.any(File), link: undefined }),
    );
    expect(screen.queryByText(/Entrega recebida pelo servidor/)).not.toBeInTheDocument();
    concluir(comprovante);
    const sucesso = await screen.findByRole('status');
    expect(sucesso).toHaveTextContent('Entrega recebida pelo servidor');
    expect(sucesso).toHaveTextContent('ENT-20261105-ABC123');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('erro do servidor: "A entrega não foi recebida", com o motivo; nada aparece como enviado', async () => {
    const enviar = vi
      .fn()
      .mockRejectedValue(new Error('O prazo de entrega terminou e a entrega não é mais aceita.'));
    renderizar({ enviar });
    await userEvent.type(screen.getByLabelText('Link da entrega'), 'https://exemplo.invalid/x');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar entrega' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('A entrega não foi recebida');
    expect(alerta).toHaveTextContent('O prazo de entrega terminou');
    expect(screen.queryByText(/Entrega recebida pelo servidor/)).not.toBeInTheDocument();
  });

  it('nova tentativa depois da falha reaproveita a mesma chave (repetição segura)', async () => {
    const enviar = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Sem conexão com o servidor. Nada foi gravado; tente novamente.'),
      )
      .mockResolvedValueOnce(comprovante);
    renderizar({ enviar });
    await userEvent.type(screen.getByLabelText('Link da entrega'), 'https://exemplo.invalid/x');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar entrega' }));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar entrega' }));
    await screen.findByRole('status');
    expect(enviar.mock.calls[0]![0].chave).toBe(enviar.mock.calls[1]![0].chave);
  });

  it('valida arquivo e link no navegador', async () => {
    const enviar = vi.fn();
    renderizar({ enviar });
    await userEvent.click(screen.getByRole('button', { name: 'Enviar entrega' }));
    expect(screen.getByText('Envie um arquivo ou um link.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Link da entrega'), 'ftp://x');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar entrega' }));
    expect(screen.getByText('Informe um link válido (http ou https).')).toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('só mostra as formas que o desafio aceita', () => {
    renderizar({ desafio: { ...desafio, aceitaArquivo: false } });
    expect(screen.queryByLabelText('Arquivo da entrega')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Link da entrega')).toBeInTheDocument();
  });

  it('dentro da tolerância avisa o atraso e o desconto previsto', () => {
    renderizar({ agora: () => new Date('2026-11-05T16:40:00-03:00') });
    expect(
      screen.getByText(
        /Prazo encerrado há 10 min: a entrega será registrada com atraso e desconto previsto de 2 pontos/,
      ),
    ).toBeInTheDocument();
  });

  it('comprovante com atraso informa o desconto no critério das regras', async () => {
    renderizar({
      enviar: vi.fn().mockResolvedValue({ ...comprovante, atrasoMinutos: 10, descontoPrevisto: 2 }),
    });
    await userEvent.type(screen.getByLabelText('Link da entrega'), 'https://exemplo.invalid/x');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar entrega' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Atraso de 10 min: desconto previsto de 2 pontos em Organização e entrega.',
    );
  });

  it('sem equipe, encerrado, sem conexão ou na demonstração: não envia', () => {
    const { unmount } = renderizar({ desafio: { ...desafio, duplaId: null } });
    expect(
      screen.getByText('Você precisa fazer parte de uma equipe para enviar.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar entrega' })).not.toBeInTheDocument();
    unmount();
    const r2 = renderizar({ desafio: { ...desafio, encerrado: true } });
    expect(screen.getByText('Prazo encerrado: a entrega não é mais aceita.')).toBeInTheDocument();
    r2.unmount();
    const r3 = renderizar({ bloqueio: 'Sem conexão: gravações exigem conexão com o servidor.' });
    expect(screen.getByRole('button', { name: 'Enviar entrega' })).toBeDisabled();
    r3.unmount();
    renderizar({ enviar: null });
    expect(screen.getByText(/Envio indisponível no modo demonstração/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar entrega' })).toBeDisabled();
  });

  it('histórico de versões com protocolo, autor e atraso', async () => {
    const onBaixar = vi.fn();
    renderizar({
      onBaixar,
      desafio: {
        ...desafio,
        entregas: [
          {
            ...comprovante,
            id: 'v2',
            versao: 2,
            protocolo: 'ENT-2',
            autorNome: 'Ana',
            arquivoPath: 'd1/e1/k.pdf',
            arquivoNome: 'final.pdf',
            link: null,
            atrasoMinutos: 5,
            descontoPrevisto: 2,
          },
          {
            ...comprovante,
            id: 'v1',
            versao: 1,
            protocolo: 'ENT-1',
            autorNome: 'Bruno',
            arquivoPath: null,
            arquivoNome: null,
            link: 'https://a.b',
          },
        ],
      },
    });
    const historico = screen.getByRole('list', { name: 'Versões enviadas' });
    expect(within(historico).getAllByRole('listitem')).toHaveLength(2);
    expect(historico).toHaveTextContent('Versão 2');
    expect(historico).toHaveTextContent('Ana');
    expect(historico).toHaveTextContent('atraso de 5 min');
    await userEvent.click(within(historico).getByRole('button', { name: 'Baixar final.pdf' }));
    expect(onBaixar).toHaveBeenCalledWith('d1/e1/k.pdf');
  });
});
