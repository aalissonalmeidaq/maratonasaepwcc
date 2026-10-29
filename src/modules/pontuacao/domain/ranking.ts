import { arredondar } from './calculo';
import type { PontuacaoDoEncontro, TotaisDaDupla } from './tipos';

const CASAS = 2;

export function acumularEncontros(pontuacoes: PontuacaoDoEncontro[]): TotaisDaDupla {
  const soma = (f: (p: PontuacaoDoEncontro) => number) =>
    arredondar(
      pontuacoes.reduce((t, p) => t + f(p), 0),
      CASAS,
    );
  return {
    total: soma((p) => p.total),
    entrega: soma((p) => p.entrega),
    avaliacaoObjetiva: soma((p) => p.avaliacaoObjetiva),
    presenca: soma((p) => p.presenca),
    pendente: pontuacoes.some((p) => p.pendencias.length > 0),
  };
}

export interface DuplaParaRanking {
  duplaId: string;
  nome: string;
  totais: TotaisDaDupla;
}

/** Somente dados agregados da dupla: nenhuma nota individual entra no ranking (RF16). */
export interface PosicaoNoRanking {
  duplaId: string;
  nome: string;
  posicao: number;
  compartilhada: boolean;
  totais: TotaisDaDupla;
}

/** Ordem de desempate do piloto: total → entrega prática → questões/prova → presença. */
const CRITERIOS: (keyof Omit<TotaisDaDupla, 'pendente'>)[] = [
  'total',
  'entrega',
  'avaliacaoObjetiva',
  'presenca',
];

function comparar(a: TotaisDaDupla, b: TotaisDaDupla): number {
  for (const c of CRITERIOS) {
    if (a[c] !== b[c]) return b[c] - a[c];
  }
  return 0;
}

export function classificar(duplas: DuplaParaRanking[]): PosicaoNoRanking[] {
  const ordenadas = [...duplas].sort(
    (a, b) => comparar(a.totais, b.totais) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
  return ordenadas.map((d, i) => {
    let primeiro = i;
    while (primeiro > 0 && comparar(ordenadas[primeiro - 1]!.totais, d.totais) === 0) primeiro--;
    const anterior = ordenadas[i - 1];
    const proxima = ordenadas[i + 1];
    const compartilhada =
      (anterior !== undefined && comparar(anterior.totais, d.totais) === 0) ||
      (proxima !== undefined && comparar(proxima.totais, d.totais) === 0);
    return {
      duplaId: d.duplaId,
      nome: d.nome,
      posicao: primeiro + 1,
      compartilhada,
      totais: d.totais,
    };
  });
}
