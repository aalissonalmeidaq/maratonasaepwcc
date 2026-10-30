/** Busca e paginação das listagens, feitas no navegador sobre dados já autorizados (spec 005). */

/** Minúsculas, sem acentos e com espaços simples, para comparar textos digitados. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mantém os itens cujo texto contém todas as palavras do termo, em qualquer ordem. */
export function filtrarPorBusca<T>(itens: T[], termo: string, textoDe: (item: T) => string): T[] {
  const palavras = normalizarBusca(termo).split(' ').filter(Boolean);
  if (palavras.length === 0) return itens;
  return itens.filter((item) => {
    const texto = normalizarBusca(textoDe(item));
    return palavras.every((p) => texto.includes(p));
  });
}

export interface Pagina<T> {
  itens: T[];
  /** Página efetivamente exibida (1 em diante), já ajustada ao intervalo existente. */
  pagina: number;
  totalPaginas: number;
  total: number;
  /** Posição (1 em diante) do primeiro e do último item exibidos; 0 quando não há itens. */
  inicio: number;
  fim: number;
}

export function paginar<T>(itens: T[], pagina: number, tamanho: number): Pagina<T> {
  if (!Number.isInteger(tamanho) || tamanho < 1) {
    throw new Error(`Tamanho de página inválido: ${tamanho}`);
  }
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const atual = Number.isFinite(pagina)
    ? Math.min(Math.max(1, Math.trunc(pagina)), totalPaginas)
    : 1;
  const desde = (atual - 1) * tamanho;
  const recorte = itens.slice(desde, desde + tamanho);
  return {
    itens: recorte,
    pagina: atual,
    totalPaginas,
    total,
    inicio: total === 0 ? 0 : desde + 1,
    fim: desde + recorte.length,
  };
}
