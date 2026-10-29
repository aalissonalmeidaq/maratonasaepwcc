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
    { rotulo: 'Encontros', caminho: '/aluno/encontros', icone: 'calendario' },
    { rotulo: 'Desafios e entregas', caminho: '/aluno/desafios', icone: 'desafio' },
    { rotulo: 'Pontuação', caminho: '/aluno/pontuacao', icone: 'pontuacao' },
    { rotulo: 'Ranking', caminho: '/aluno/ranking', icone: 'ranking' },
    { rotulo: 'Regulamento e avisos', caminho: '/aluno/regulamento', icone: 'conhecimento' },
  ],
  docente: [
    { rotulo: 'Início', caminho: '/docente', icone: 'inicio' },
    { rotulo: 'Minhas turmas', caminho: '/docente/turmas', icone: 'turma' },
    { rotulo: 'Encontros', caminho: '/docente/encontros', icone: 'calendario' },
    { rotulo: 'Presença', caminho: '/docente/presenca', icone: 'presenca' },
    { rotulo: 'Avaliações', caminho: '/docente/avaliacoes', icone: 'avaliacao' },
    { rotulo: 'Ocorrências', caminho: '/docente/ocorrencias', icone: 'ocorrencia' },
  ],
  coordenacao: [
    { rotulo: 'Início', caminho: '/coordenacao', icone: 'inicio' },
    { rotulo: 'Organização', caminho: '/coordenacao/organizacao', icone: 'turma' },
    { rotulo: 'Duplas', caminho: '/coordenacao/duplas', icone: 'dupla' },
    { rotulo: 'Encontros', caminho: '/coordenacao/encontros', icone: 'calendario' },
    { rotulo: 'Ranking', caminho: '/coordenacao/ranking', icone: 'ranking' },
    { rotulo: 'Ocorrências', caminho: '/coordenacao/ocorrencias', icone: 'ocorrencia' },
    { rotulo: 'Comunicados', caminho: '/coordenacao/comunicados', icone: 'noticia' },
    { rotulo: 'Premiação', caminho: '/coordenacao/premiacao', icone: 'trofeu' },
    { rotulo: 'Relatórios', caminho: '/coordenacao/relatorios', icone: 'relatorio' },
  ],
};

export const ROTULO_AREA: Record<Area, string> = {
  aluno: 'Área do aluno',
  docente: 'Área docente',
  coordenacao: 'Coordenação',
};
