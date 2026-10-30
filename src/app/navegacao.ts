import type { Area } from '@/modules/acesso';
import type { NomeIcone } from '@/shared/ui';

export interface ItemMenu {
  rotulo: string;
  caminho: string;
  icone: NomeIcone;
  /** Texto de apoio curto, usado nos cartões de acesso rápido. */
  descricao: string;
}

/** Menus por perfil: mostram apenas funções da área (Design System §7). */
export const MENUS: Record<Area, ItemMenu[]> = {
  aluno: [
    { rotulo: 'Início', caminho: '/aluno', icone: 'inicio', descricao: 'Visão geral da dupla' },
    {
      rotulo: 'Minha equipe',
      caminho: '/aluno/dupla',
      icone: 'dupla',
      descricao: 'Equipe, convites e turma',
    },
    {
      rotulo: 'Encontros',
      caminho: '/aluno/encontros',
      icone: 'calendario',
      descricao: 'Datas, horários e locais',
    },
    {
      rotulo: 'Desafios e entregas',
      caminho: '/aluno/desafios',
      icone: 'desafio',
      descricao: 'Desafios e envio da entrega',
    },
    {
      rotulo: 'Pontuação',
      caminho: '/aluno/pontuacao',
      icone: 'pontuacao',
      descricao: 'Pontos por encontro',
    },
    {
      rotulo: 'Ranking',
      caminho: '/aluno/ranking',
      icone: 'ranking',
      descricao: 'Classificação da categoria',
    },
    {
      rotulo: 'Regulamento e avisos',
      caminho: '/aluno/regulamento',
      icone: 'conhecimento',
      descricao: 'Regras e comunicados',
    },
  ],
  docente: [
    { rotulo: 'Início', caminho: '/docente', icone: 'inicio', descricao: 'Visão geral das turmas' },
    {
      rotulo: 'Minhas turmas',
      caminho: '/docente/turmas',
      icone: 'turma',
      descricao: 'Turmas e duplas vinculadas',
    },
    {
      rotulo: 'Encontros',
      caminho: '/docente/encontros',
      icone: 'calendario',
      descricao: 'Agenda da edição',
    },
    {
      rotulo: 'Presença',
      caminho: '/docente/presenca',
      icone: 'presenca',
      descricao: 'Presença individual',
    },
    {
      rotulo: 'Avaliações',
      caminho: '/docente/avaliacoes',
      icone: 'avaliacao',
      descricao: 'Rubricas e critérios',
    },
    {
      rotulo: 'Ocorrências',
      caminho: '/docente/ocorrencias',
      icone: 'ocorrencia',
      descricao: 'Registros e evidências',
    },
  ],
  coordenacao: [
    {
      rotulo: 'Início',
      caminho: '/coordenacao',
      icone: 'inicio',
      descricao: 'Visão geral da edição',
    },
    {
      rotulo: 'Organização',
      caminho: '/coordenacao/organizacao',
      icone: 'turma',
      descricao: 'Cursos, turmas e contas',
    },
    {
      rotulo: 'Equipes',
      caminho: '/coordenacao/duplas',
      icone: 'dupla',
      descricao: 'Alterações e histórico',
    },
    {
      rotulo: 'Encontros',
      caminho: '/coordenacao/encontros',
      icone: 'calendario',
      descricao: 'Agenda e ambientes',
    },
    {
      rotulo: 'Ranking',
      caminho: '/coordenacao/ranking',
      icone: 'ranking',
      descricao: 'Classificação por categoria',
    },
    {
      rotulo: 'Ocorrências',
      caminho: '/coordenacao/ocorrencias',
      icone: 'ocorrencia',
      descricao: 'Ocorrências e revisões',
    },
    {
      rotulo: 'Comunicados',
      caminho: '/coordenacao/comunicados',
      icone: 'noticia',
      descricao: 'Avisos e regulamento',
    },
    {
      rotulo: 'Premiação',
      caminho: '/coordenacao/premiacao',
      icone: 'trofeu',
      descricao: 'Prêmios da edição',
    },
    {
      rotulo: 'Relatórios',
      caminho: '/coordenacao/relatorios',
      icone: 'relatorio',
      descricao: 'Indicadores e exportação',
    },
  ],
};

export const ROTULO_AREA: Record<Area, string> = {
  aluno: 'Área do aluno',
  docente: 'Área docente',
  coordenacao: 'Coordenação',
};
