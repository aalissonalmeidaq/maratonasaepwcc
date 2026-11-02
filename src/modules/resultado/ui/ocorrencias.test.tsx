import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGRAS_PILOTO } from '@/modules/pontuacao';
import { violacoesA11y } from '@/test/a11y';
import type { Ocorrencia } from '../domain/tipos';
import { FormDecisao } from './FormDecisao';
import { FormExcecaoPrazo } from './FormExcecaoPrazo';
import { FormManifestacao } from './FormManifestacao';
import { FormOcorrencia } from './FormOcorrencia';
import { ListaOcorrencias } from './ListaOcorrencias';

const SEM_CONEXAO = 'Sem conexão: gravações exigem conexão com o servidor.';
const equipes = [
  { id: 'e1', nome: 'Equipe Órbita' },
  { id: 'e2', nome: 'Equipe Vetor' },
];
const encontros = [{ id: 'en1', rotulo: '1. Abertura' }];
const desafios = [{ id: 'd1', titulo: 'Desafio inicial' }];

describe('FormOcorrencia (US2, FR-005, FR-006)', () => {
  it('tipos vêm das regras; plágio exige o desafio; confirma só após o servidor', async () => {
    let concluir!: (v: { id: string; prazoManifestacao: string }) => void;
    const onRegistrar = vi.fn(
      () => new Promise<{ id: string; prazoManifestacao: string }>((r) => (concluir = r)),
    );
    const { container } = render(
      <FormOcorrencia
        equipes={equipes}
        encontros={encontros}
        desafios={desafios}
        tipos={REGRAS_PILOTO.penalidades.tipos}
        onRegistrar={onRegistrar}
      />,
    );
    const tipo = screen.getByLabelText('Tipo');
    expect(
      within(tipo)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'Escolha o tipo',
      'Reincidência após orientação registrada (−2)',
      'Desrespeito com responsabilidade da equipe (−5)',
      'Uso não autorizado (−5)',
      'Plágio comprovado (zera a entrega)',
    ]);
    await userEvent.selectOptions(screen.getByLabelText('Equipe'), 'Equipe Vetor');
    await userEvent.selectOptions(tipo, 'Plágio comprovado (zera a entrega)');
    await userEvent.type(screen.getByLabelText('Fato'), 'Código idêntico ao de outra equipe.');
    await userEvent.type(screen.getByLabelText('Evidência'), 'Comparação dos arquivos.');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }));
    expect(screen.getByText('Escolha o desafio da entrega afetada.')).toBeInTheDocument();
    expect(onRegistrar).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText('Desafio da entrega'), 'Desafio inicial');
    const arquivo = new File(['%PDF'], 'prova.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Arquivo de evidência (opcional)'), arquivo);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }));
    expect(onRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        duplaId: 'e2',
        encontroId: 'en1',
        tipo: 'plagio',
        desafioId: 'd1',
        fato: 'Código idêntico ao de outra equipe.',
        evidencia: 'Comparação dos arquivos.',
        fatoChave: null,
        arquivo,
        chave: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    );
    expect(screen.queryByText(/Ocorrência registrada/)).not.toBeInTheDocument();
    concluir({ id: 'o1', prazoManifestacao: '2026-11-02T15:00:00Z' });
    expect(await screen.findByText(/Ocorrência registrada/)).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('arquivo fora do tipo aceito é recusado antes do envio', async () => {
    const onRegistrar = vi.fn();
    render(
      <FormOcorrencia
        equipes={equipes}
        encontros={encontros}
        desafios={desafios}
        tipos={REGRAS_PILOTO.penalidades.tipos}
        onRegistrar={onRegistrar}
      />,
    );
    await userEvent.upload(
      screen.getByLabelText('Arquivo de evidência (opcional)'),
      new File(['x'], 'nota.txt', { type: 'text/plain' }),
      { applyAccept: false },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }));
    expect(screen.getByText(/Tipo de arquivo não aceito/)).toBeInTheDocument();
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it('sem conexão: registrar desabilitado com o motivo (FR-025)', () => {
    render(
      <FormOcorrencia
        equipes={equipes}
        encontros={encontros}
        desafios={desafios}
        tipos={REGRAS_PILOTO.penalidades.tipos}
        onRegistrar={vi.fn()}
        bloqueio={SEM_CONEXAO}
      />,
    );
    expect(screen.getByRole('button', { name: 'Registrar ocorrência' })).toBeDisabled();
    expect(screen.getByText(SEM_CONEXAO)).toBeInTheDocument();
  });
});

const ocorrencia: Ocorrencia = {
  id: 'o1',
  edicaoId: 'ed',
  encontroId: 'en1',
  encontroNumero: 1,
  duplaId: 'e1',
  duplaNome: 'Equipe Órbita',
  turmaId: 't1',
  desafioId: null,
  tipo: 'uso_nao_autorizado',
  tipoRotulo: 'Uso não autorizado',
  fato: 'Uso de IA sem registro.',
  evidencia: 'Relato do docente.',
  evidenciaPath: 'ed/e1/k.pdf',
  evidenciaNome: 'relato.pdf',
  estado: 'registrada',
  prazoManifestacao: '2026-11-02T15:00:00Z',
  criadoEm: '2026-11-01T15:00:00Z',
  autorNome: 'Profa. Lúcia',
  manifestacao: null,
  decisao: null,
  prazoRevisao: null,
};

describe('ListaOcorrencias (FR-007, FR-010)', () => {
  it('mostra estado em texto, prazo, evidência e decisão', async () => {
    const onEvidencia = vi.fn();
    const { container } = render(
      <ListaOcorrencias
        ocorrencias={[
          ocorrencia,
          {
            ...ocorrencia,
            id: 'o2',
            estado: 'confirmada',
            manifestacao: {
              texto: 'Tínhamos autorização.',
              autorNome: 'Ana',
              enviadaEm: '2026-11-01T16:00:00Z',
            },
            decisao: {
              justificativa: 'Fato comprovado.',
              apresentacaoDependente: false,
              decididoEm: '2026-11-02T16:00:00Z',
              decididoPorNome: 'Coordenação',
            },
          },
        ]}
        onAbrirEvidencia={onEvidencia}
      />,
    );
    const itens = screen.getAllByRole('listitem');
    expect(within(itens[0]!).getByText('Registrada')).toBeInTheDocument();
    expect(within(itens[0]!).getByText(/Prazo de manifestação/)).toBeInTheDocument();
    expect(within(itens[1]!).getByText('Confirmada')).toBeInTheDocument();
    expect(within(itens[1]!).getByText('Tínhamos autorização.')).toBeInTheDocument();
    expect(within(itens[1]!).getByText(/Fato comprovado/)).toBeInTheDocument();
    await userEvent.click(
      within(itens[0]!).getByRole('button', { name: 'Abrir evidência relato.pdf' }),
    );
    expect(onEvidencia).toHaveBeenCalledWith('ed/e1/k.pdf');
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem ocorrências: estado vazio', () => {
    render(<ListaOcorrencias ocorrencias={[]} />);
    expect(screen.getByText('Nenhuma ocorrência registrada.')).toBeInTheDocument();
  });
});

describe('FormManifestacao (FR-008)', () => {
  it('exige texto e confirma só após o servidor', async () => {
    let concluir!: () => void;
    const onEnviar = vi.fn(() => new Promise<void>((r) => (concluir = r)));
    const { container } = render(<FormManifestacao onEnviar={onEnviar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar manifestação' }));
    expect(screen.getByText('Escreva pelo menos 10 caracteres.')).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Manifestação da equipe'),
      'Tínhamos autorização da docente.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Enviar manifestação' }));
    expect(onEnviar).toHaveBeenCalledWith('Tínhamos autorização da docente.');
    expect(screen.queryByText('Manifestação enviada.')).not.toBeInTheDocument();
    concluir();
    expect(await screen.findByText('Manifestação enviada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem conexão: envio desabilitado', () => {
    render(<FormManifestacao onEnviar={vi.fn()} bloqueio={SEM_CONEXAO} />);
    expect(screen.getByRole('button', { name: 'Enviar manifestação' })).toBeDisabled();
  });
});

describe('FormDecisao (FR-009)', () => {
  it('confirma ou arquiva com justificativa; recusa do servidor aparece no lugar do sucesso', async () => {
    const onDecidir = vi
      .fn()
      .mockRejectedValueOnce(new Error('O prazo de manifestação da equipe ainda está aberto.'))
      .mockResolvedValueOnce(undefined);
    const { container } = render(<FormDecisao plagio onDecidir={onDecidir} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Confirmar' }));
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Apresentação dependente da entrega' }),
    );
    await userEvent.type(
      screen.getByLabelText('Justificativa da decisão'),
      'Plágio comprovado na comparação.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar decisão' }));
    expect(onDecidir).toHaveBeenCalledWith({
      resultado: 'confirmada',
      justificativa: 'Plágio comprovado na comparação.',
      apresentacaoDependente: true,
    });
    expect(
      await screen.findByText(/prazo de manifestação da equipe ainda está aberto/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Decisão registrada.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar decisão' }));
    expect(await screen.findByText('Decisão registrada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('fora do plágio não há opção de apresentação dependente; justificativa obrigatória', async () => {
    const onDecidir = vi.fn();
    render(<FormDecisao plagio={false} onDecidir={onDecidir} />);
    expect(
      screen.queryByRole('checkbox', { name: 'Apresentação dependente da entrega' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Arquivar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar decisão' }));
    expect(
      screen.getByText('Informe uma justificativa com pelo menos 10 caracteres.'),
    ).toBeInTheDocument();
    expect(onDecidir).not.toHaveBeenCalled();
  });

  it('sem conexão: decisão desabilitada', () => {
    render(<FormDecisao plagio={false} onDecidir={vi.fn()} bloqueio={SEM_CONEXAO} />);
    expect(screen.getByRole('button', { name: 'Registrar decisão' })).toBeDisabled();
  });
});

describe('FormExcecaoPrazo (FR-021)', () => {
  it('novo prazo e justificativa; confirma após o servidor', async () => {
    const onRegistrar = vi.fn().mockResolvedValue('x1');
    const { container } = render(<FormExcecaoPrazo onRegistrar={onRegistrar} />);
    await userEvent.type(screen.getByLabelText('Novo prazo'), '2026-11-05T18:00');
    await userEvent.type(
      screen.getByLabelText('Justificativa da exceção'),
      'Equipe ausente com atestado.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar exceção de prazo' }));
    expect(onRegistrar).toHaveBeenCalledWith({
      novoPrazo: new Date('2026-11-05T18:00').toISOString(),
      justificativa: 'Equipe ausente com atestado.',
    });
    expect(await screen.findByText('Exceção de prazo registrada.')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem conexão: registro desabilitado', () => {
    render(<FormExcecaoPrazo onRegistrar={vi.fn()} bloqueio={SEM_CONEXAO} />);
    expect(screen.getByRole('button', { name: 'Registrar exceção de prazo' })).toBeDisabled();
  });
});
