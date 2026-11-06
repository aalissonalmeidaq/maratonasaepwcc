export const telasPrincipais = [
  { perfil: 'público', conta: null, rotas: ['/entrar', '/regulamento'] },
  {
    perfil: 'aluno',
    conta: /ana exemplo/i,
    rotas: ['/aluno', '/aluno/ranking', '/aluno/pontuacao', '/aluno/encontros'],
  },
  {
    perfil: 'docente',
    conta: /lúcia exemplo/i,
    rotas: [
      '/docente',
      '/docente/turmas/t-a',
      '/docente/encontros',
      '/docente/presenca',
      '/docente/avaliacoes',
      '/docente/premissas',
    ],
  },
  {
    perfil: 'coordenação',
    conta: /coordenação/i,
    rotas: [
      '/coordenacao',
      '/coordenacao/ranking',
      '/coordenacao/edicoes',
      '/coordenacao/presenca',
      '/coordenacao/avaliacoes',
      '/coordenacao/premissas',
    ],
  },
  {
    perfil: 'master',
    conta: /master/i,
    rotas: ['/master', '/master/unidades', '/master/masters', '/master/premissas'],
  },
  {
    perfil: 'gestão',
    conta: /gestão/i,
    rotas: ['/gestao', '/gestao/equipe', '/gestao/edicoes', '/gestao/premissas'],
  },
  {
    perfil: 'analista',
    conta: /analista/i,
    rotas: ['/analista', '/analista/relatorios'],
  },
];
