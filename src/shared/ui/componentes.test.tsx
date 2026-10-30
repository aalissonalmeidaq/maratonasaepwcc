import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { ResponsiveTable } from './ResponsiveTable';
import { StatusBadge } from './StatusBadge';
import { TextField } from './TextField';

describe('Button', () => {
  it('em carregamento fica indisponível e anuncia o estado', async () => {
    const onClick = vi.fn();
    render(
      <Button carregando onClick={onClick}>
        Enviar
      </Button>,
    );
    const botao = screen.getByRole('button', { name: /enviar/i });
    expect(botao).toHaveAttribute('aria-busy', 'true');
    expect(botao).toBeDisabled();
    await userEvent.click(botao);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('associa rótulo, dica e erro ao campo', async () => {
    const { container } = render(
      <TextField rotulo="E-mail" dica="Use o e-mail institucional" erro="E-mail inválido" />,
    );
    const campo = screen.getByLabelText('E-mail');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription(/use o e-mail institucional/i);
    expect(campo).toHaveAccessibleDescription(/e-mail inválido/i);
    expect(await violacoesA11y(container)).toEqual([]);
  });
});

describe('StatusBadge', () => {
  it('comunica o estado por texto, não só por cor', () => {
    render(<StatusBadge estado="provisorio" />);
    expect(screen.getByText('Provisório')).toBeInTheDocument();
  });
});

describe('ResponsiveTable', () => {
  it('mantém cabeçalhos identificáveis e legenda', async () => {
    const { container } = render(
      <ResponsiveTable
        legenda="Classificação"
        colunas={[
          { id: 'pos', titulo: 'Posição', valor: (l: { pos: number; nome: string }) => l.pos },
          { id: 'nome', titulo: 'Dupla', valor: (l) => l.nome },
        ]}
        linhas={[{ pos: 1, nome: 'Dupla Alfa' }]}
        chave={(l) => l.nome}
      />,
    );
    const tabela = screen.getByRole('table', { name: 'Classificação' });
    expect(within(tabela).getByRole('columnheader', { name: 'Dupla' })).toBeInTheDocument();
    expect(within(tabela).getByRole('cell', { name: 'Dupla Alfa' })).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('mostra estado vazio quando não há linhas', () => {
    render(
      <ResponsiveTable
        legenda="Duplas"
        colunas={[{ id: 'n', titulo: 'Nome', valor: (l: { n: string }) => l.n }]}
        linhas={[]}
        chave={(l) => l.n}
        vazio="Nenhuma dupla cadastrada."
      />,
    );
    expect(screen.getByText('Nenhuma dupla cadastrada.')).toBeInTheDocument();
  });
});

function DemoDialogo({ onConfirmar }: { onConfirmar: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)}>Publicar ranking</button>
      <ConfirmDialog
        aberto={aberto}
        titulo="Publicar ranking provisório?"
        descricao="As duplas verão a nova classificação."
        rotuloConfirmar="Publicar"
        onConfirmar={() => {
          onConfirmar();
          setAberto(false);
        }}
        onCancelar={() => setAberto(false)}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('abre com foco controlado, fecha com Esc e devolve o foco ao acionador', async () => {
    const user = userEvent.setup();
    const onConfirmar = vi.fn();
    render(<DemoDialogo onConfirmar={onConfirmar} />);
    const acionador = screen.getByRole('button', { name: 'Publicar ranking' });
    await user.click(acionador);

    const dialogo = screen.getByRole('dialog', { name: 'Publicar ranking provisório?' });
    expect(dialogo).toHaveAccessibleDescription('As duplas verão a nova classificação.');
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(acionador).toHaveFocus();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('confirma a ação', async () => {
    const user = userEvent.setup();
    const onConfirmar = vi.fn();
    render(<DemoDialogo onConfirmar={onConfirmar} />);
    await user.click(screen.getByRole('button', { name: 'Publicar ranking' }));
    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(onConfirmar).toHaveBeenCalledOnce();
  });

  it('mostra a recusa do servidor dentro do diálogo, onde a pessoa está olhando', () => {
    render(
      <ConfirmDialog
        aberto
        titulo="Remover o ambiente Lab?"
        descricao="A operação fica registrada."
        rotuloConfirmar="Remover"
        erro="Este ambiente está em uso nos encontros: 1 — Abertura."
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    const dialogo = screen.getByRole('dialog', { name: 'Remover o ambiente Lab?' });
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('em uso nos encontros');
  });
});
