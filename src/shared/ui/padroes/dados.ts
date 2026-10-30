/**
 * Padrões gráficos da Maratona SAEP, derivados das faixas diagonais da marca
 * (prancha "08 Padrões gráficos" e "09 Acabamentos"). Recriação vetorial para a interface;
 * PENDENTE validação da unidade. Sem dependência de React: usado pelo componente
 * `PadraoGrafico` e pelo gerador de arquivos (`npm run padroes`).
 */

/** Paleta das pranchas de identidade (02 Paleta de cores). */
export const PALETA_DA_PRANCHA = {
  azulMarinho: '#0B2D6B',
  azul: '#1676FF',
  ciano: '#22D3EE',
  amarelo: '#FFC02E',
  coral: '#FF5866',
  roxo: '#8B6DFF',
} as const;

const { azulMarinho: N, azul: B, ciano: C, amarelo: Y, coral: R, roxo: P } = PALETA_DA_PRANCHA;

/** Faixa inclinada "/": topo deslocado `s` para a direita. */
function faixa(x: number, y: number, w: number, h: number, s: number, cor: string, extra = '') {
  return `<polygon points="${x + s},${y} ${x + s + w},${y} ${x + w},${y + h} ${x},${y + h}" fill="${cor}"${extra}/>`;
}

/** Banda entre as retas x + y = k1 e x + y = k2 (direção "/"), recortada pelo clipPath. */
function barra(k1: number, k2: number, cor: string, extra = '') {
  return `<polygon points="${k1},0 ${k2},0 ${k2 - 600},600 ${k1 - 600},600" fill="${cor}"${extra}/>`;
}

/** Banda entre as retas x - y = k1 e x - y = k2 (direção "\"), recortada pelo clipPath. */
function contrabarra(k1: number, k2: number, cor: string, extra = '') {
  return `<polygon points="${k1},0 ${k2},0 ${k2 + 600},600 ${k1 + 600},600" fill="${cor}"${extra}/>`;
}

function recortado(prefixo: string, w: number, h: number, conteudo: string) {
  const id = `${prefixo}-recorte`;
  return `<defs><clipPath id="${id}"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#${id})">${conteudo}</g>`;
}

export interface DefinicaoPadrao {
  rotulo: string;
  descricao: string;
  viewBox: string;
  /** Como o padrão se ajusta à área: preencher cortando, ou caber inteiro. */
  ajuste: string;
  gerar: (prefixo: string) => string;
}

export const PADROES = {
  faixas: {
    rotulo: 'Elementos base',
    descricao: 'As faixas diagonais da marca nas seis cores principais.',
    viewBox: '0 0 640 100',
    ajuste: 'xMidYMid meet',
    gerar: () =>
      [N, B, C, Y, R, P].map((cor, i) => faixa(10 + i * 104, 0, 80, 100, 50, cor)).join(''),
  },
  volumes: {
    rotulo: 'Faixas em diferentes volumes',
    descricao: 'Variação de largura para ritmo e hierarquia.',
    viewBox: '0 0 640 100',
    ajuste: 'xMidYMid meet',
    gerar: () =>
      [B, B, C, Y, R, P].map((cor, i) => faixa(8 + i * 106, 22, 54 + i * 6, 56, 34, cor)).join(''),
  },
  recortes: {
    rotulo: 'Recortes e terminações',
    descricao: 'Terminações retas, chanfradas e em seta.',
    viewBox: '0 0 640 100',
    ajuste: 'xMidYMid meet',
    gerar: () =>
      [
        faixa(10, 15, 60, 70, 40, B),
        `<polygon points="150,15 205,15 205,45 175,85 120,85" fill="${B}"/>`,
        `<polygon points="240,15 295,15 312,50 295,85 240,85 257,50" fill="${C}"/>`,
        faixa(335, 15, 60, 70, 40, Y),
        `<polygon points="450,15 515,15 495,85 430,85 445,50" fill="${R}"/>`,
        `<polygon points="540,15 600,15 628,50 600,85 540,85" fill="${P}"/>`,
      ].join(''),
  },
  diagonal: {
    rotulo: 'Padrão diagonal',
    descricao: 'Faixas cruzadas em módulo quadrado.',
    viewBox: '0 0 200 200',
    ajuste: 'xMidYMid slice',
    gerar: (p) =>
      recortado(
        p,
        200,
        200,
        [
          contrabarra(-150, -100, N),
          barra(30, 85, B),
          contrabarra(40, 80, R),
          barra(150, 195, Y),
          barra(270, 320, P),
          contrabarra(-40, -10, C, ' opacity="0.95"'),
        ].join(''),
      ),
  },
  setas: {
    rotulo: 'Padrão de setas',
    descricao: 'Sequência de setas indicando avanço.',
    viewBox: '0 0 300 200',
    ajuste: 'xMidYMid meet',
    gerar: () =>
      [B, C, Y, R]
        .map((cor, i) => {
          const x = i * 62;
          return `<polygon points="${x},0 ${x + 45},0 ${x + 115},100 ${x + 45},200 ${x},200 ${x + 70},100" fill="${cor}"/>`;
        })
        .join(''),
  },
  entrelacado: {
    rotulo: 'Padrão entrelaçado',
    descricao: 'Faixas sobrepostas em transparência, formando cruzamentos.',
    viewBox: '0 0 200 200',
    ajuste: 'xMidYMid slice',
    gerar: (p) =>
      recortado(
        p,
        200,
        200,
        [
          barra(-10, 40, B, ' opacity="0.9"'),
          contrabarra(-90, -40, Y, ' opacity="0.9"'),
          barra(110, 160, P, ' opacity="0.85"'),
          contrabarra(30, 80, R, ' opacity="0.85"'),
          barra(230, 280, C, ' opacity="0.9"'),
          contrabarra(140, 190, N, ' opacity="0.9"'),
        ].join(''),
      ),
  },
  canto: {
    rotulo: 'Composição de canto',
    descricao: 'Recorte diagonal para cantos de cabeçalhos, banners e cartões.',
    viewBox: '0 0 400 300',
    ajuste: 'xMaxYMin meet',
    gerar: (p) =>
      recortado(
        p,
        400,
        300,
        [
          contrabarra(160, 200, C),
          contrabarra(200, 265, B),
          contrabarra(265, 300, Y),
          contrabarra(300, 345, P),
          contrabarra(345, 420, N),
          barra(560, 610, R, ' opacity="0.95"'),
          barra(640, 680, Y, ' opacity="0.9"'),
        ].join(''),
      ),
  },
  textura: {
    rotulo: 'Textura institucional',
    descricao: 'Repetição das faixas em baixa opacidade para fundos.',
    viewBox: '0 0 480 240',
    ajuste: 'xMidYMid slice',
    gerar: (p) => {
      const id = `${p}-textura`;
      const modulo = [
        faixa(4, 10, 14, 26, 10, B),
        faixa(30, 10, 14, 26, 10, C),
        faixa(56, 44, 14, 26, 10, Y),
        faixa(82, 44, 14, 26, 10, R),
        faixa(108, 10, 14, 26, 10, P),
      ].join('');
      return `<defs><pattern id="${id}" width="136" height="80" patternUnits="userSpaceOnUse">${modulo}</pattern></defs><rect width="480" height="240" fill="url(#${id})" opacity="0.35"/>`;
    },
  },
} satisfies Record<string, DefinicaoPadrao>;

export type IdPadrao = keyof typeof PADROES;

/** SVG independente, para arquivos e materiais fora da aplicação. */
export function svgDoPadrao(id: IdPadrao, prefixo: string): string {
  const d = PADROES[id];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.viewBox}" preserveAspectRatio="${d.ajuste}" ` +
    `role="img" aria-label="${d.rotulo}"><title>${d.rotulo}</title>${d.gerar(prefixo)}</svg>\n`
  );
}

/** Gradiente principal (45°) e gradiente suave para fundos — prancha 09 Acabamentos. */
export const GRADIENTES = {
  marca: `linear-gradient(45deg, ${B}, ${C} 30%, ${Y} 55%, ${R} 78%, ${P})`,
  suave: `linear-gradient(45deg, #EAF2FF, #FFFFFF 60%)`,
  escuro: `linear-gradient(135deg, ${N}, #062457 55%, #04193F)`,
} as const;
