import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { ListaParaEquipe } from '../domain/tipos';
import { FormLista } from './FormLista';
import { ResponderLista } from './ResponderLista';
import { ResultadoLista } from './ResultadoLista';

const lista: ListaParaEquipe = {
  id: 'l1',
  titulo: 'Questões do encontro 1',
  prazo: '2026-11-05T16:30:00-03:00',
  encerrada: false,
  versao: 1,
  submissao: null,
  questoes: [
    {
      id: 'q1',
      enunciado: 'Quanto é 2 + 2?',
      capacidade: 'Raciocínio',
      alternativas: [
        { id: 'a1', texto: '3' },
        { id: 'a2', texto: '4' },
      ],
    },
    {
      id: 'q2',
      enunciado: 'Capital do Ceará?',
      capacidade: '',
      alternativas: [
        { id: 'b1', texto: 'Fortaleza' },
        { id: 'b2', texto: 'Sobral' },
      ],
    },
  ],
};

describe('FormLista (US4, FR-016)', () => {
  it('monta questões com alternativas e uma correta; confirma só após o servidor', async () => {
    const onSalvar = vi.fn().mockResolvedValue('l1');
    const { container } = render(
      <FormLista
        encontros={[{ id: 'en1', numero: 1, titulo: 'Encontro 1' }]}
        turmas={[{ id: 'ta', nome: '3º ano A' }]}
        onSalvar={onSalvar}
      />,
    );
    await userEvent.type(screen.getByLabelText('Título'), 'Lista 1');
    await userEvent.type(screen.getByLabelText('Prazo'), '2026-11-20T16:30');
    await userEvent.type(screen.getByLabelText('Enunciado da questão 1'), 'Quanto é 2 + 2?');
    await userEvent.type(screen.getByLabelText('Alternativa A da questão 1'), '3');
    await userEvent.type(screen.getByLabelText('Alternativa B da questão 1'), '4');
    await userEvent.click(
      screen.getByRole('radio', { name: 'Alternativa B da questão 1 é a correta' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar alternativa à questão 1' }),
    );
    await userEvent.type(screen.getByLabelText('Alternativa C da questão 1'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Lista 1',
        turmas: ['ta'],
        questoes: [
          {
            enunciado: 'Quanto é 2 + 2?',
            justificativa: '',
            capacidade: '',
            alternativas: [
              { texto: '3', correta: false },
              { texto: '4', correta: true },
              { texto: '5', correta: false },
            ],
          },
        ],
      }),
    );
    expect(await screen.findByText('Lista salva como rascunho.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('exige alternativa correta marcada', async () => {
    const onSalvar = vi.fn();
    render(
      <FormLista
        encontros={[{ id: 'en1', numero: 1, titulo: 'Encontro 1' }]}
        turmas={[{ id: 'ta', nome: '3º ano A' }]}
        onSalvar={onSalvar}
      />,
    );
    await userEvent.type(screen.getByLabelText('Título'), 'Lista 1');
    await userEvent.type(screen.getByLabelText('Prazo'), '2026-11-20T16:30');
    await userEvent.type(screen.getByLabelText('Enunciado da questão 1'), 'Q?');
    await userEvent.type(screen.getByLabelText('Alternativa A da questão 1'), 'a');
    await userEvent.type(screen.getByLabelText('Alternativa B da questão 1'), 'b');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(screen.getByText('Marque a alternativa correta da questão 1.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('sem conexão: salvar bloqueado com o motivo (FR-024)', () => {
    render(
      <FormLista
        encontros={[{ id: 'en1', numero: 1, titulo: 'Encontro 1' }]}
        turmas={[{ id: 'ta', nome: '3º ano A' }]}
        onSalvar={vi.fn()}
        bloqueio="Sem conexão: gravações exigem conexão com o servidor."
      />,
    );
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
  });
});

describe('ResponderLista (US4, FR-018)', () => {
  it('confirma o envio único e mostra quem enviou só após o servidor', async () => {
    let concluir!: (r: { enviadaEm: string; autorNome: string }) => void;
    const enviar = vi.fn(
      () => new Promise<{ enviadaEm: string; autorNome: string }>((r) => (concluir = r)),
    );
    const { container } = render(<ResponderLista lista={lista} enviar={enviar} />);
    expect(screen.getByRole('group', { name: '1. Quanto é 2 + 2?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar respostas da equipe' }));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('A equipe só pode enviar uma vez.');
    expect(dialogo).toHaveTextContent('1 questão sem resposta conta como erro.');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar agora' }));
    expect(enviar).toHaveBeenCalledWith({ q1: 'a2' }, expect.any(String));
    concluir({ enviadaEm: '2026-11-05T18:00:00Z', autorNome: 'Ana' });
    expect(await screen.findByText(/Respostas enviadas por Ana em/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('já enviada: mostra quem enviou e não oferece novo envio', () => {
    render(
      <ResponderLista
        lista={{ ...lista, submissao: { autorNome: 'Bruno', enviadaEm: '2026-11-05T18:00:00Z' } }}
        enviar={vi.fn()}
      />,
    );
    expect(screen.getByText(/Respostas enviadas por Bruno em/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Enviar respostas da equipe' }),
    ).not.toBeInTheDocument();
  });

  it('sem equipe, sem conexão ou na demonstração: não envia', () => {
    const { unmount } = render(<ResponderLista lista={lista} enviar={vi.fn()} semEquipe />);
    expect(
      screen.getByText('Você precisa fazer parte de uma equipe para enviar.'),
    ).toBeInTheDocument();
    unmount();
    render(<ResponderLista lista={lista} enviar={null} bloqueio="Sem conexão." />);
    expect(screen.getByRole('button', { name: 'Enviar respostas da equipe' })).toBeDisabled();
  });
});

describe('ResultadoLista (US4, FR-017/020)', () => {
  const encerrada: ListaParaEquipe = {
    ...lista,
    encerrada: true,
    questoes: [
      { ...lista.questoes[0]!, gabarito: 'a2', justificativa: 'Soma simples.' },
      { ...lista.questoes[1]!, gabarito: 'b1', justificativa: 'Capital do estado.' },
    ],
    submissao: {
      autorNome: 'Ana',
      enviadaEm: '2026-11-05T18:00:00Z',
      respostas: { q1: 'a2', q2: 'b2' },
      acertos: 1,
      total: 2,
    },
  };

  it('depois do prazo: respostas, gabarito, justificativa e pontuação', async () => {
    const { container } = render(<ResultadoLista lista={encerrada} maximo={30} />);
    expect(screen.getByText('Pontuação: 15 de 30 (1 de 2 acertos)')).toBeInTheDocument();
    expect(screen.getAllByText(/Gabarito:/)).toHaveLength(2);
    expect(screen.getByText('Soma simples.')).toBeInTheDocument();
    expect(screen.getByText(/Resposta da equipe: Sobral — incorreta/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem submissão: pontuação zero, questões sem resposta contam como erro', () => {
    render(<ResultadoLista lista={{ ...encerrada, submissao: null }} maximo={30} />);
    expect(
      screen.getByText('A equipe não enviou respostas: pontuação 0 de 30.'),
    ).toBeInTheDocument();
  });
});
