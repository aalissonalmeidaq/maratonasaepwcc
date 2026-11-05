import { describe, expect, it } from 'vitest';
import { MENUS, itensDoMenu } from './navegacao';

/** Caminhos do menu antes do agrupamento (spec 011, SC-007): nenhum some, nenhum entra. */
const CAMINHOS = {
  aluno: [
    '/aluno',
    '/aluno/dupla',
    '/aluno/turma',
    '/aluno/encontros',
    '/aluno/desafios',
    '/aluno/pontuacao',
    '/aluno/ranking',
    '/aluno/ocorrencias',
    '/aluno/revisoes',
    '/aluno/regulamento',
  ],
  docente: [
    '/docente',
    '/docente/turmas',
    '/docente/atividades',
    '/docente/encontros',
    '/docente/presenca',
    '/docente/avaliacoes',
    '/docente/pontos',
    '/docente/ocorrencias',
    '/docente/comunicados',
    '/docente/relatorios',
    '/docente/premissas',
  ],
  coordenacao: [
    '/coordenacao',
    '/coordenacao/edicoes',
    '/coordenacao/cadastro',
    '/coordenacao/organizacao',
    '/coordenacao/duplas',
    '/coordenacao/encontros',
    '/coordenacao/presenca',
    '/coordenacao/avaliacoes',
    '/coordenacao/prova-oficial',
    '/coordenacao/ranking',
    '/coordenacao/ocorrencias',
    '/coordenacao/revisoes',
    '/coordenacao/comunicados',
    '/coordenacao/premiacao',
    '/coordenacao/relatorios',
    '/coordenacao/premissas',
  ],
} as const;

const CATEGORIAS = {
  aluno: ['Minha participação', 'Resultados', 'Informações'],
  docente: ['Turmas e atividades', 'Lançamentos', 'Comunicação'],
  coordenacao: ['Preparação', 'Durante os encontros', 'Resultado', 'Comunicação'],
} as const;

describe('menu em categorias (spec 011, US6, FR-017, SC-007)', () => {
  for (const area of ['aluno', 'docente', 'coordenacao'] as const) {
    it(`${area}: Início no topo e cada item em exatamente uma categoria`, () => {
      const menu = MENUS[area];
      expect(menu.inicio.caminho).toBe(`/${area}`);
      expect(menu.grupos.map((g) => g.titulo)).toEqual(CATEGORIAS[area]);
      const agrupados = menu.grupos.flatMap((g) => g.itens.map((i) => i.caminho));
      expect(new Set(agrupados).size).toBe(agrupados.length);
      expect(agrupados).not.toContain(`/${area}`);
      expect(menu.grupos.every((g) => g.itens.length > 0)).toBe(true);
    });

    it(`${area}: caminhos e quantidade de itens não mudam`, () => {
      const caminhos = itensDoMenu(area).map((i) => i.caminho);
      expect(caminhos[0]).toBe(`/${area}`);
      expect([...caminhos].sort()).toEqual([...CAMINHOS[area]].sort());
    });
  }

  it('coordenação: grupos com os itens do fluxo da edição', () => {
    const rotulos = Object.fromEntries(
      MENUS.coordenacao.grupos.map((g) => [g.titulo, g.itens.map((i) => i.rotulo)]),
    );
    expect(rotulos).toEqual({
      Preparação: [
        'Edições',
        'Premissas em validação',
        'Cursos e turmas',
        'Organização',
        'Equipes',
        'Encontros',
      ],
      'Durante os encontros': ['Presença', 'Avaliações', 'Prova oficial', 'Ocorrências'],
      Resultado: ['Ranking', 'Revisões', 'Premiação'],
      Comunicação: ['Comunicados', 'Relatórios'],
    });
  });

  it('premissas em validação (spec 015): docente em Comunicação; aluno não vê', () => {
    const comunicacao = MENUS.docente.grupos.find((g) => g.titulo === 'Comunicação');
    expect(comunicacao?.itens.map((i) => i.rotulo)).toContain('Premissas em validação');
    expect(itensDoMenu('aluno').some((i) => i.caminho.includes('premissas'))).toBe(false);
  });
});
