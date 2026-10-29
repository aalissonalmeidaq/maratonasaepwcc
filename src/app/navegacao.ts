import type { Area } from '@/modules/acesso';
import type { NomeIcone } from '@/shared/ui';

export interface ItemMenu {
  rotulo: string;
  caminho: string;
  icone: NomeIcone;
}

/** Menus por perfil: mostram apenas funções da área (Design System §7). */
export const MENUS: Record<Area, ItemMenu[]> = {
  aluno: [
    { rotulo: 'Início', caminho: '/aluno', icone: 'inicio' },
    { rotulo: 'Minha dupla', caminho: '/aluno/dupla', icone: 'dupla' },
    { rotulo: 'Encontros', caminho: '/aluno/encontros', icone: 'encontros' },
    { rotulo: 'Desafios e entregas', caminho: '/aluno/desafios', icone: 'desafio' },
    { rotulo: 'Pontuação', caminho: '/aluno/pontuacao', icone: 'pontuacao' },
    { rotulo: 'Ranking', caminho: '/aluno/ranking', icone: 'ranking' },
    { rotulo: 'Regulamento e avisos', caminho: '/aluno/regulamento', icone: 'regulamento' },
  ],
  docente: [
    { rotulo: 'Início', caminho: '/docente', icone: 'inicio' },
    { rotulo: 'Minhas turmas', caminho: '/docente/turmas', icone: 'turmas' },
    { rotulo: 'Encontros', caminho: '/docente/encontros', icone: 'encontros' },
    { rotulo: 'Presença', caminho: '/docente/presenca', icone: 'presenca' },
    { rotulo: 'Avaliações', caminho: '/docente/avaliacoes', icone: 'avaliacao' },
    { rotulo: 'Ocorrências', caminho: '/docente/ocorrencias', icone: 'ocorrencias' },
  ],
  coordenacao: [
    { rotulo: 'Início', caminho: '/coordenacao', icone: 'inicio' },
    { rotulo: 'Organização', caminho: '/coordenacao/organizacao', icone: 'turmas' },
    { rotulo: 'Duplas', caminho: '/coordenacao/duplas', icone: 'dupla' },
    { rotulo: 'Encontros', caminho: '/coordenacao/encontros', icone: 'encontros' },
    { rotulo: 'Ranking', caminho: '/coordenacao/ranking', icone: 'ranking' },
    { rotulo: 'Ocorrências', caminho: '/coordenacao/ocorrencias', icone: 'ocorrencias' },
    { rotulo: 'Comunicados', caminho: '/coordenacao/comunicados', icone: 'comunicados' },
    { rotulo: 'Premiação', caminho: '/coordenacao/premiacao', icone: 'premiacao' },
    { rotulo: 'Relatórios', caminho: '/coordenacao/relatorios', icone: 'relatorios' },
  ],
};

export const ROTULO_AREA: Record<Area, string> = {
  aluno: 'Área do aluno',
  docente: 'Área docente',
  coordenacao: 'Coordenação',
};
