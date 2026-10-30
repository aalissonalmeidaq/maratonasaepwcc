import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { ListaPaginada } from './Listagem';
import { ResponsiveTable, type Coluna } from './ResponsiveTable';
import { StatusBadge } from './StatusBadge';
import { textoDoNo } from './textoDoNo';

interface Pessoa {
  id: string;
  nome: string;
  ativo: boolean;
}

const pessoas: Pessoa[] = Array.from({ length: 23 }, (_, i) => ({
  id: String(i + 1),
  nome: `Pessoa ${String(i + 1).padStart(2, '0')}`,
  ativo: i !== 4,
}));
pessoas[2] = { id: '3', nome: 'Lúcia Exemplo', ativo: true };

const colunas: Coluna<Pessoa>[] = [
  { id: 'nome', titulo: 'Nome', valor: (p) => <strong>{p.nome}</strong> },
  {
    id: 'sit',
    titulo: 'Situação',
    valor: (p) => (
      <StatusBadge
        estado={p.ativo ? 'concluido' : 'parcial'}
        rotulo={p.ativo ? 'Ativo' : 'Inativo'}
      />
    ),
  },
  {
    id: 'acoes',
    titulo: 'Ações',
    buscavel: false,
    valor: (p) => <button type="button">Remover {p.nome}</button>,
  },
];

function tabela(linhas = pessoas) {
  return render(
    <ResponsiveTable legenda="Pessoas" colunas={colunas} linhas={linhas} chave={(p) => p.id} />,
  );
}

const linhasDaTabela = () =>
  within(screen.getByRole('table', { name: 'Pessoas' }))
    .getAllByRole('row')
    .slice(1);

describe('textoDoNo', () => {
  it('junta textos, números, filhos de elementos e rótulos', () => {
    expect(
      textoDoNo(
        <span>
          {3}º <em>Dupla Alfa</em>
          {false}
          {null}
          <StatusBadge estado="pendente" rotulo="Com pendências" />
        </span>,
      ).replace(/\s+/g, ' '),
    ).toBe('3 º Dupla Alfa Com pendências');
  });
});

describe('ResponsiveTable — busca e paginação', () => {
  it('mostra 10 por página com contagem e navegação acessíveis', async () => {
    const { container } = tabela();
    expect(linhasDaTabela()).toHaveLength(10);
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1–10 de 23');

    const paginacao = screen.getByRole('navigation', { name: 'Paginação: Pessoas' });
    const anterior = within(paginacao).getByRole('button', { name: 'Página anterior' });
    const proxima = within(paginacao).getByRole('button', { name: 'Próxima página' });
    expect(anterior).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(proxima);
    await userEvent.click(proxima);
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 21–23 de 23');
    expect(paginacao).toHaveTextContent('Página 3 de 3');
    expect(linhasDaTabela()).toHaveLength(3);
    // Continua focável no fim, para o foco não cair no início da página.
    expect(proxima).toHaveAttribute('aria-disabled', 'true');
    expect(proxima).toHaveFocus();
    await userEvent.click(proxima);
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 21–23 de 23');

    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('filtra a cada tecla, ignora acentos, volta à página 1 e não busca nas ações', async () => {
    tabela();
    const busca = screen.getByRole('searchbox', { name: 'Buscar em Pessoas' });
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

    await userEvent.type(busca, 'luc');
    expect(linhasDaTabela()).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('1 resultado');
    await userEvent.type(busca, 'ia');
    expect(screen.getByRole('cell', { name: 'Lúcia Exemplo' })).toBeInTheDocument();

    await userEvent.clear(busca);
    await userEvent.type(busca, 'inativo');
    expect(linhasDaTabela()).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('1 resultado');

    await userEvent.clear(busca);
    await userEvent.type(busca, 'remover');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('sem resultados mantém a busca e oferece limpar', async () => {
    tabela();
    const busca = screen.getByRole('searchbox', { name: 'Buscar em Pessoas' });
    await userEvent.type(busca, 'zzz');
    expect(screen.getByText('Nenhum resultado para “zzz”.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /Paginação/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(busca).toHaveValue('');
    expect(busca).toHaveFocus();
    expect(linhasDaTabela()).toHaveLength(10);
  });

  it('uma página só: contagem sem botões de página', () => {
    tabela(pessoas.slice(0, 4));
    expect(screen.getByRole('status')).toHaveTextContent('4 resultados');
    expect(screen.queryByRole('navigation', { name: /Paginação/ })).not.toBeInTheDocument();
  });

  it('pagina também os cartões do celular', () => {
    tabela();
    expect(
      within(screen.getByRole('list', { name: 'Pessoas' })).getAllByRole('listitem'),
    ).toHaveLength(10);
  });

  it('volta para a última página existente quando registros somem', async () => {
    const { rerender } = tabela();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    rerender(
      <ResponsiveTable
        legenda="Pessoas"
        colunas={colunas}
        linhas={pessoas.slice(0, 15)}
        chave={(p) => p.id}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 11–15 de 15');
    rerender(
      <ResponsiveTable legenda="Pessoas" colunas={colunas} linhas={pessoas} chave={(p) => p.id} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 11–20 de 23');
  });
});

describe('ListaPaginada', () => {
  it('busca e pagina listas de cartões', async () => {
    const { container } = render(
      <ListaPaginada
        rotulo="Duplas"
        itens={pessoas}
        chave={(p) => p.id}
        texto={(p) => p.nome}
        porPagina={5}
        vazio="Nenhuma dupla."
      >
        {(p) => <p>{p.nome}</p>}
      </ListaPaginada>,
    );
    const lista = screen.getByRole('list', { name: 'Duplas' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(5);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar em Duplas' }), 'lúcia');
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('sem itens mostra o estado vazio, sem busca', () => {
    render(
      <ListaPaginada
        rotulo="Duplas"
        itens={[]}
        chave={() => ''}
        texto={() => ''}
        vazio="Nenhuma dupla."
      >
        {() => null}
      </ListaPaginada>,
    );
    expect(screen.getByText('Nenhuma dupla.')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
