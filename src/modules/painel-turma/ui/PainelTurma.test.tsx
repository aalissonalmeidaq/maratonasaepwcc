import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { violacoesA11y } from '@/test/a11y';
import type { PainelTurma as Painel, PontuacaoDoPainel } from '../domain/tipos';
import { PainelTurma } from './PainelTurma';

const HOJE = '2026-11-10';

const base: Painel = {
  visao: 'gestao',
  turma: {
    id: 't1',
    nome: '3º ano A',
    anoLetivo: 2026,
    cursoNome: 'Curso Técnico',
    categoria: 'Categoria',
    edicaoId: 'ed1',
  },
  alunos: [
    { id: 'a', nome: 'Ana Souza', temEquipe: true },
    { id: 'b', nome: 'Bruno Lima', temEquipe: true },
    { id: 'c', nome: 'Caio Reis', temEquipe: false },
  ],
  equipes: [
    {
      id: 'd1',
      nome: 'Equipe Órbita',
      integrantes: [
        { estudanteId: 'a', nome: 'Ana Souza', integranteInativo: false },
        { estudanteId: 'b', nome: 'Bruno Lima', integranteInativo: true },
      ],
    },
  ],
  convitesPendentes: 2,
  pontuacao: null,
  encontros: [
    {
      id: 'e1',
      numero: 1,
      titulo: 'Abertura',
      data: '2026-11-03',
      inicio: null,
      fim: null,
      estado: 'agendado',
      ambienteNome: null,
    },
    {
      id: 'e2',
      numero: 2,
      titulo: 'Desafio de redes',
      data: '2026-11-12',
      inicio: '13:30',
      fim: '17:00',
      estado: 'agendado',
      ambienteNome: 'Laboratório 2',
    },
  ],
};

function renderizar(painel: Painel, extras: Partial<Parameters<typeof PainelTurma>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PainelTurma painel={painel} hoje={HOJE} {...extras} />
    </MemoryRouter>,
  );
}

const indicador = (rotulo: string) =>
  screen.getByText(rotulo, { selector: 'p' }).nextElementSibling?.textContent;

describe('PainelTurma — visão de gestão (US1)', () => {
  it('mostra indicadores que batem com as listas (SC-003)', async () => {
    const { container } = renderizar(base, { linkAlterarEquipes: '/docente/turmas' });
    expect(indicador('Alunos ativos')).toBe('3');
    expect(indicador('Com equipe')).toBe('2');
    expect(indicador('Sem equipe')).toBe('1');
    expect(indicador('Equipes')).toBe('1');
    expect(indicador('Convites pendentes')).toBe('2');

    const equipes = screen.getByRole('list', { name: 'Equipes da turma' });
    expect(within(equipes).getAllByRole('heading')).toHaveLength(1);
    const semEquipe = screen.getByRole('list', { name: 'Alunos sem equipe' });
    expect(within(semEquipe).getAllByRole('listitem')).toHaveLength(1);
    expect(within(semEquipe).getByText('Caio Reis')).toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('lista equipes com integrantes, tipo e integrante inativo', () => {
    renderizar(base);
    const equipes = screen.getByRole('list', { name: 'Equipes da turma' });
    expect(within(equipes).getByRole('heading', { name: 'Equipe Órbita' })).toBeInTheDocument();
    expect(within(equipes).getByText('Dupla')).toBeInTheDocument();
    expect(within(equipes).getByText(/integrante inativo/)).toBeInTheDocument();
  });

  it('oferece o link para alterar equipes', () => {
    renderizar(base, { linkAlterarEquipes: '/coordenacao/duplas' });
    expect(screen.getByRole('link', { name: 'Alterar equipes' })).toHaveAttribute(
      'href',
      '/coordenacao/duplas',
    );
  });

  it('destaca o próximo encontro e separa realizados de agendados', () => {
    renderizar(base);
    const proximo = screen.getByRole('region', { name: 'Próximo encontro' });
    expect(within(proximo).getByText('Desafio de redes')).toBeInTheDocument();
    expect(within(proximo).getByText(/13:30–17:00 · Laboratório 2/)).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Encontros realizados' })).getByText(/Abertura/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Encontros agendados' })).getByText(
        /Desafio de redes/,
      ),
    ).toBeInTheDocument();
  });

  it('pontuação: aviso sem números fictícios (US3, FR-005)', () => {
    renderizar(base);
    const bloco = screen.getByRole('region', { name: 'Pontuação e classificação' });
    expect(bloco).toHaveTextContent('Pontuação disponível a partir dos lançamentos de avaliação.');
    expect(bloco.textContent).not.toMatch(/\d/);
  });

  it('turma vazia: estados vazios orientam o próximo passo', () => {
    renderizar({ ...base, alunos: [], equipes: [], encontros: [], convitesPendentes: 0 });
    expect(
      screen.getByText('Nenhum aluno cadastrado — cadastre em Organização.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhuma equipe formada nesta turma.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum encontro cadastrado nesta edição.')).toBeInTheDocument();
  });

  it('todos com equipe: informa que ninguém sobrou', () => {
    renderizar({ ...base, alunos: base.alunos.map((a) => ({ ...a, temEquipe: true })) });
    expect(screen.getByText('Todos os alunos ativos têm equipe.')).toBeInTheDocument();
  });
});

describe('PainelTurma — visão do aluno (US2, FR-003)', () => {
  const aluno: Painel = {
    ...base,
    visao: 'aluno',
    convitesPendentes: null,
    equipes: base.equipes.map((e) => ({
      ...e,
      integrantes: e.integrantes.map((i) => ({ ...i, integranteInativo: false })),
    })),
  };

  it('mostra só dados coletivos e o atalho para convidar', async () => {
    const { container } = renderizar(aluno, { linkConvidar: '/aluno/dupla' });
    expect(screen.queryByText('Convites pendentes')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Alterar equipes' })).not.toBeInTheDocument();
    expect(screen.queryByText(/integrante inativo/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Convidar para minha equipe' })).toHaveAttribute(
      'href',
      '/aluno/dupla',
    );
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('turma sem alunos na visão do aluno', () => {
    renderizar({ ...aluno, alunos: [], equipes: [] });
    expect(screen.getByText('Nenhum aluno ativo nesta turma.')).toBeInTheDocument();
  });
});

describe('PainelTurma — pontuação na demonstração (US3, FR-005)', () => {
  const pontuacao: PontuacaoDoPainel = {
    ficticia: true,
    estado: 'parcial',
    publicada: false,
    equipes: [
      {
        equipeId: 'd1',
        nome: 'Equipe Órbita',
        total: 42.5,
        posicao: 1,
        compartilhada: false,
        pendente: false,
      },
      {
        equipeId: 'd2',
        nome: 'Equipe Vetor',
        total: 30,
        posicao: 2,
        compartilhada: true,
        pendente: true,
      },
    ],
  };

  it('gestão vê a tabela fictícia com selo, estado, empate e pendência', async () => {
    const { container } = renderizar({ ...base, pontuacao });
    const bloco = screen.getByRole('region', { name: 'Pontuação e classificação' });
    expect(within(bloco).getByText('Dados fictícios')).toBeInTheDocument();
    expect(within(bloco).getByText('Parcial')).toBeInTheDocument();
    expect(
      within(bloco).getByRole('region', { name: 'Tabela: Pontuação das equipes da turma' }),
    ).toBeInTheDocument();
    expect(within(bloco).getAllByText('42,5').length).toBeGreaterThan(0);
    expect(within(bloco).getAllByText('2º (empate)').length).toBeGreaterThan(0);
    expect(within(bloco).getAllByText(/lançamentos pendentes/).length).toBeGreaterThan(0);
    expect(within(bloco).queryByText(/Pontuação disponível/)).not.toBeInTheDocument();
    expect(await violacoesA11y(container)).toEqual([]);
  });

  it('aluno com classificação não publicada (dados reais, Incremento 4): aviso e nenhum número', () => {
    renderizar({
      ...base,
      visao: 'aluno',
      convitesPendentes: null,
      pontuacao: { ...pontuacao, equipes: [] },
    });
    const bloco = screen.getByRole('region', { name: 'Pontuação e classificação' });
    expect(bloco).toHaveTextContent('Classificação ainda não publicada.');
    expect(bloco.textContent).not.toMatch(/\d/);
    expect(within(bloco).queryByRole('region')).not.toBeInTheDocument();
  });

  it('aluno com classificação publicada vê só os totais', () => {
    renderizar({
      ...base,
      visao: 'aluno',
      convitesPendentes: null,
      pontuacao: { ...pontuacao, estado: 'provisorio', publicada: true },
    });
    const bloco = screen.getByRole('region', { name: 'Pontuação e classificação' });
    expect(
      within(bloco).getByRole('region', { name: 'Tabela: Pontuação das equipes da turma' }),
    ).toBeInTheDocument();
    expect(within(bloco).getByText('Provisório')).toBeInTheDocument();
  });
});

describe('PainelTurma — listas longas (spec 005)', () => {
  const muitos = Array.from({ length: 11 }, (_, i) => ({
    id: `x${i}`,
    nome: `Aluno ${String(i + 1).padStart(2, '0')}`,
    temEquipe: false,
  }));
  const equipes = Array.from({ length: 11 }, (_, i) => ({
    id: `q${i}`,
    nome: `Equipe ${String(i + 1).padStart(2, '0')}`,
    integrantes: [],
  }));

  it('acima de 10 itens, as listas paginam e têm busca; indicadores contam tudo (SC-003)', () => {
    renderizar({ ...base, alunos: muitos, equipes });
    expect(indicador('Equipes')).toBe('11');
    expect(indicador('Sem equipe')).toBe('11');
    const listaEquipes = screen.getByRole('list', { name: 'Equipes da turma' });
    expect(within(listaEquipes).getAllByRole('heading')).toHaveLength(10);
    expect(
      screen.getByRole('searchbox', { name: 'Buscar em Equipes da turma' }),
    ).toBeInTheDocument();
    const listaAlunos = screen.getByRole('list', { name: 'Alunos sem equipe' });
    expect(within(listaAlunos).getAllByRole('listitem')).toHaveLength(10);
    expect(
      screen.getByRole('searchbox', { name: 'Buscar em Alunos sem equipe' }),
    ).toBeInTheDocument();
  });

  it('até 10 itens, sem busca', () => {
    renderizar(base);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
