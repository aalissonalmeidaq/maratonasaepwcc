import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import { premissa, resposta } from '@/test/fixtures/premissas';
import type { CatalogoDePremissas } from '../domain/tipos';
import { PremissasPage } from './PremissasPage';

const catalogo: CatalogoDePremissas = {
  podeResponder: false,
  premissas: [
    premissa({
      codigo: 'P09',
      historico: [
        resposta({ id: 'r1', justificativa: 'Primeira leitura do regulamento.' }),
        resposta({ id: 'r2', decisao: 'precisa_mudar', justificativa: 'Usar uma casa decimal.' }),
      ],
    }),
    premissa({
      codigo: 'P01',
      tema: 'Identidade visual',
      pergunta: 'Qual versão dos arquivos da marca é a aprovada?',
      opcoes: ['Usar os arquivos de docs/referencias/', 'Usar os arquivos antigos'],
    }),
    premissa({
      codigo: 'P21',
      tema: 'Equipes e atividades',
      pergunta: 'Qual a justificativa mínima?',
    }),
    premissa({
      codigo: 'P90',
      tema: 'Operação',
      pergunta: 'Premissa antiga?',
      resolvidaPor: 'spec 016',
    }),
  ],
};

function renderizar(extra: Partial<Parameters<typeof PremissasPage>[0]> = {}) {
  const baixar = vi.fn();
  const imprimir = vi.fn();
  const r = render(
    <PremissasPage catalogo={catalogo} baixar={baixar} imprimir={imprimir} {...extra} />,
  );
  return { ...r, baixar, imprimir };
}

describe('PremissasPage (spec 015, US1)', () => {
  it('título, texto de apoio e resumo por situação', () => {
    renderizar();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Premissas em validação' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Responder não muda o sistema/)).toBeInTheDocument();
    const resumo = screen.getByRole('list', { name: 'Situação das premissas' });
    expect(within(resumo).getByText('Aguardando resposta').closest('li')).toHaveTextContent('2');
    expect(within(resumo).getByText('Confirmadas').closest('li')).toHaveTextContent('0');
    expect(within(resumo).getByText('Precisam mudar').closest('li')).toHaveTextContent('1');
  });

  it('cartão: código, pergunta, situação, em uso, onde afeta, opções, referência e resposta atual', () => {
    renderizar();
    const p09 = screen.getByRole('article', { name: /P09/ });
    expect(within(p09).getByRole('heading', { level: 3 })).toHaveTextContent(
      'P09 Como as notas fracionárias devem ser arredondadas?',
    );
    expect(within(p09).getAllByText('Precisa mudar').length).toBeGreaterThan(0);
    expect(within(p09).getByText('Duas casas decimais, meio para cima.')).toBeInTheDocument();
    expect(within(p09).getByText('Cálculo de todos os componentes.')).toBeInTheDocument();
    expect(within(p09).getByText('docs/decisoes-e-pendencias.md §3')).toBeInTheDocument();
    expect(within(p09).getAllByText(/Coordenação Teste/)[0]).toBeVisible();
    expect(within(p09).getByText('Usar uma casa decimal.')).toBeInTheDocument();
    expect(
      within(p09).getByText(/O sistema segue a premissa em uso até a mudança ser feita/),
    ).toBeInTheDocument();
    const p01 = screen.getByRole('article', { name: /P01/ });
    expect(within(p01).getByText('Usar os arquivos antigos')).toBeInTheDocument();
    expect(within(p01).getByText('Aguardando resposta')).toBeInTheDocument();
  });

  it('agrupa por tema na ordem definida', () => {
    renderizar();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Pontuação',
      'Equipes e atividades',
      'Identidade visual',
      'Resolvidas por especificações',
    ]);
  });

  it('histórico abre e fecha com aria-expanded', async () => {
    renderizar();
    const p09 = screen.getByRole('article', { name: /P09/ });
    const botao = within(p09).getByRole('button', { name: 'Ver histórico (2)' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(within(p09).getByText('Primeira leitura do regulamento.')).toBeVisible();
  });

  it('filtra por situação e por tema; o resumo não muda; sem resultado mostra o vazio', async () => {
    renderizar();
    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'aguardando');
    expect(screen.queryByRole('article', { name: /P09/ })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: /P01/ })).toBeInTheDocument();
    const resumo = screen.getByRole('list', { name: 'Situação das premissas' });
    expect(within(resumo).getByText('Precisam mudar').closest('li')).toHaveTextContent('1');
    await userEvent.selectOptions(screen.getByLabelText('Tema'), 'Pontuação');
    expect(screen.getByText('Nenhuma premissa com esses filtros.')).toBeInTheDocument();
  });

  it('resolvidas ficam numa seção à parte, recolhida', () => {
    renderizar();
    const secao = screen.getByRole('region', { name: 'Resolvidas por especificações' });
    expect(within(secao).getByText(/Premissa antiga\?/)).toBeInTheDocument();
    expect(within(secao).getByText(/Resolvida pela spec 016/)).toBeInTheDocument();
  });

  it('sem podeResponder não há botão "Responder"', () => {
    renderizar();
    expect(screen.queryByRole('button', { name: /Responder/ })).not.toBeInTheDocument();
  });

  it('com podeResponder, cada premissa pendente recebe o formulário', () => {
    renderizar({
      catalogo: { ...catalogo, podeResponder: true },
      formulario: (p) => <span>formulário de {p.codigo}</span>,
    });
    expect(screen.getByText('formulário de P09')).toBeInTheDocument();
    expect(screen.getByText('formulário de P01')).toBeInTheDocument();
    expect(screen.queryByText('formulário de P90')).not.toBeInTheDocument();
  });

  it('"Baixar lista (CSV)" gera o arquivo com os filtros e o nome do contrato', async () => {
    const { baixar } = renderizar();
    await userEvent.selectOptions(screen.getByLabelText('Tema'), 'Pontuação');
    await userEvent.click(screen.getByRole('button', { name: 'Baixar lista (CSV)' }));
    const [nome, conteudo] = baixar.mock.calls[0] as [string, string];
    expect(nome).toMatch(/^maratona-premissas-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(conteudo).toContain(
      'Código;Tema;Pergunta;Em uso hoje;Situação;Última decisão;Justificativa;Registrada por;Registrada em',
    );
    expect(conteudo).toContain('P09');
    expect(conteudo).not.toContain('P01;');
    expect(conteudo).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  });

  it('justificativa que parece fórmula sai protegida no CSV', async () => {
    const { baixar } = renderizar({
      catalogo: {
        podeResponder: false,
        premissas: [
          premissa({ historico: [resposta({ justificativa: '=SOMA(A1:A2) já conferido' })] }),
        ],
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Baixar lista (CSV)' }));
    expect((baixar.mock.calls[0] as [string, string])[1]).toContain("'=SOMA(A1:A2) já conferido");
  });

  it('"Imprimir lista" limpa os filtros antes de imprimir', async () => {
    const { imprimir } = renderizar();
    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'confirmada');
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir lista' }));
    expect(screen.getByLabelText('Situação')).toHaveValue('todas');
    expect(screen.getByRole('article', { name: /P09/ })).toBeInTheDocument();
    expect(imprimir).toHaveBeenCalledOnce();
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderizar();
    expect(await violacoesA11y(container)).toEqual([]);
  });
});
