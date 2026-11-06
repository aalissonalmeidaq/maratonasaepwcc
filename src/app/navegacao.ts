import type { Area } from '@/modules/acesso';
import type { NomeIcone } from '@/shared/ui';

export interface ItemMenu {
  rotulo: string;
  caminho: string;
  icone: NomeIcone;
  /** Texto de apoio curto, usado nos cartões de acesso rápido. */
  descricao: string;
}

export interface GrupoMenu {
  titulo: string;
  icone: NomeIcone;
  itens: ItemMenu[];
}

export interface MenuDaArea {
  /** Início fica fora das categorias, no topo. */
  inicio: ItemMenu;
  grupos: GrupoMenu[];
}

/**
 * Menus por perfil: mostram apenas funções da área (Design System §7), agrupadas em categorias
 * (spec 011, US6).
 */
export const MENUS: Record<Area, MenuDaArea> = {
  aluno: {
    inicio: {
      rotulo: 'Início',
      caminho: '/aluno',
      icone: 'inicio',
      descricao: 'Visão geral da dupla',
    },
    grupos: [
      {
        titulo: 'Minha participação',
        icone: 'participacao',
        itens: [
          {
            rotulo: 'Minha equipe',
            caminho: '/aluno/dupla',
            icone: 'dupla',
            descricao: 'Equipe, convites e turma',
          },
          {
            rotulo: 'Minha turma',
            caminho: '/aluno/turma',
            icone: 'turma',
            descricao: 'Equipes, colegas e encontros',
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
        ],
      },
      {
        titulo: 'Resultados',
        icone: 'resultado',
        itens: [
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
            rotulo: 'Ocorrências',
            caminho: '/aluno/ocorrencias',
            icone: 'ocorrencia',
            descricao: 'Ocorrências e manifestação',
          },
          {
            rotulo: 'Revisões',
            caminho: '/aluno/revisoes',
            icone: 'revisao',
            descricao: 'Pedidos de revisão da equipe',
          },
        ],
      },
      {
        titulo: 'Informações',
        icone: 'info',
        itens: [
          {
            rotulo: 'Regulamento e avisos',
            caminho: '/aluno/regulamento',
            icone: 'conhecimento',
            descricao: 'Regras e comunicados',
          },
        ],
      },
    ],
  },
  docente: {
    inicio: {
      rotulo: 'Início',
      caminho: '/docente',
      icone: 'inicio',
      descricao: 'Visão geral das turmas',
    },
    grupos: [
      {
        titulo: 'Turmas e atividades',
        icone: 'educacao',
        itens: [
          {
            rotulo: 'Minhas turmas',
            caminho: '/docente/turmas',
            icone: 'turma',
            descricao: 'Turmas e duplas vinculadas',
          },
          {
            rotulo: 'Atividades',
            caminho: '/docente/atividades',
            icone: 'desafio',
            descricao: 'Desafios e questões',
          },
          {
            rotulo: 'Encontros',
            caminho: '/docente/encontros',
            icone: 'calendario',
            descricao: 'Agenda da edição',
          },
        ],
      },
      {
        titulo: 'Lançamentos',
        icone: 'checklist',
        itens: [
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
            rotulo: 'Pontos da turma',
            caminho: '/docente/pontos',
            icone: 'pontuacao',
            descricao: 'Prévia dos pontos das equipes',
          },
          {
            rotulo: 'Ocorrências',
            caminho: '/docente/ocorrencias',
            icone: 'ocorrencia',
            descricao: 'Registros e evidências',
          },
        ],
      },
      {
        titulo: 'Comunicação',
        icone: 'mensagem',
        itens: [
          {
            rotulo: 'Comunicados',
            caminho: '/docente/comunicados',
            icone: 'noticia',
            descricao: 'Recebidos e escritos por você',
          },
          {
            rotulo: 'Relatórios',
            caminho: '/docente/relatorios',
            icone: 'relatorio',
            descricao: 'Exportação CSV das turmas',
          },
        ],
      },
    ],
  },
  coordenacao: {
    inicio: {
      rotulo: 'Início',
      caminho: '/coordenacao',
      icone: 'inicio',
      descricao: 'Visão geral da edição',
    },
    grupos: [
      {
        titulo: 'Preparação',
        icone: 'planejamento',
        itens: [
          {
            rotulo: 'Edições',
            caminho: '/coordenacao/edicoes',
            icone: 'gestao',
            descricao: 'Criar, ativar e encerrar edições',
          },
          {
            rotulo: 'Cursos e turmas',
            caminho: '/coordenacao/cadastro',
            icone: 'educacao',
            descricao: 'Cadastro permanente da unidade',
          },
          {
            rotulo: 'Organização',
            caminho: '/coordenacao/organizacao',
            icone: 'turma',
            descricao: 'Turmas da edição, mentores e contas',
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
        ],
      },
      {
        titulo: 'Durante os encontros',
        icone: 'cronograma',
        itens: [
          {
            rotulo: 'Presença',
            caminho: '/coordenacao/presenca',
            icone: 'presenca',
            descricao: 'Presença e participação',
          },
          {
            rotulo: 'Avaliações',
            caminho: '/coordenacao/avaliacoes',
            icone: 'avaliacao',
            descricao: 'Correções e prorrogações',
          },
          {
            rotulo: 'Prova oficial',
            caminho: '/coordenacao/prova-oficial',
            icone: 'prova',
            descricao: 'Realização e nota oficial',
          },
          {
            rotulo: 'Ocorrências',
            caminho: '/coordenacao/ocorrencias',
            icone: 'ocorrencia',
            descricao: 'Registro e decisão',
          },
        ],
      },
      {
        titulo: 'Resultado',
        icone: 'trofeu',
        itens: [
          {
            rotulo: 'Ranking',
            caminho: '/coordenacao/ranking',
            icone: 'ranking',
            descricao: 'Classificação por categoria',
          },
          {
            rotulo: 'Revisões',
            caminho: '/coordenacao/revisoes',
            icone: 'revisao',
            descricao: 'Pedidos de revisão das equipes',
          },
          {
            rotulo: 'Premiação',
            caminho: '/coordenacao/premiacao',
            icone: 'trofeu',
            descricao: 'Prêmios da edição',
          },
        ],
      },
      {
        titulo: 'Comunicação',
        icone: 'mensagem',
        itens: [
          {
            rotulo: 'Comunicados',
            caminho: '/coordenacao/comunicados',
            icone: 'noticia',
            descricao: 'Avisos e regulamento',
          },
          {
            rotulo: 'Relatórios',
            caminho: '/coordenacao/relatorios',
            icone: 'relatorio',
            descricao: 'Exportação CSV da edição',
          },
        ],
      },
    ],
  },
  master: {
    inicio: {
      rotulo: 'Início',
      caminho: '/master',
      icone: 'inicio',
      descricao: 'Unidades da rede',
    },
    grupos: [
      {
        titulo: 'Rede',
        icone: 'administracao',
        itens: [
          {
            rotulo: 'Unidades',
            caminho: '/master/unidades',
            icone: 'administracao',
            descricao: 'Cadastrar unidades e a gestão de cada uma',
          },
          {
            rotulo: 'Masters',
            caminho: '/master/masters',
            icone: 'seguranca',
            descricao: 'Contas de rede',
          },
        ],
      },
    ],
  },
  gestao: {
    inicio: {
      rotulo: 'Início',
      caminho: '/gestao',
      icone: 'inicio',
      descricao: 'Equipe e edições da unidade',
    },
    grupos: [
      {
        titulo: 'Unidade',
        icone: 'gestao',
        itens: [
          {
            rotulo: 'Equipe da unidade',
            caminho: '/gestao/equipe',
            icone: 'usuarios',
            descricao: 'Coordenação, docentes, mentores e analistas',
          },
          {
            rotulo: 'Edições',
            caminho: '/gestao/edicoes',
            icone: 'gestao',
            descricao: 'Criar edições e indicar a coordenação',
          },
        ],
      },
    ],
  },
  analista: {
    inicio: {
      rotulo: 'Início',
      caminho: '/analista',
      icone: 'inicio',
      descricao: 'Painel da edição',
    },
    grupos: [
      {
        titulo: 'Acompanhamento',
        icone: 'painel',
        itens: [
          {
            rotulo: 'Relatórios',
            caminho: '/analista/relatorios',
            icone: 'relatorio',
            descricao: 'Exportação CSV da edição',
          },
        ],
      },
    ],
  },
};

/** Itens do menu na ordem em que aparecem: Início e os itens de cada categoria. */
export function itensDoMenu(area: Area): ItemMenu[] {
  const menu = MENUS[area];
  return [menu.inicio, ...menu.grupos.flatMap((g) => g.itens)];
}

export const ROTULO_AREA: Record<Area, string> = {
  master: 'Rede',
  gestao: 'Gestão da unidade',
  aluno: 'Área do aluno',
  docente: 'Área docente',
  analista: 'Análise',
  coordenacao: 'Coordenação',
};
