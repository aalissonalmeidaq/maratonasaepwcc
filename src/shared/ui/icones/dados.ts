/**
 * Biblioteca de ícones da Maratona SAEP em SVG (grid 24×24, traço 2, pontas arredondadas).
 *
 * Vetorização manual a partir da prancha "100 ícones da Maratona SAEP"
 * (docs/referencias/identidade visual). PENDENTE: validação visual pela unidade.
 *
 * Cada ícone tem duas camadas de cor:
 * - contorno principal: `currentColor` (no arquivo .svg: azul-marinho da marca);
 * - destaque: `var(--ic-a)` (cor de apoio da paleta; no modo monocromático, `currentColor`).
 *
 * Este arquivo não depende de React nem do navegador: é usado pelo componente `Icon` e pelo
 * gerador de arquivos (`npm run icones`).
 */

export const CORES_DE_ACENTO = {
  azul: '#1676FF',
  amarelo: '#FFB820',
  coral: '#FF5866',
  ciano: '#22D3EE',
  roxo: '#8B6DFF',
} as const;

export type Acento = keyof typeof CORES_DE_ACENTO;

export interface DefinicaoIcone {
  rotulo: string;
  acento: Acento;
  /** Elementos internos do <svg> (path, circle, rect, ellipse). */
  svg: string;
}

const a = 'stroke="var(--ic-a)"';
const af = 'fill="var(--ic-a)" stroke="none"';

/** Contorno de engrenagem com dentes retos, centrado em (12, 12). */
function engrenagem(dentes = 8, externo = 9.5, interno = 7.2): string {
  const passo = (2 * Math.PI) / dentes;
  const ponto = (r: number, ang: number) =>
    `${(12 + r * Math.cos(ang)).toFixed(2)} ${(12 + r * Math.sin(ang)).toFixed(2)}`;
  const pontos: string[] = [];
  for (let i = 0; i < dentes; i++) {
    const c = i * passo - Math.PI / 2;
    pontos.push(
      ponto(interno, c - passo * 0.32),
      ponto(externo, c - passo * 0.17),
      ponto(externo, c + passo * 0.17),
      ponto(interno, c + passo * 0.32),
    );
  }
  return `<path d="M${pontos.join('L')}Z"/>`;
}

const pessoaCentral =
  '<circle cx="12" cy="7.5" r="3"/><path d="M6.5 19c.5-3.3 2.7-5.3 5.5-5.3s5 2 5.5 5.3"/>';
const pessoasLaterais = `<circle cx="5" cy="9.5" r="2.2" ${a}/><path d="M1.8 17c.4-2.2 1.6-3.5 3.4-3.6" ${a}/><circle cx="19" cy="9.5" r="2.2" ${a}/><path d="M22.2 17c-.4-2.2-1.6-3.5-3.4-3.6" ${a}/>`;
const documentoComLinhas =
  '<path d="M12 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V10"/>';
const calendarioBase =
  '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>';
const estrela = (escala: 'grande' | 'pequena') =>
  escala === 'grande'
    ? 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z'
    : 'm12 7.8 1.4 2.8 3.1.5-2.3 2.2.6 3.1L12 14.9l-2.8 1.5.6-3.1-2.3-2.2 3.1-.5z';
const nuvem = '<path d="M8 17.5H6.5a4 4 0 0 1-.4-8A6 6 0 0 1 17.6 8.2a4.5 4.5 0 0 1-.1 9.3H16"/>';
const bandeja = '<path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>';
const triangulo =
  '<path d="M10.3 4.2 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/>';
const sino =
  '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.3 2.3 0 0 0 4 0"/>';
const setasCirculares = `<path d="M20 11a8 8 0 0 0-14.3-4.3L3.5 9"/><path d="M3.5 4.5V9H8"/><path d="M4 13a8 8 0 0 0 14.3 4.3l2.2-2.3" ${a}/><path d="M20.5 19.5V15H16" ${a}/>`;

export const ICONES = {
  // --- Navegação e conta -------------------------------------------------------
  inicio: {
    rotulo: 'Início',
    acento: 'amarelo',
    svg: `<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20z" ${af}/>`,
  },
  painel: {
    rotulo: 'Painel',
    acento: 'coral',
    svg: `<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" ${a}/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" ${a}/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>`,
  },
  menu: { rotulo: 'Menu', acento: 'azul', svg: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>' },
  busca: {
    rotulo: 'Busca',
    acento: 'azul',
    svg: `<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5" ${a}/>`,
  },
  filtros: {
    rotulo: 'Filtros',
    acento: 'amarelo',
    svg: `<path d="M3.5 4.5h17l-6.5 7.5v5.5l-4 2V12z"/><path d="M7.5 7.5h9" ${a}/>`,
  },
  usuario: {
    rotulo: 'Usuário',
    acento: 'azul',
    svg: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-4 3.8-6.5 7.5-6.5s6.7 2.5 7.5 6.5"/>',
  },
  editarUsuario: {
    rotulo: 'Editar usuário',
    acento: 'coral',
    svg: `<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20c.6-4 3.2-6.5 6.5-6.5 1.2 0 2.3.3 3.2.9"/><path d="m13.5 20.5.5-2.5 5.5-5.5a1.4 1.4 0 0 1 2 2L16 20z" ${a}/>`,
  },
  equipe: { rotulo: 'Equipe', acento: 'coral', svg: pessoaCentral + pessoasLaterais },
  sair: {
    rotulo: 'Sair',
    acento: 'coral',
    svg: `<path d="M11 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7"/><path d="M15 12H3.5M7.5 8l-4 4 4 4" ${a}/>`,
  },
  entrar: {
    rotulo: 'Entrar',
    acento: 'azul',
    svg: `<path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/><path d="M3.5 12H15M11 8l4 4-4 4" ${a}/>`,
  },
  perfil: {
    rotulo: 'Perfil',
    acento: 'azul',
    svg: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3" ${a}/><path d="M6.6 18.2c1.2-2.3 3-3.4 5.4-3.4s4.2 1.1 5.4 3.4" ${a}/>`,
  },
  configuracoes: {
    rotulo: 'Configurações',
    acento: 'azul',
    svg: `${engrenagem()}<circle cx="12" cy="12" r="3" ${a}/>`,
  },
  notificacoes: {
    rotulo: 'Notificações',
    acento: 'ciano',
    svg: `${sino}<path d="M3 8.5a9 9 0 0 1 2.5-5M21 8.5a9 9 0 0 0-2.5-5" ${a}/>`,
  },
  ajuda: {
    rotulo: 'Ajuda',
    acento: 'azul',
    svg: `<circle cx="12" cy="12" r="9"/><path d="M9.3 9.3a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.3-2.7 4" ${a}/><path d="M12 17.3h.01" ${a}/>`,
  },
  idioma: {
    rotulo: 'Idioma',
    acento: 'azul',
    svg: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" ${a}/>`,
  },
  tema: {
    rotulo: 'Tema',
    acento: 'amarelo',
    svg: `<circle cx="12" cy="12" r="4" ${a}/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" ${a}/>`,
  },
  seguranca: {
    rotulo: 'Segurança',
    acento: 'amarelo',
    svg: `<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z"/><rect x="9" y="11" width="6" height="4.5" rx="1" ${a}/><path d="M10.3 11V9.8a1.7 1.7 0 0 1 3.4 0V11" ${a}/>`,
  },
  privacidade: {
    rotulo: 'Privacidade',
    acento: 'amarelo',
    svg: `<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5" ${a}/>`,
  },
  acessibilidade: {
    rotulo: 'Acessibilidade',
    acento: 'ciano',
    svg: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="7.3" r="1.3" ${af}/><path d="M7.5 10h9M12 10v4l-2.5 4M12 14l2.5 4" ${a}/>`,
  },
  suporte: {
    rotulo: 'Suporte',
    acento: 'ciano',
    svg: `<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5" ${a}/><rect x="17" y="13" width="4" height="6" rx="1.5" ${a}/><path d="M19 19c0 1.5-1.5 2.5-4 2.5h-2"/>`,
  },

  // --- Pessoas e organização -----------------------------------------------------
  estudante: {
    rotulo: 'Estudante',
    acento: 'amarelo',
    svg: `<path d="M4 6.5 12 3l8 3.5-8 3.5z"/><path d="M8 8.5v2a4 4 0 0 0 8 0v-2"/><path d="M5 21c.7-3.4 3.5-5.5 7-5.5s6.3 2.1 7 5.5"/><path d="M20 6.5v4" ${a}/>`,
  },
  dupla: {
    rotulo: 'Dupla',
    acento: 'coral',
    svg: `<circle cx="8" cy="8" r="3.2"/><path d="M2.5 19.5c.5-3.4 2.7-5.5 5.5-5.5s5 2.1 5.5 5.5"/><circle cx="16.5" cy="6.8" r="3.2" ${a}/><path d="M13.6 12.9c.9-.4 1.9-.6 2.9-.6 2.8 0 5 2.1 5.5 5.5" ${a}/>`,
  },
  professor: {
    rotulo: 'Professor',
    acento: 'amarelo',
    svg: `<circle cx="12" cy="7" r="3.5"/><path d="M4.5 21c.6-4.4 3.6-7 7.5-7s6.9 2.6 7.5 7"/><path d="M12 14l-1.4 2.2 1.4 4.3 1.4-4.3z" ${af}/>`,
  },
  turma: { rotulo: 'Turma', acento: 'amarelo', svg: pessoaCentral + pessoasLaterais },
  matricula: {
    rotulo: 'Matrícula',
    acento: 'ciano',
    svg: `${documentoComLinhas}<path d="M7.5 8h9M7.5 11.5h6M7.5 15h3"/><circle cx="17.5" cy="17.5" r="4" ${a}/><path d="M17.5 15.5v4M15.5 17.5h4" ${a}/>`,
  },
  presenca: {
    rotulo: 'Presença',
    acento: 'azul',
    svg: `<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20c.6-4 3.2-6.5 6.5-6.5 1.4 0 2.6.4 3.7 1.1"/><circle cx="17.5" cy="16.5" r="4.5" ${a}/><path d="m15.5 16.5 1.5 1.5 2.7-2.9" ${a}/>`,
  },
  calendario: {
    rotulo: 'Calendário',
    acento: 'coral',
    svg: `${calendarioBase}<path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" ${a}/>`,
  },
  horario: {
    rotulo: 'Horário',
    acento: 'coral',
    svg: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" ${a}/>`,
  },
  lembrete: {
    rotulo: 'Lembrete',
    acento: 'coral',
    svg: `<path d="M5.5 16.5V11a6 6 0 0 1 9.4-4.9"/><path d="M4 16.5h8.5M9 20a2.3 2.3 0 0 0 3.6.6"/><circle cx="17.5" cy="15.5" r="4.5" ${a}/><path d="M17.5 13.5v2l1.3 1" ${a}/>`,
  },

  // --- Aprendizagem ------------------------------------------------------------------
  educacao: {
    rotulo: 'Educação',
    acento: 'amarelo',
    svg: `<path d="M2.5 8 12 4l9.5 4-9.5 4z"/><path d="M6.5 10v4c1.5 1.4 3.4 2 5.5 2s4-.6 5.5-2v-4"/><path d="M21.5 8v5" ${a}/><circle cx="21.5" cy="14.5" r="1" ${af}/>`,
  },
  conhecimento: {
    rotulo: 'Conhecimento',
    acento: 'amarelo',
    svg: `<path d="M12 6.5C10 5 7.5 4.5 3 4.5v14c4.5 0 7 .5 9 2 2-1.5 4.5-2 9-2v-14c-4.5 0-7 .5-9 2z"/><path d="M12 6.5v14"/><path d="M6 8.5h3M6 11.5h3M15 8.5h3M15 11.5h3" ${a}/>`,
  },
  leitura: {
    rotulo: 'Leitura',
    acento: 'amarelo',
    svg: `<path d="M2.5 5.5H9a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5h-7z"/><path d="M21.5 5.5H15a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5h7z"/><path d="M6 9v5" ${a}/>`,
  },
  video: {
    rotulo: 'Vídeo',
    acento: 'azul',
    svg: `<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9 5 3-5 3z" ${af}/>`,
  },
  material: {
    rotulo: 'Material',
    acento: 'azul',
    svg: `<path d="M9 3h7l4 4v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M16 3v4h4"/><path d="M4 7v12a2 2 0 0 0 2 2h9" ${a}/>`,
  },
  biblioteca: {
    rotulo: 'Biblioteca',
    acento: 'coral',
    svg: `<rect x="3" y="4" width="4" height="16" rx="1"/><rect x="8" y="4" width="4" height="16" rx="1" ${a}/><path d="m13.5 5.2 3.8-1 4 15.5-3.8 1z"/>`,
  },
  tecnologia: {
    rotulo: 'Tecnologia',
    acento: 'azul',
    svg: `<rect x="8" y="8" width="8" height="8" rx="1.5"/><path d="M12 8V4.5M12 16v3.5M8 12H4.5M16 12h3.5"/><circle cx="12" cy="3" r="1.5" ${a}/><circle cx="12" cy="21" r="1.5" ${a}/><circle cx="3" cy="12" r="1.5" ${a}/><circle cx="21" cy="12" r="1.5" ${a}/>`,
  },
  notebook: {
    rotulo: 'Notebook',
    acento: 'azul',
    svg: `<rect x="4.5" y="4.5" width="15" height="11" rx="1.5"/><path d="M2.5 19h19"/><path d="M10 17.2h4" ${a}/>`,
  },
  celular: {
    rotulo: 'Celular',
    acento: 'azul',
    svg: `<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2" ${a}/>`,
  },
  internet: {
    rotulo: 'Internet',
    acento: 'azul',
    svg: `<path d="M2 9a14.5 14.5 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0" ${a}/><path d="M12 19.5h.01" ${a}/>`,
  },

  // --- Atividades ------------------------------------------------------------------
  questoes: {
    rotulo: 'Questões',
    acento: 'amarelo',
    svg: `<path d="M3.5 18.5 5 14.8A7.5 7.5 0 1 1 8.2 18z"/><path d="M9 8.6a2.3 2.3 0 0 1 4.4.8c0 1.5-2.2 1.8-2.2 3.2" ${a}/><path d="M11.2 15.2h.01" ${a}/>`,
  },
  prova: {
    rotulo: 'Prova',
    acento: 'amarelo',
    svg: `<rect x="4" y="3.5" width="16" height="17" rx="2"/><rect x="7" y="7" width="3" height="3" rx=".5"/><path d="M12.5 8.5H17M12.5 14.5H17"/><path d="m7 14.5 1.5 1.5 2.5-3" ${a}/>`,
  },
  simulado: {
    rotulo: 'Simulado',
    acento: 'coral',
    svg: `${documentoComLinhas}<path d="M7.5 8h9M7.5 11.5h4"/><circle cx="17" cy="17" r="4.5" ${a}/><path d="M17 15v2l1.4 1" ${a}/>`,
  },
  desafio: {
    rotulo: 'Desafio',
    acento: 'coral',
    svg: `<path d="M2.5 20 9 10l3.5 5 2.5-3.5 6.5 8.5z"/><path d="M15 11.5v-8" ${a}/><path d="M15 4h4.5l-1.2 1.8 1.2 1.7H15" ${a}/>`,
  },
  alternativas: {
    rotulo: 'Alternativas',
    acento: 'coral',
    svg: `<rect x="8.5" y="2.5" width="7" height="7" rx="1.5" ${a}/><rect x="3" y="13.5" width="7" height="7" rx="1.5"/><rect x="14" y="13.5" width="7" height="7" rx="1.5"/>`,
  },
  correta: {
    rotulo: 'Correta',
    acento: 'ciano',
    svg: `<circle cx="12" cy="12" r="9" ${a}/><path d="m8 12.3 2.7 2.7L16 9.5"/>`,
  },
  incorreta: {
    rotulo: 'Incorreta',
    acento: 'coral',
    svg: `<circle cx="12" cy="12" r="9" ${a}/><path d="m9 9 6 6M15 9l-6 6"/>`,
  },
  revisao: {
    rotulo: 'Revisão',
    acento: 'roxo',
    svg: `<path d="M11 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V10"/><path d="M7.5 8h9M7.5 11.5h5"/><path d="M21 16a4 4 0 0 0-7-2.3M13 18a4 4 0 0 0 7 2.3" ${a}/><path d="M14 11.5v2.3h2.3M20 22.5v-2.3h-2.3" ${a}/>`,
  },
  resolver: {
    rotulo: 'Resolver',
    acento: 'coral',
    svg: `<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="m10 14 .7-3 8-8a1.8 1.8 0 0 1 2.6 2.6l-8 8z" ${a}/>`,
  },
  tentar: {
    rotulo: 'Tentar novamente',
    acento: 'azul',
    svg: `<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5" ${a}/>`,
  },
  projeto: {
    rotulo: 'Projeto',
    acento: 'coral',
    svg: `${documentoComLinhas}<path d="M7.5 8h9M7.5 11.5h5"/><path d="m14.5 20.5.5-2.8 5.2-5.2a1.4 1.4 0 0 1 2 2L17 19.7z" ${a}/>`,
  },
  planejamento: {
    rotulo: 'Planejamento',
    acento: 'azul',
    svg: `<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5" ${a}/>`,
  },
  entrega: {
    rotulo: 'Entrega',
    acento: 'coral',
    svg: `<path d="M13 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v4"/><path d="M14 3v5h5"/><path d="M8.5 12h5M8.5 15.5h3"/><path d="M18 21v-6.5M15.5 17l2.5-2.5 2.5 2.5" ${a}/>`,
  },
  upload: {
    rotulo: 'Enviar arquivo',
    acento: 'amarelo',
    svg: `${nuvem}<path d="M12 20v-9M8.5 14.5 12 11l3.5 3.5" ${a}/>`,
  },
  download: {
    rotulo: 'Baixar',
    acento: 'coral',
    svg: `${nuvem}<path d="M12 11v9M8.5 16.5 12 20l3.5-3.5" ${a}/>`,
  },
  compartilhar: {
    rotulo: 'Compartilhar',
    acento: 'azul',
    svg: `<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" ${a}/>`,
  },
  enviar: {
    rotulo: 'Enviar',
    acento: 'coral',
    svg: `<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M21 3 10 13" ${a}/><path d="M2 15.5h3M3 19h3" ${a}/>`,
  },
  documento: {
    rotulo: 'Documento',
    acento: 'azul',
    svg: `<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 16h5" ${a}/>`,
  },
  editar: {
    rotulo: 'Editar',
    acento: 'coral',
    svg: `<path d="M4 20l1-4.3L15.8 4.9a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.3 19z"/><path d="m14 6.7 3.3 3.3" ${a}/>`,
  },
  excluir: {
    rotulo: 'Excluir',
    acento: 'coral',
    svg: `<path d="M4 6.5h16M9.5 6.5V4h5v2.5"/><path d="M6 6.5l1 14h10l1-14"/><path d="M10 10.5v6M14 10.5v6" ${a}/>`,
  },
  salvar: {
    rotulo: 'Salvar',
    acento: 'azul',
    svg: `<path d="M5.5 3.5h10.7l4.3 4.3v10.7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z"/><path d="M8 3.5V8h7V3.5"/><path d="M7.5 20.5v-6h9v6" ${a}/>`,
  },

  // --- Avaliação e resultados -----------------------------------------------------------
  avaliacao: {
    rotulo: 'Avaliação',
    acento: 'amarelo',
    svg: `<path d="M9 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15"/><rect x="9" y="3" width="6" height="3" rx="1"/><path d="m8.5 13.5 2.5 2.5 4.5-5" ${a}/>`,
  },
  progresso: {
    rotulo: 'Progresso',
    acento: 'azul',
    svg: `<circle cx="12" cy="12" r="8.5" opacity=".3"/><path d="M12 3.5a8.5 8.5 0 1 1-8.1 11" ${a}/>`,
  },
  resultado: {
    rotulo: 'Resultado',
    acento: 'coral',
    svg: `<path d="M5 20v-5M10 20v-8M15 20v-6M20 20V9"/><path d="m4 11 5-5 4 3 7-6M16 3h4v4" ${a}/>`,
  },
  nota: {
    rotulo: 'Nota',
    acento: 'coral',
    svg: `<circle cx="12" cy="12" r="9"/><path d="m6.8 15.5 2.6-7 2.6 7M7.8 13h3.2" ${a}/><path d="M15.5 9.5v4M13.5 11.5h4" ${a}/>`,
  },
  pontuacao: {
    rotulo: 'Pontuação',
    acento: 'amarelo',
    svg: `<path d="${estrela('grande')}"/><path d="${estrela('pequena')}" ${af}/>`,
  },
  ranking: {
    rotulo: 'Ranking',
    acento: 'amarelo',
    svg: `<path d="M2.5 20.5h19"/><rect x="9" y="7" width="6" height="13.5" rx="1" ${a}/><rect x="3" y="12" width="6" height="8.5" rx="1"/><rect x="15" y="14.5" width="6" height="6" rx="1"/>`,
  },
  trofeu: {
    rotulo: 'Troféu',
    acento: 'amarelo',
    svg: `<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3v1.5a3 3 0 0 0 3.3 3M16.5 6h3v1.5a3 3 0 0 1-3.3 3"/><path d="M12 13.5V17M9.5 17h5v3.5h-5z"/><path d="m12 5.6.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z" ${af}/>`,
  },
  medalha: {
    rotulo: 'Medalha',
    acento: 'amarelo',
    svg: `<path d="m7 3 3.5 7M17 3l-3.5 7"/><circle cx="12" cy="15.5" r="5.5" ${a}/><path d="m12 13 .9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" ${af}/>`,
  },
  certificado: {
    rotulo: 'Certificado',
    acento: 'coral',
    svg: `<path d="M13 16.5H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M7 8.5h10M7 12h5"/><circle cx="17" cy="14.5" r="2.8" ${a}/><path d="m15.5 17-.8 3.8 2.3-1.2 2.3 1.2-.8-3.8" ${a}/>`,
  },
  conquista: {
    rotulo: 'Conquista',
    acento: 'roxo',
    svg: `<path d="m12 2.5 2.2 1.6 2.7-.2.8 2.6 2.3 1.4-.8 2.6.8 2.6-2.3 1.4-.8 2.6-2.7-.2L12 18.5l-2.2-1.6-2.7.2-.8-2.6-2.3-1.4.8-2.6-.8-2.6 2.3-1.4.8-2.6 2.7.2z" ${a}/><path d="m8.5 17.5-1.5 4.5 2.5-1 1.5 2M15.5 17.5l1.5 4.5-2.5-1-1.5 2"/><path d="${estrela('pequena')}" transform="translate(0 -1.2)" ${af}/>`,
  },

  // --- Comunicação ------------------------------------------------------------------------
  mensagem: {
    rotulo: 'Mensagem',
    acento: 'coral',
    svg: `<rect x="3" y="5.5" width="16" height="13" rx="2"/><path d="m3.5 7 7.5 6 7.5-6"/><circle cx="19.5" cy="5.5" r="2.5" ${af}/>`,
  },
  chat: {
    rotulo: 'Chat',
    acento: 'roxo',
    svg: `<path d="M3.5 17.5 4.8 14A7 7 0 1 1 8 17.2z"/><path d="M15.5 19.8a5.5 5.5 0 0 0 5-1.3l1.5.7-.6-1.6a5.5 5.5 0 0 0-1.8-6.4" ${a}/>`,
  },
  aviso: {
    rotulo: 'Aviso',
    acento: 'coral',
    svg: `${triangulo}<path d="M12 9.5V14M12 17.3h.01" ${a}/>`,
  },
  noticia: {
    rotulo: 'Notícia',
    acento: 'amarelo',
    svg: `<path d="M3.5 10v4a1 1 0 0 0 1 1H7l8 4.5v-15L7 9H4.5a1 1 0 0 0-1 1z"/><path d="m7.5 15 1.5 5"/><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5M20.5 6.5l1-1M20.5 17.5l1 1" ${a}/>`,
  },
  email: {
    rotulo: 'E-mail',
    acento: 'azul',
    svg: `<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7" ${a}/>`,
  },
  comentarios: {
    rotulo: 'Comentários',
    acento: 'azul',
    svg: `<path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-8l-4.5 3.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z"/><path d="M7.5 11h9" ${a}/>`,
  },
  contato: {
    rotulo: 'Contato',
    acento: 'azul',
    svg: `<path d="M5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 7.7 7.7l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/><path d="M15 3.5a5.5 5.5 0 0 1 5.5 5.5" ${a}/>`,
  },
  videoconferencia: {
    rotulo: 'Videoconferência',
    acento: 'azul',
    svg: `<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="m15.5 10.5 6-3.5v10l-6-3.5" ${a}/>`,
  },
  compartilha: {
    rotulo: 'Encaminhar',
    acento: 'coral',
    svg: `<path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"/><path d="M12 13c0-4 2.5-6.5 7-6.5M16 3.5l3.5 3-3.5 3" ${a}/>`,
  },
  link: {
    rotulo: 'Link',
    acento: 'azul',
    svg: `<path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" ${a}/>`,
  },

  // --- Acompanhamento ---------------------------------------------------------------------------
  relatorio: {
    rotulo: 'Relatório',
    acento: 'ciano',
    svg: `<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8 16.5v-3M12 16.5V9M16 16.5v-5.5" ${a}/>`,
  },
  grafico: {
    rotulo: 'Gráfico',
    acento: 'amarelo',
    svg: `<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z" ${af}/>`,
  },
  estatisticas: {
    rotulo: 'Estatísticas',
    acento: 'coral',
    svg: `<path d="M3.5 20.5h17"/><path d="m4.5 15.5 5-5 3.5 3.5 6.5-7" ${a}/><path d="M15.5 7h4v4" ${a}/>`,
  },
  desempenho: {
    rotulo: 'Desempenho',
    acento: 'azul',
    svg: `<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="m12 17 4-5" ${a}/><circle cx="12" cy="17" r="1.3" ${af}/>`,
  },
  meta: {
    rotulo: 'Meta',
    acento: 'coral',
    svg: `<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="M11 13 20 4M16.5 4H20v3.5" ${a}/>`,
  },
  cronograma: {
    rotulo: 'Cronograma',
    acento: 'azul',
    svg: `${calendarioBase}<path d="M7.5 13.5h9M7.5 17h6" ${a}/>`,
  },
  checklist: {
    rotulo: 'Check-list',
    acento: 'coral',
    svg: `<path d="m3.5 6 1.5 1.5 2.5-3M3.5 12.5 5 14l2.5-3M3.5 19 5 20.5l2.5-3" ${a}/><path d="M11 6.5h9.5M11 13h9.5M11 19.5h9.5"/>`,
  },
  tarefa: {
    rotulo: 'Tarefa',
    acento: 'amarelo',
    svg: `<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5" ${a}/>`,
  },
  status: {
    rotulo: 'Status',
    acento: 'coral',
    svg: `<circle cx="5" cy="12" r="2.5" ${af}/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="2.5" ${af}/>`,
  },
  monitoramento: {
    rotulo: 'Monitoramento',
    acento: 'azul',
    svg: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3" ${a}/>`,
  },

  // --- Administração ------------------------------------------------------------------------------
  administracao: {
    rotulo: 'Administração',
    acento: 'azul',
    svg: `${engrenagem(8, 10, 7.8)}<circle cx="12" cy="10.5" r="2" ${a}/><path d="M8.8 15.8c.7-1.4 1.8-2.2 3.2-2.2s2.5.8 3.2 2.2" ${a}/>`,
  },
  gestao: {
    rotulo: 'Gestão',
    acento: 'azul',
    svg: `<rect x="9.5" y="3" width="5" height="4.5" rx="1"/><rect x="2.5" y="16.5" width="5" height="4.5" rx="1" ${a}/><rect x="9.5" y="16.5" width="5" height="4.5" rx="1" ${a}/><rect x="16.5" y="16.5" width="5" height="4.5" rx="1" ${a}/><path d="M12 7.5v9M5 16.5V12h14v4.5"/>`,
  },
  usuarios: {
    rotulo: 'Usuários',
    acento: 'azul',
    svg: `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-4 3.2-6.5 6.5-6.5s5.9 2.5 6.5 6.5"/><circle cx="17" cy="7" r="2.8" ${a}/><path d="M17.5 12.5c2.3.3 3.6 2.2 4 4.8" ${a}/>`,
  },
  permissoes: {
    rotulo: 'Permissões',
    acento: 'amarelo',
    svg: `<circle cx="8" cy="15.5" r="4.5" ${a}/><path d="m11.2 12.3 8.8-8.8M16.5 7 19 9.5M14.5 9l2 2"/>`,
  },
  funcoes: {
    rotulo: 'Funções',
    acento: 'azul',
    svg: `<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8" cy="10.5" r="2" ${a}/><path d="M5 15.5c.5-1.5 1.6-2.3 3-2.3s2.5.8 3 2.3" ${a}/><path d="M14 10h4.5M14 13.5h4.5"/>`,
  },
  ferramentas: {
    rotulo: 'Ferramentas',
    acento: 'azul',
    svg: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>`,
  },
  backup: {
    rotulo: 'Backup',
    acento: 'azul',
    svg: `<ellipse cx="11" cy="5.5" rx="7" ry="2.5"/><path d="M4 5.5v12c0 1.4 3.1 2.5 7 2.5M18 5.5V11"/><path d="M4 11.5c0 1.4 3.1 2.5 7 2.5"/><path d="M21 15.5a3.5 3.5 0 1 1-1-2.5M21 11.5V14h-2.5" ${a}/>`,
  },
  importar: {
    rotulo: 'Importar',
    acento: 'coral',
    svg: `${bandeja}<path d="M12 3.5v11M8 10.5l4 4 4-4" ${a}/>`,
  },
  exportar: {
    rotulo: 'Exportar',
    acento: 'azul',
    svg: `${bandeja}<path d="M12 14.5v-11M8 7.5l4-4 4 4" ${a}/>`,
  },
  sincronizar: { rotulo: 'Sincronizar', acento: 'azul', svg: setasCirculares },

  // --- Pranchas "Navegação e conta", "Maratona e aprendizagem", "Avaliação e administração" ---
  voltar: {
    rotulo: 'Voltar',
    acento: 'azul',
    svg: `<circle cx="12" cy="12" r="9"/><path d="m13.5 8-4 4 4 4" ${a}/>`,
  },
  avancar: {
    rotulo: 'Avançar',
    acento: 'ciano',
    svg: `<circle cx="12" cy="12" r="9"/><path d="m10.5 8 4 4-4 4" ${a}/>`,
  },
  fecharCirculo: {
    rotulo: 'Fechar',
    acento: 'coral',
    svg: `<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6" ${a}/>`,
  },
  adicionar: {
    rotulo: 'Adicionar',
    acento: 'ciano',
    svg: `<circle cx="12" cy="12" r="9" ${a}/><path d="M12 7.5v9M7.5 12h9" ${a}/>`,
  },
  correcao: {
    rotulo: 'Correção',
    acento: 'coral',
    svg: `<path d="M13 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V11"/><path d="M7.5 8h9M7.5 11.5h6M7.5 15h3"/><path d="m14 17.5 2.5 2.5 5-6" ${a}/>`,
  },
  advertencia: {
    rotulo: 'Advertência',
    acento: 'coral',
    svg: `<path d="M10.3 5.2 3.6 17.5a2 2 0 0 0 1.7 3h13.4a2 2 0 0 0 1.7-3L13.7 5.2a2 2 0 0 0-3.4 0z" ${a}/><path d="M12 10v4M12 17.3h.01"/><path d="M4 7.5 2.5 6M20 7.5 21.5 6M1 12h1.5M21.5 12H23" ${a}/>`,
  },
  participacao: {
    rotulo: 'Participação',
    acento: 'amarelo',
    svg: `${pessoaCentral}${pessoasLaterais}<path d="M12 1.5v1.2M7.8 2.5l.8 1M16.2 2.5l-.8 1" ${a}/>`,
  },
  relogio: {
    rotulo: 'Relógio',
    acento: 'coral',
    svg: `<circle cx="14" cy="12" r="8"/><path d="M14 8v4.5l3 1.8" ${a}/><path d="M1.5 9h3M1 12.5h3.5M2 16h2.5" ${a}/>`,
  },
  apresentacao: {
    rotulo: 'Apresentação',
    acento: 'amarelo',
    svg: `<circle cx="6.5" cy="10" r="2.8"/><path d="M1.5 20c.5-3 2.4-5 5-5s4.5 2 5 5"/><path d="M9 3.5h12.5V14H12"/><path d="M15.5 14v3.5l-2 2M15.5 17.5l2 2"/><path d="M14.5 11V9.5M17 11V7.5M19.5 11V6" ${a}/>`,
  },
  computador: {
    rotulo: 'Computador',
    acento: 'azul',
    svg: `<rect x="4" y="4.5" width="16" height="11" rx="1.5"/><path d="M2 18.5h20l-1.5 1.5h-17z"/><path d="M6.5 13h11" ${a}/>`,
  },
  laboratorio: {
    rotulo: 'Laboratório',
    acento: 'ciano',
    svg: `<path d="M9.5 3h5M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15.5h10" ${a}/><circle cx="11" cy="12.3" r=".8" ${af}/><circle cx="13.4" cy="11" r=".6" ${af}/>`,
  },
  colaboracao: {
    rotulo: 'Colaboração',
    acento: 'amarelo',
    svg: `<circle cx="12" cy="5.5" r="2"/><path d="M9 10c.6-1.2 1.7-2 3-2s2.4.8 3 2"/><circle cx="6" cy="14.5" r="2" ${a}/><path d="M3 19c.6-1.2 1.7-2 3-2s2.4.8 3 2" ${a}/><circle cx="18" cy="14.5" r="2" ${a}/><path d="M15 19c.6-1.2 1.7-2 3-2s2.4.8 3 2" ${a}/><path d="M5 9.5a8 8 0 0 1 2.5-3.5M19 9.5a8 8 0 0 0-2.5-3.5M10 21.5h4"/>`,
  },
  ideia: {
    rotulo: 'Ideia',
    acento: 'amarelo',
    svg: `<path d="M9 17.5h6M10 21h4"/><path d="M8.6 14.5A6 6 0 1 1 15.4 14.5c-.8.7-1 1.6-1 2.5h-4.8c0-.9-.2-1.8-1-2.5z" ${a}/><path d="M12 .8v1.2M4 4.3l.9.9M20 4.3l-.9.9M1.5 10.5H3M21 10.5h1.5" ${a}/>`,
  },

  // --- Utilitários de interface (não constam da prancha; mesmo estilo) ---------------------------
  fechar: { rotulo: 'Fechar', acento: 'coral', svg: '<path d="M6 6l12 12M18 6 6 18"/>' },
  info: {
    rotulo: 'Informação',
    acento: 'azul',
    svg: `<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01" ${a}/>`,
  },
  offline: {
    rotulo: 'Sem conexão',
    acento: 'coral',
    svg: `<path d="M5 12.5a10 10 0 0 1 4-2.3M2 9a14.5 14.5 0 0 1 4.5-2.9M15 10.2a10 10 0 0 1 4 2.3M17.5 6.1A14.5 14.5 0 0 1 22 9M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/><path d="m3 3 18 18" ${a}/>`,
  },
  ocorrencia: {
    rotulo: 'Ocorrência',
    acento: 'coral',
    svg: `<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z"/><path d="M12 8v5M12 16.3h.01" ${a}/>`,
  },
} satisfies Record<string, DefinicaoIcone>;

export type IdIcone = keyof typeof ICONES;

/** SVG completo e independente (cores da marca resolvidas), para uso fora do React. */
export function svgIndependente(id: IdIcone, tamanho = 24): string {
  const { rotulo, acento, svg } = ICONES[id];
  const corpo = svg
    .replaceAll('var(--ic-a)', CORES_DE_ACENTO[acento])
    .replaceAll('currentColor', '#062457');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="#062457" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
    `role="img" aria-label="${rotulo}"><title>${rotulo}</title>${corpo}</svg>\n`
  );
}
