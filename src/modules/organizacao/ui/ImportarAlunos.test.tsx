import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { ImportarAlunos } from './ImportarAlunos';

const turmas = [
  { id: 't1', cursoId: 'c1', nome: '3º A', anoLetivo: null },
  { id: 't2', cursoId: 'c1', nome: '3º B', anoLetivo: null },
];
const CSV =
  'nome,email\nAna Exemplo,ana@exemplo.invalid\nBruno Exemplo,bruno@exemplo.invalid\nSem Email,x\n';
const arquivo = (texto: string) => new File([texto], 'alunos.csv', { type: 'text/csv' });

async function carregar(texto = CSV) {
  await userEvent.upload(screen.getByLabelText('Arquivo CSV'), arquivo(texto));
}

describe('ImportarAlunos (FR-015, US6 cenário 5)', () => {
  it('mostra a prévia (válidas e recusadas com motivo) sem chamar o servidor', async () => {
    const onImportar = vi.fn();
    const { container } = render(<ImportarAlunos turmas={turmas} onImportar={onImportar} />);
    await carregar();
    expect(
      await screen.findByText('2 alunos prontos para importar · 1 linha recusada'),
    ).toBeVisible();
    const recusadas = screen.getByRole('table', { name: 'Linhas recusadas na prévia' });
    expect(within(recusadas).getByRole('cell', { name: 'E-mail inválido.' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Alunos a importar' })).toBeInTheDocument();
    expect(onImportar).not.toHaveBeenCalled();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('arquivo recusado inteiro mostra o motivo e não oferece importar', async () => {
    render(<ImportarAlunos turmas={turmas} onImportar={vi.fn()} />);
    await carregar('nome,email\n');
    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo não tem nenhum aluno.');
    expect(screen.queryByRole('button', { name: /^Importar/ })).not.toBeInTheDocument();
  });

  it('exige a turma antes de importar', async () => {
    const onImportar = vi.fn();
    render(<ImportarAlunos turmas={turmas} onImportar={onImportar} />);
    await carregar();
    await userEvent.click(await screen.findByRole('button', { name: 'Importar 2 alunos' }));
    expect(await screen.findByText('Selecione a turma.')).toBeVisible();
    expect(onImportar).not.toHaveBeenCalled();
  });

  it('envia só as válidas e mostra o relatório do servidor', async () => {
    const onImportar = vi.fn().mockResolvedValue({
      criadas: [{ linha: 2, email: 'ana@exemplo.invalid', conviteEnviado: true }],
      vinculadas: [],
      recusadas: [
        {
          linha: 3,
          email: 'bruno@exemplo.invalid',
          motivo: 'Já ativo em outra turma desta edição.',
        },
      ],
    });
    render(<ImportarAlunos turmas={turmas} onImportar={onImportar} />);
    await userEvent.selectOptions(screen.getByLabelText('Turma'), 't1');
    await carregar();
    await userEvent.click(await screen.findByRole('button', { name: 'Importar 2 alunos' }));
    expect(onImportar).toHaveBeenCalledWith('t1', [
      { linha: 2, nome: 'Ana Exemplo', email: 'ana@exemplo.invalid' },
      { linha: 3, nome: 'Bruno Exemplo', email: 'bruno@exemplo.invalid' },
    ]);
    expect(
      await screen.findByText('Importação concluída: 1 conta criada, 0 vinculadas, 1 recusada.'),
    ).toBeVisible();
    const recusadas = screen.getByRole('table', { name: 'Linhas recusadas pelo servidor' });
    expect(
      within(recusadas).getByRole('cell', { name: 'Já ativo em outra turma desta edição.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova importação' })).toBeInTheDocument();
  });

  it('convite não enviado vira alerta no relatório', async () => {
    const onImportar = vi.fn().mockResolvedValue({
      criadas: [{ linha: 2, email: 'ana@exemplo.invalid', conviteEnviado: false }],
      vinculadas: [{ linha: 3, email: 'bruno@exemplo.invalid' }],
      recusadas: [],
    });
    render(<ImportarAlunos turmas={turmas} onImportar={onImportar} />);
    await userEvent.selectOptions(screen.getByLabelText('Turma'), 't1');
    await carregar();
    await userEvent.click(await screen.findByRole('button', { name: 'Importar 2 alunos' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      '1 convite não foi enviado. Use “Reenviar convite” em Pessoas e vínculos.',
    );
  });

  it('bloqueado (demonstração ou sem conexão): não importa', async () => {
    render(
      <ImportarAlunos
        turmas={turmas}
        bloqueio="Indisponível no modo demonstração."
        onImportar={vi.fn()}
      />,
    );
    await carregar();
    expect(await screen.findByRole('button', { name: 'Importar 2 alunos' })).toBeDisabled();
    expect(screen.getByText('Indisponível no modo demonstração.')).toBeInTheDocument();
  });
});
